use std::{
    collections::BTreeMap,
    io::Read,
    path::{Component, Path},
    sync::Arc,
};

use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use flate2::read::GzDecoder;
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::{
    api::{base_url, ejson, internal, ApiErr, AppState, MAX_BODY},
    auth::authorize_publish,
    manifest,
    store::unix_now,
};

fn sha256_hex(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    h.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

fn validate_archive_path(p: &Path) -> Result<(), ApiErr> {
    if p.is_absolute() {
        return Err(ejson(StatusCode::BAD_REQUEST, "unsafe path in archive"));
    }
    for c in p.components() {
        match c {
            Component::ParentDir | Component::Prefix(_) => {
                return Err(ejson(StatusCode::BAD_REQUEST, "unsafe path in archive"));
            }
            _ => {}
        }
    }
    Ok(())
}

/// POST /api/publish：Bearer token 鉴权 + tar.gz 上传（zip-slip 防御 + manifest 校验 + 不可变落库）。
pub async fn publish_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, ApiErr> {
    if body.len() > MAX_BODY {
        return Err(ejson(StatusCode::PAYLOAD_TOO_LARGE, "payload too large"));
    }

    // b. 解压 tar.gz，收集 manifest 与 dist 文件（路径安全校验）
    let mut manifest_raw: Option<Vec<u8>> = None;
    let mut files: BTreeMap<String, Vec<u8>> = BTreeMap::new();

    let gz = GzDecoder::new(body.as_ref());
    let mut ar = tar::Archive::new(gz);
    let entries = ar
        .entries()
        .map_err(|_| ejson(StatusCode::BAD_REQUEST, "invalid archive"))?;
    for entry in entries {
        let mut e =
            entry.map_err(|_| ejson(StatusCode::BAD_REQUEST, "invalid archive entry"))?;
        let ty = e.header().entry_type();
        if !ty.is_file() && !ty.is_dir() {
            return Err(ejson(StatusCode::BAD_REQUEST, "unsupported entry type in archive"));
        }
        if ty.is_dir() {
            continue;
        }
        let p = e
            .path()
            .map_err(|_| ejson(StatusCode::BAD_REQUEST, "invalid archive path"))?
            .into_owned();
        validate_archive_path(&p)?;
        let norm = p.to_string_lossy().replace('\\', "/");
        let mut bytes = Vec::new();
        e.read_to_end(&mut bytes).map_err(internal)?;
        if norm == "manifest.json" {
            manifest_raw = Some(bytes);
        } else {
            files.insert(norm, bytes);
        }
    }

    // c/d/e. manifest 解析与校验（name/version/semver/type/entry 完整性）
    let mraw = manifest_raw
        .ok_or_else(|| ejson(StatusCode::BAD_REQUEST, "missing manifest.json in archive"))?;
    let m = manifest::parse_and_validate(&mraw)
        .map_err(|e| ejson(StatusCode::BAD_REQUEST, e))?;
    manifest::check_entry_files(&m, &files)
        .map_err(|e| ejson(StatusCode::BAD_REQUEST, e))?;

    let (scope, name) = m.name.split_once('/').expect("validated by parse_and_validate");
    // a. 鉴权：root 令牌（env）或数据库令牌，且需具备该 scope 的 publish 权限
    let publisher = authorize_publish(&state, &headers, scope).await?;
    tracing::info!("publish authorized by {publisher} for {scope}");
    let store = state.store.clone();

    // f. 落库（版本不可变；latest = 最后成功发布者）
    let now = unix_now();
    let pid = store.ensure_package(scope, name, now).await.map_err(internal)?;
    if store.version_exists(pid, &m.version).await.map_err(internal)? {
        return Err(ejson(StatusCode::CONFLICT, "version already exists"));
    }
    let checksum = sha256_hex(&body);
    let manifest_text = String::from_utf8(mraw)
        .map_err(|_| ejson(StatusCode::BAD_REQUEST, "manifest.json is not valid utf8"))?;
    store
        .insert_version(pid, &m.version, &manifest_text, &checksum, now)
        .await
        .map_err(internal)?;
    for (path, data) in &files {
        let sha = store.save_blob(data).map_err(internal)?;
        store
            .insert_version_file(pid, &m.version, path, &sha, data.len() as i64)
            .await
            .map_err(internal)?;
    }
    store.set_latest(pid, &m.version).await.map_err(internal)?;

    let base = base_url(&headers);
    let manifest_url = format!("{base}/v/{scope}/{name}@{}/manifest.json", m.version);
    Ok((
        StatusCode::CREATED,
        Json(json!({
            "name": m.name,
            "version": m.version,
            "manifestUrl": manifest_url,
        })),
    ))
}

#[cfg(test)]
mod tests {
    use axum::{
        body::Body,
        http::{header::AUTHORIZATION, Request, StatusCode},
        Router,
    };
    use flate2::{write::GzEncoder, Compression};
    use serde_json::Value;
    use tower::ServiceExt;

    use crate::{
        api,
        store::Store,
    };

    const TOKEN: &str = "test-token";

    async fn make_app() -> (Router, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::init(dir.path()).await.unwrap();
        (api::app(store, TOKEN.into()), dir)
    }

    const VALID_MANIFEST: &str = r#"{
      "name": "@dp_ui/button",
      "version": "0.1.0",
      "type": "vue-component",
      "description": "样例按钮",
      "entry": { "module": "dist/button.mjs", "css": ["dist/button.style.css"] },
      "cssStrategy": "vanilla",
      "peer": { "vue": "^3.5.0" }
    }"#;

    fn gzip_tar(tar_bytes: &[u8]) -> Vec<u8> {
        let mut enc = GzEncoder::new(Vec::new(), Compression::default());
        std::io::Write::write_all(&mut enc, tar_bytes).unwrap();
        enc.finish().unwrap()
    }

    /// 用 tar crate 构造常规归档（路径校验宽松时可用）。
    fn make_tar(files: &[(&str, &[u8])]) -> Vec<u8> {
        let mut enc = GzEncoder::new(Vec::new(), Compression::default());
        {
            let mut b = tar::Builder::new(&mut enc);
            for (path, data) in files {
                let mut h = tar::Header::new_gnu();
                h.set_size(data.len() as u64);
                h.set_mode(0o644);
                h.set_cksum();
                b.append_data(&mut h, path, *data).unwrap();
            }
            b.finish().unwrap();
        }
        enc.finish().unwrap()
    }

    /// 手工构造单文件 ustar 归档（绕过 tar crate 对 `..` 路径的写入限制，用于 zip-slip 测试）。
    fn make_raw_ustar_gz(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut tar = Vec::new();
        for (name, data) in entries {
            let mut h = [0u8; 512];
            let nb = name.as_bytes();
            h[..nb.len()].copy_from_slice(nb);
            h[100..108].copy_from_slice(b"0000644\0");
            let size_s = format!("{:011o}\0", data.len());
            h[124..136].copy_from_slice(size_s.as_bytes());
            h[136..148].copy_from_slice(b"00000000000\0");
            h[156] = b'0';
            h[257..263].copy_from_slice(b"ustar\0");
            h[263..265].copy_from_slice(b"00");
            let sum: u32 = h.iter().map(|&b| b as u32).sum();
            let cs = format!("{sum:06o}\0 ");
            h[148..156].copy_from_slice(cs.as_bytes());
            tar.extend_from_slice(&h);
            tar.extend_from_slice(data);
            let pad = (512 - data.len() % 512) % 512;
            tar.extend(std::iter::repeat(0u8).take(pad));
        }
        tar.extend_from_slice(&[0u8; 1024]);
        gzip_tar(&tar)
    }

    fn valid_body() -> Vec<u8> {
        make_tar(&[
            ("manifest.json", VALID_MANIFEST.as_bytes()),
            ("dist/button.mjs", b"import { x } from \"vue\";\nexport default {}"),
            ("dist/button.style.css", b".dpui-btn { color: red }"),
        ])
    }

    async fn publish(app: &Router, body: Vec<u8>, token: Option<&str>) -> StatusCode {
        let mut req = Request::post("/api/publish")
            .header("content-type", "application/octet-stream")
            .body(Body::from(body))
            .unwrap();
        if let Some(t) = token {
            req.headers_mut().insert(AUTHORIZATION, format!("Bearer {t}").parse().unwrap());
        }
        app.clone().oneshot(req).await.unwrap().status()
    }

    async fn get_json(app: &Router, uri: &str) -> (StatusCode, Value) {
        let resp = app
            .clone()
            .oneshot(Request::get(uri).body(Body::empty()).unwrap())
            .await
            .unwrap();
        let status = resp.status();
        let bytes = axum::body::to_bytes(resp.into_body(), 4 * 1024 * 1024).await.unwrap();
        let v = if bytes.is_empty() {
            Value::Null
        } else {
            serde_json::from_slice(&bytes).unwrap_or(Value::Null)
        };
        (status, v)
    }

    async fn get_raw(app: &Router, uri: &str) -> (StatusCode, Vec<u8>) {
        let resp = app
            .clone()
            .oneshot(Request::get(uri).body(Body::empty()).unwrap())
            .await
            .unwrap();
        let status = resp.status();
        let bytes = axum::body::to_bytes(resp.into_body(), 4 * 1024 * 1024).await.unwrap();
        (status, bytes.to_vec())
    }

    #[tokio::test]
    async fn publish_resolve_dist_roundtrip() {
        let (app, _dir) = make_app().await;
        assert_eq!(publish(&app, valid_body(), Some(TOKEN)).await, StatusCode::CREATED);

        // resolve
        let (st, v) = get_json(&app, "/resolve/@dp_ui/button").await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(v["version"], "0.1.0");
        let module_url = v["moduleUrl"].as_str().unwrap().to_string();
        assert!(module_url.contains("/v/@dp_ui/button@0.1.0/dist/button.mjs"), "{module_url}");
        let css = v["cssUrls"].as_array().unwrap();
        assert_eq!(css.len(), 1);

        // dist 文件内容（axum 只接受 origin-form，剥掉 origin）
        let rel = module_url
            .strip_prefix("http://127.0.0.1:8787")
            .expect("module url 默认 host")
            .to_string();
        let (st2, bytes) = get_raw(&app, &rel).await;
        assert_eq!(st2, StatusCode::OK);
        assert!(String::from_utf8_lossy(&bytes).contains("\"vue\""));

        // manifest
        let (st3, m) = get_json(&app, "/v/@dp_ui/button@0.1.0/manifest.json").await;
        assert_eq!(st3, StatusCode::OK);
        assert_eq!(m["name"], "@dp_ui/button");

        // index
        let (st4, idx) = get_json(&app, "/v/index.json").await;
        assert_eq!(st4, StatusCode::OK);
        assert!(idx["packages"].as_array().unwrap().iter().any(|p| p["name"] == "button"));

        // detail
        let (st5, d) = get_json(&app, "/v/@dp_ui/button").await;
        assert_eq!(st5, StatusCode::OK);
        assert_eq!(d["versions"].as_array().unwrap().len(), 1);
    }

    #[tokio::test]
    async fn source_file_roundtrip() {
        let (app, _dir) = make_app().await;
        let manifest = VALID_MANIFEST.replace("\"version\": \"0.1.0\"", "\"version\": \"0.1.1\"");
        let manifest = manifest.replace(
            "\"peer\": { \"vue\": \"^3.5.0\" }",
            "\"peer\": { \"vue\": \"^3.5.0\" },\n      \"source\": { \"files\": [\"source/src/ui/button/Button.vue\"] }",
        );
        let body = make_tar(&[
            ("manifest.json", manifest.as_bytes()),
            ("dist/button.mjs", b"export default {}"),
            ("dist/button.style.css", b".dpui-btn { color: red }"),
            ("source/src/ui/button/Button.vue", b"<template><button class=\"dpui-btn\">x</button></template>"),
        ]);
        assert_eq!(publish(&app, body, Some(TOKEN)).await, StatusCode::CREATED);

        // source 文件可分发且内容一致
        let (st, bytes) = get_raw(&app, "/v/@dp_ui/button@0.1.1/source/src/ui/button/Button.vue").await;
        assert_eq!(st, StatusCode::OK);
        assert!(String::from_utf8_lossy(&bytes).contains("dpui-btn"));

        // 缺失 source 文件 → 404
        let (st2, _) = get_raw(&app, "/v/@dp_ui/button@0.1.1/source/src/ui/button/missing.ts").await;
        assert_eq!(st2, StatusCode::NOT_FOUND);

        // 非 source 段 / 无子路径 → 404
        let (st3, _) = get_raw(&app, "/v/@dp_ui/button@0.1.1/sourc/x.ts").await;
        assert_eq!(st3, StatusCode::NOT_FOUND);

        // manifest 携带 source（detail 回显完整 manifest）
        let (st4, d) = get_json(&app, "/v/@dp_ui/button@0.1.1/manifest.json").await;
        assert_eq!(st4, StatusCode::OK);
        assert_eq!(d["source"]["files"][0], "source/src/ui/button/Button.vue");
    }

    #[tokio::test]
    async fn types_file_roundtrip() {
        let (app, _dir) = make_app().await;
        let manifest = VALID_MANIFEST.replace("\"version\": \"0.1.0\"", "\"version\": \"0.1.2\"").replace(
            "\"entry\": { \"module\": \"dist/button.mjs\", \"css\": [\"dist/button.style.css\"] }",
            "\"entry\": { \"module\": \"dist/button.mjs\", \"css\": [\"dist/button.style.css\"], \
             \"types\": \"types/button.d.ts\", \
             \"typesFiles\": [\"types/button.d.ts\", \"types/Button.vue.d.ts\"] }",
        );
        let body = make_tar(&[
            ("manifest.json", manifest.as_bytes()),
            ("dist/button.mjs", b"import { x } from \"vue\";\nexport default {}"),
            ("dist/button.style.css", b".dpui-btn { color: red }"),
            ("types/button.d.ts", b"export { default as Button } from './Button.vue'"),
            ("types/Button.vue.d.ts", b"declare const c: unknown\nexport default c"),
        ]);
        assert_eq!(publish(&app, body, Some(TOKEN)).await, StatusCode::CREATED);

        // resolve 透传 entry.types/typesFiles（消费端据此落盘精确类型）
        let (st, v) = get_json(&app, "/resolve/@dp_ui/button").await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(v["entry"]["types"], "types/button.d.ts");
        assert_eq!(v["entry"]["typesFiles"].as_array().unwrap().len(), 2);

        // 声明文件可分发（相对引用其兄弟声明，故两者都必须可取）；与 dist/ 同级
        let (st2, bytes) = get_raw(&app, "/v/@dp_ui/button@0.1.2/types/button.d.ts").await;
        assert_eq!(st2, StatusCode::OK);
        assert!(String::from_utf8_lossy(&bytes).contains("./Button.vue"));
        let (st3, _) = get_raw(&app, "/v/@dp_ui/button@0.1.2/types/Nope.d.ts").await;
        assert_eq!(st3, StatusCode::NOT_FOUND);

        // manifest 声明了但归档里没有的声明文件 → 400（不能发布半截类型）
        let bad = VALID_MANIFEST.replace(
            "\"entry\": { \"module\": \"dist/button.mjs\", \"css\": [\"dist/button.style.css\"] }",
            "\"entry\": { \"module\": \"dist/button.mjs\", \"css\": [\"dist/button.style.css\"], \
             \"types\": \"types/missing.d.ts\", \"typesFiles\": [\"types/missing.d.ts\"] }",
        );
        let bad_body = make_tar(&[
            ("manifest.json", bad.as_bytes()),
            ("dist/button.mjs", b"export default {}"),
            ("dist/button.style.css", b"x{}"),
        ]);
        assert_eq!(publish(&app, bad_body, Some(TOKEN)).await, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn files_json_roundtrip() {
        let (app, _dir) = make_app().await;
        let manifest = VALID_MANIFEST.replace("\"version\": \"0.1.0\"", "\"version\": \"0.1.3\"").replace(
            "\"entry\": { \"module\": \"dist/button.mjs\", \"css\": [\"dist/button.style.css\"] }",
            "\"entry\": { \"module\": \"dist/button.mjs\", \"css\": [], \"types\": \"types/button.d.ts\" }",
        );
        let body = make_tar(&[
            ("manifest.json", manifest.as_bytes()),
            ("dist/button.mjs", b"import { x } from \"vue\";\nexport default {}"),
            ("types/button.d.ts", b"export {};"),
            ("source/src/ui/button/Button.vue", b"<template><button/></template>"),
        ]);
        assert_eq!(publish(&app, body, Some(TOKEN)).await, StatusCode::CREATED);

        // 公开只读：不带 Authorization 也能取到权威清单
        let (st, v) = get_json(&app, "/v/@dp_ui/button@0.1.3/files.json").await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(v["scope"], "@dp_ui");
        assert_eq!(v["name"], "button");
        assert_eq!(v["version"], "0.1.3");
        let files = v["files"].as_array().unwrap();
        let paths: Vec<&str> = files.iter().map(|f| f["path"].as_str().unwrap()).collect();
        assert_eq!(
            paths,
            vec!["dist/button.mjs", "source/src/ui/button/Button.vue", "types/button.d.ts"]
        );
        for f in files {
            assert!(f["size"].as_i64().unwrap() > 0, "{f}");
            let sha = f["sha256"].as_str().unwrap();
            assert_eq!(sha.len(), 64, "{f}");
            assert!(
                sha.chars().all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()),
                "sha256 必须为小写 hex: {sha}"
            );
        }

        // 未知版本 → 404 "version not found"
        let (st2, e2) = get_json(&app, "/v/@dp_ui/button@9.9.9/files.json").await;
        assert_eq!(st2, StatusCode::NOT_FOUND);
        assert!(e2["error"].as_str().unwrap().contains("version not found"), "{e2}");

        // 未知包 → 404 "package not found"
        let (st3, e3) = get_json(&app, "/v/@dp_ui/nope@0.1.3/files.json").await;
        assert_eq!(st3, StatusCode::NOT_FOUND);
        assert!(e3["error"].as_str().unwrap().contains("package not found"), "{e3}");
    }

    #[tokio::test]
    async fn duplicate_version_conflict() {
        let (app, _dir) = make_app().await;
        assert_eq!(publish(&app, valid_body(), Some(TOKEN)).await, StatusCode::CREATED);
        let st = publish(&app, valid_body(), Some(TOKEN)).await;
        assert_eq!(st, StatusCode::CONFLICT);
    }

    #[tokio::test]
    async fn missing_manifest_rejected() {
        let (app, _dir) = make_app().await;
        let body = make_tar(&[("dist/button.mjs", b"export default {}")]);
        assert_eq!(publish(&app, body, Some(TOKEN)).await, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn zip_slip_rejected() {
        let (app, _dir) = make_app().await;
        let body = make_raw_ustar_gz(&[
            ("../evil.txt", b"evil"),
            ("manifest.json", VALID_MANIFEST.as_bytes()),
            ("dist/button.mjs", b"export default {}"),
            ("dist/button.style.css", b""),
        ]);
        let st = publish(&app, body, Some(TOKEN)).await;
        assert_eq!(st, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn entry_file_missing_rejected() {
        let (app, _dir) = make_app().await;
        let body = make_tar(&[
            ("manifest.json", VALID_MANIFEST.as_bytes()),
            // 缺 dist/button.style.css
            ("dist/button.mjs", b"export default {}"),
        ]);
        assert_eq!(publish(&app, body, Some(TOKEN)).await, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn auth_required() {
        let (app, _dir) = make_app().await;
        assert_eq!(publish(&app, valid_body(), None).await, StatusCode::UNAUTHORIZED);
        assert_eq!(publish(&app, valid_body(), Some("wrong")).await, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn manifest_route_404_for_unknown_version() {
        let (app, _dir) = make_app().await;
        assert_eq!(publish(&app, valid_body(), Some(TOKEN)).await, StatusCode::CREATED);
        let (st, _) = get_json(&app, "/v/@dp_ui/button@9.9.9/manifest.json").await;
        assert_eq!(st, StatusCode::NOT_FOUND);
    }
}
