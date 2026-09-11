//! 管理员对已发布包的管理操作：删除单个版本 / 删除整包。
//!
//! 路由（admin 会话鉴权，Bearer = 会话令牌）：
//! - `DELETE /api/packages/{scope}/{name}@{version}` → 删除该版本并重算 latest
//! - `DELETE /api/packages/{scope}/{name}`           → 删除整包
//!
//! blob 为内容寻址、可被多版本/多包共享，故仅在没有任何 `version_files`
//! 行再引用该 sha256 时才删除文件。

use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::json;

use crate::{
    api::{ejson, internal, ApiErr, AppState},
    auth,
};

/// `DELETE /api/packages/{scope}/{name}`；`name` 形如 `name@version` 时删除该版本，否则删除整包。
pub async fn delete_package(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path((scope, name)): Path<(String, String)>,
) -> Result<impl IntoResponse, ApiErr> {
    auth::require_admin(&state, &headers).await?;
    let (name, version) = match name.split_once('@') {
        Some((n, v)) => (n.to_string(), Some(v.to_string())),
        None => (name, None),
    };
    let id = state
        .store
        .package_id(&scope, &name)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "package not found"))?;

    // 删整包：先在事务外收集待 GC 的 sha，DB 行原子删除后再回收文件。
    let Some(version) = version else {
        let shas = state.store.package_blob_shas(id).await.map_err(internal)?;
        let versions = state.store.delete_package(id).await.map_err(internal)?;
        state.store.gc_blobs(&shas).await.map_err(internal)?;
        return Ok(Json(json!({
            "deleted": format!("{scope}/{name}"),
            "versions": versions,
        })));
    };

    // 删单版本：捕获的 sha 用于 commit 之后的 GC；版本不存在时事务回滚、无任何副作用。
    let shas = state.store.version_blob_shas(id, &version).await.map_err(internal)?;
    let Some(latest) = state
        .store
        .delete_version_and_recompute_latest(id, &version)
        .await
        .map_err(internal)?
    else {
        return Err(ejson(StatusCode::NOT_FOUND, "version not found"));
    };
    state.store.gc_blobs(&shas).await.map_err(internal)?;
    Ok(Json(json!({
        "deleted": format!("{scope}/{name}@{version}"),
        "latest": latest,
    })))
}

#[cfg(test)]
mod tests {
    use axum::{
        body::Body,
        http::{header::AUTHORIZATION, Request, StatusCode},
        Router,
    };
    use flate2::{write::GzEncoder, Compression};
    use serde_json::{json, Value};
    use tower::ServiceExt;

    use crate::{api, store::Store};

    const ROOT_TOKEN: &str = "root-token";

    async fn make_app() -> (Router, tempfile::TempDir, Store) {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::init(dir.path()).await.unwrap();
        (api::app(store.clone(), ROOT_TOKEN.into()), dir, store)
    }

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

    fn manifest(name: &str, version: &str) -> String {
        format!(
            r#"{{"name":"{name}","version":"{version}","type":"vue-component",
                 "entry":{{"module":"dist/x.mjs","css":[]}},"cssStrategy":"vanilla"}}"#
        )
    }

    /// 归档：manifest.json + dist/x.mjs（内容可定制，便于 blob GC 断言）。
    fn pkg_body(name: &str, version: &str, module: &[u8]) -> Vec<u8> {
        make_tar(&[
            ("manifest.json", manifest(name, version).as_bytes()),
            ("dist/x.mjs", module),
        ])
    }

    async fn call(
        app: &Router,
        method: &str,
        uri: &str,
        body: Option<Value>,
        bearer: Option<&str>,
    ) -> (StatusCode, Value) {
        let mut builder = Request::builder().method(method).uri(uri);
        if let Some(t) = bearer {
            builder = builder.header(AUTHORIZATION, format!("Bearer {t}"));
        }
        let req = match body {
            Some(v) => builder
                .header("content-type", "application/json")
                .body(Body::from(v.to_string()))
                .unwrap(),
            None => builder.body(Body::empty()).unwrap(),
        };
        let resp = app.clone().oneshot(req).await.unwrap();
        let status = resp.status();
        let bytes = axum::body::to_bytes(resp.into_body(), 4 * 1024 * 1024).await.unwrap();
        let v = if bytes.is_empty() {
            Value::Null
        } else {
            serde_json::from_slice(&bytes).unwrap_or(Value::Null)
        };
        (status, v)
    }

    async fn delete(app: &Router, uri: &str, bearer: Option<&str>) -> (StatusCode, Value) {
        call(app, "DELETE", uri, None, bearer).await
    }

    async fn publish_resp(app: &Router, body: Vec<u8>, bearer: Option<&str>) -> (StatusCode, Value) {
        let mut builder =
            Request::post("/api/publish").header("content-type", "application/octet-stream");
        if let Some(t) = bearer {
            builder = builder.header(AUTHORIZATION, format!("Bearer {t}"));
        }
        let resp = app.clone().oneshot(builder.body(Body::from(body)).unwrap()).await.unwrap();
        let status = resp.status();
        let bytes = axum::body::to_bytes(resp.into_body(), 4 * 1024 * 1024).await.unwrap();
        (status, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
    }

    async fn publish(app: &Router, body: Vec<u8>, bearer: Option<&str>) -> StatusCode {
        publish_resp(app, body, bearer).await.0
    }

    /// 初始化 admin 并返回会话令牌。
    async fn setup_admin(app: &Router) -> String {
        let (st, v) = call(
            app,
            "POST",
            "/api/setup",
            Some(json!({ "username": "root", "password": "secret1" })),
            None,
        )
        .await;
        assert_eq!(st, StatusCode::CREATED, "{v}");
        v["sessionToken"].as_str().unwrap().to_string()
    }

    /// 建 publisher 用户并返回其会话令牌。
    async fn add_publisher(app: &Router, admin: &str) -> String {
        let (st, v) = call(
            app,
            "POST",
            "/api/users",
            Some(json!({ "username": "dev", "password": "secret1", "role": "publisher" })),
            Some(admin),
        )
        .await;
        assert_eq!(st, StatusCode::CREATED, "{v}");
        let (st, v) = call(
            app,
            "POST",
            "/api/auth/login",
            Some(json!({ "username": "dev", "password": "secret1" })),
            None,
        )
        .await;
        assert_eq!(st, StatusCode::OK, "{v}");
        v["sessionToken"].as_str().unwrap().to_string()
    }

    #[tokio::test]
    async fn delete_version_updates_latest_and_reads() {
        let (app, _dir, store) = make_app().await;
        let admin = setup_admin(&app).await;
        for v in ["0.1.0", "0.2.0", "0.3.0"] {
            assert_eq!(
                publish(&app, pkg_body("@dp_ui/button", v, b"export default {}"), Some(ROOT_TOKEN))
                    .await,
                StatusCode::CREATED
            );
        }

        // 删 latest → latest 重算为剩余最近发布者
        let (st, v) = delete(&app, "/api/packages/@dp_ui/button@0.3.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK, "{v}");
        assert_eq!(v["deleted"], "@dp_ui/button@0.3.0");
        assert_eq!(v["latest"], "0.2.0");

        // 被删版本 manifest / files / dist 均 404；其余版本仍可读
        assert_eq!(
            call(&app, "GET", "/v/@dp_ui/button@0.3.0/manifest.json", None, None).await.0,
            StatusCode::NOT_FOUND
        );
        assert_eq!(
            call(&app, "GET", "/v/@dp_ui/button@0.3.0/files.json", None, None).await.0,
            StatusCode::NOT_FOUND
        );
        assert_eq!(
            call(&app, "GET", "/v/@dp_ui/button@0.2.0/manifest.json", None, None).await.0,
            StatusCode::OK
        );
        assert_eq!(
            call(&app, "GET", "/v/@dp_ui/button@0.2.0/dist/x.mjs", None, None).await.0,
            StatusCode::OK
        );

        // index.json 的 latest 与 detail 一致
        let (st, idx) = call(&app, "GET", "/v/index.json", None, None).await;
        assert_eq!(st, StatusCode::OK);
        let p = idx["packages"]
            .as_array()
            .unwrap()
            .iter()
            .find(|p| p["name"] == "button")
            .unwrap();
        assert_eq!(p["latest"], "0.2.0", "{idx}");

        // 删非 latest → latest 不变
        let (st, v) = delete(&app, "/api/packages/@dp_ui/button@0.1.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK, "{v}");
        assert_eq!(v["latest"], "0.2.0");

        // 删最后一个版本 → 包记录保留、latest 为 null、detail 无版本
        let (st, v) = delete(&app, "/api/packages/@dp_ui/button@0.2.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK, "{v}");
        assert!(v["latest"].is_null(), "{v}");
        let (st, d) = call(&app, "GET", "/v/@dp_ui/button", None, None).await;
        assert_eq!(st, StatusCode::OK, "{d}");
        assert_eq!(d["versions"].as_array().unwrap().len(), 0, "{d}");
        assert_eq!(call(&app, "GET", "/resolve/@dp_ui/button", None, None).await.0, StatusCode::NOT_FOUND);
        // 无版本的包不再出现在 index.json（但 detail 仍 200 + versions 空）
        let (_, idx) = call(&app, "GET", "/v/index.json", None, None).await;
        assert!(
            idx["packages"].as_array().unwrap().iter().all(|p| p["name"] != "button"),
            "{idx}"
        );
        // store 侧：versions / version_files 行已清理
        let pid = store.package_id("@dp_ui", "button").await.unwrap().unwrap();
        assert!(store.versions_of(pid).await.unwrap().is_empty());
        assert!(store.version_files(pid, "0.2.0").await.unwrap().is_empty());

        // 重复删除 → 404 version not found；未知包 → 404 package not found
        let (st, v) = delete(&app, "/api/packages/@dp_ui/button@0.2.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::NOT_FOUND);
        assert_eq!(v["error"], "version not found");
        let (st, v) = delete(&app, "/api/packages/@dp_ui/nope@0.1.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::NOT_FOUND);
        assert_eq!(v["error"], "package not found");
    }

    #[tokio::test]
    async fn index_excludes_packages_without_versions() {
        let (app, _dir, _store) = make_app().await;
        let admin = setup_admin(&app).await;
        for v in ["0.1.0", "0.2.0"] {
            assert_eq!(
                publish(&app, pkg_body("@dp_ui/button", v, b"x"), Some(ROOT_TOKEN)).await,
                StatusCode::CREATED
            );
        }
        // 有版本 → 列出且 latest 正确
        let (_, idx) = call(&app, "GET", "/v/index.json", None, None).await;
        let entry = idx["packages"]
            .as_array()
            .unwrap()
            .iter()
            .find(|p| p["name"] == "button")
            .unwrap();
        assert_eq!(entry["latest"], "0.2.0");

        // 删一个版本、包仍有其它版本 → 仍列出（防过滤过度）
        let (st, _) = delete(&app, "/api/packages/@dp_ui/button@0.2.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
        let (_, idx) = call(&app, "GET", "/v/index.json", None, None).await;
        let entry = idx["packages"]
            .as_array()
            .unwrap()
            .iter()
            .find(|p| p["name"] == "button")
            .unwrap();
        assert_eq!(entry["latest"], "0.1.0", "{idx}");

        // 删到无版本 → 不再列出；detail 仍 200 + versions 空、resolve 仍 404
        let (st, _) = delete(&app, "/api/packages/@dp_ui/button@0.1.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
        let (_, idx) = call(&app, "GET", "/v/index.json", None, None).await;
        assert!(
            idx["packages"].as_array().unwrap().iter().all(|p| p["name"] != "button"),
            "{idx}"
        );
        let (st, d) = call(&app, "GET", "/v/@dp_ui/button", None, None).await;
        assert_eq!(st, StatusCode::OK, "{d}");
        assert_eq!(d["versions"].as_array().unwrap().len(), 0, "{d}");
        assert_eq!(
            call(&app, "GET", "/resolve/@dp_ui/button", None, None).await.0,
            StatusCode::NOT_FOUND
        );

        // 重新发布 → index 重新列出且 latest 正确
        assert_eq!(
            publish(&app, pkg_body("@dp_ui/button", "0.3.0", b"x"), Some(ROOT_TOKEN)).await,
            StatusCode::CREATED
        );
        let (_, idx) = call(&app, "GET", "/v/index.json", None, None).await;
        let entry = idx["packages"]
            .as_array()
            .unwrap()
            .iter()
            .find(|p| p["name"] == "button")
            .unwrap();
        assert_eq!(entry["latest"], "0.3.0", "{idx}");
    }

    #[tokio::test]
    async fn delete_whole_package_cleans_rows_and_blobs() {
        let (app, _dir, store) = make_app().await;
        let admin = setup_admin(&app).await;
        assert_eq!(
            publish(&app, pkg_body("@dp_ui/button", "0.1.0", b"same"), Some(ROOT_TOKEN)).await,
            StatusCode::CREATED
        );
        assert_eq!(
            publish(&app, pkg_body("@dp_ui/button", "0.2.0", b"other"), Some(ROOT_TOKEN)).await,
            StatusCode::CREATED
        );
        let pid = store.package_id("@dp_ui", "button").await.unwrap().unwrap();
        let sha1 = store.version_files(pid, "0.1.0").await.unwrap()[0].1.clone();
        let sha2 = store.version_files(pid, "0.2.0").await.unwrap()[0].1.clone();
        assert!(store.blob_path(&sha1).exists());
        assert!(store.blob_path(&sha2).exists());

        let (st, v) = delete(&app, "/api/packages/@dp_ui/button", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK, "{v}");
        assert_eq!(v["deleted"], "@dp_ui/button");
        assert_eq!(v["versions"], 2);

        // 行清理干净
        assert!(store.package_id("@dp_ui", "button").await.unwrap().is_none());
        assert!(store.versions_of(pid).await.unwrap().is_empty());
        assert!(store.version_files(pid, "0.1.0").await.unwrap().is_empty());
        // blob 全部回收
        assert!(!store.blob_path(&sha1).exists());
        assert!(!store.blob_path(&sha2).exists());

        // 读接口
        assert_eq!(
            call(&app, "GET", "/v/@dp_ui/button", None, None).await.0,
            StatusCode::NOT_FOUND
        );
        let (_, idx) = call(&app, "GET", "/v/index.json", None, None).await;
        assert!(idx["packages"].as_array().unwrap().iter().all(|p| p["name"] != "button"));

        // 幂等删除 → 404
        let (st, v) = delete(&app, "/api/packages/@dp_ui/button", Some(&admin)).await;
        assert_eq!(st, StatusCode::NOT_FOUND);
        assert_eq!(v["error"], "package not found");
    }

    #[tokio::test]
    async fn delete_permission_guards() {
        let (app, _dir, _store) = make_app().await;
        let admin = setup_admin(&app).await;
        assert_eq!(
            publish(&app, pkg_body("@dp_ui/button", "0.1.0", b"x"), Some(ROOT_TOKEN)).await,
            StatusCode::CREATED
        );

        // 无会话 → 401
        for uri in ["/api/packages/@dp_ui/button@0.1.0", "/api/packages/@dp_ui/button"] {
            let (st, v) = delete(&app, uri, None).await;
            assert_eq!(st, StatusCode::UNAUTHORIZED, "{uri}");
            assert_eq!(v["error"], "missing session token");
        }
        // 非法会话 → 401
        let (st, v) = delete(&app, "/api/packages/@dp_ui/button@0.1.0", Some("dpui_sess_dead")).await;
        assert_eq!(st, StatusCode::UNAUTHORIZED);
        assert_eq!(v["error"], "invalid session");

        // 非 admin（publisher）→ 403，且包未被删除
        let dev = add_publisher(&app, &admin).await;
        let (st, v) = delete(&app, "/api/packages/@dp_ui/button@0.1.0", Some(&dev)).await;
        assert_eq!(st, StatusCode::FORBIDDEN);
        assert_eq!(v["error"], "admin required");
        assert_eq!(
            call(&app, "GET", "/v/@dp_ui/button@0.1.0/manifest.json", None, None).await.0,
            StatusCode::OK
        );
        let (st, _) = delete(&app, "/api/packages/@dp_ui/button", Some(&dev)).await;
        assert_eq!(st, StatusCode::FORBIDDEN);

        // admin 会话 → 200
        let (st, _) = delete(&app, "/api/packages/@dp_ui/button@0.1.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
    }

    #[tokio::test]
    async fn blob_gc_respects_shared_content() {
        let (app, _dir, store) = make_app().await;
        let admin = setup_admin(&app).await;
        // 两个版本的 dist/x.mjs 内容相同 → 同一 blob
        assert_eq!(
            publish(&app, pkg_body("@dp_ui/button", "0.1.0", b"shared"), Some(ROOT_TOKEN)).await,
            StatusCode::CREATED
        );
        assert_eq!(
            publish(&app, pkg_body("@dp_ui/button", "0.2.0", b"shared"), Some(ROOT_TOKEN)).await,
            StatusCode::CREATED
        );
        let pid = store.package_id("@dp_ui", "button").await.unwrap().unwrap();
        let sha1 = store.version_files(pid, "0.1.0").await.unwrap()[0].1.clone();
        let sha2 = store.version_files(pid, "0.2.0").await.unwrap()[0].1.clone();
        assert_eq!(sha1, sha2);
        let blob = store.blob_path(&sha1);
        assert!(blob.exists());
        assert_eq!(store.blob_ref_count(&sha1).await.unwrap(), 2);

        // 删掉一个版本：blob 仍被另一版本引用 → 文件保留
        let (st, _) = delete(&app, "/api/packages/@dp_ui/button@0.1.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
        assert!(blob.exists(), "blob 仍被 0.2.0 引用，不得删除");
        assert_eq!(store.blob_ref_count(&sha1).await.unwrap(), 1);
        // 幸存版本仍可分发出该文件
        assert_eq!(
            call(&app, "GET", "/v/@dp_ui/button@0.2.0/dist/x.mjs", None, None).await.0,
            StatusCode::OK
        );

        // 删掉最后一个引用：blob 文件被回收
        let (st, _) = delete(&app, "/api/packages/@dp_ui/button@0.2.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
        assert!(!blob.exists(), "无 version_files 引用后 blob 应被删除");
        assert_eq!(store.blob_ref_count(&sha1).await.unwrap(), 0);
    }

    #[tokio::test]
    async fn admin_session_can_publish() {
        let (app, _dir, _store) = make_app().await;
        let admin = setup_admin(&app).await;
        let dev = add_publisher(&app, &admin).await;

        // admin 会话可发布任意 scope
        assert_eq!(
            publish(&app, pkg_body("@other/x", "1.0.0", b"a"), Some(&admin)).await,
            StatusCode::CREATED
        );
        // root 令牌路径仍可用（防回归）
        assert_eq!(
            publish(&app, pkg_body("@other/x", "1.1.0", b"b"), Some(ROOT_TOKEN)).await,
            StatusCode::CREATED
        );
        // 非 admin 会话无发布权
        let (st, v) = publish_resp(&app, pkg_body("@other/x", "1.2.0", b"c"), Some(&dev)).await;
        assert_eq!(st, StatusCode::FORBIDDEN, "{v}");
        assert!(v["error"].as_str().unwrap().contains("publish permission"), "{v}");
        // 伪造 / 缺失令牌
        assert_eq!(
            publish(&app, pkg_body("@other/x", "1.3.0", b"d"), Some("dpui_deadbeef")).await,
            StatusCode::UNAUTHORIZED
        );
        assert_eq!(
            publish(&app, pkg_body("@other/x", "1.4.0", b"e"), None).await,
            StatusCode::UNAUTHORIZED
        );
        // 两次成功发布均已落库
        assert_eq!(
            call(&app, "GET", "/v/@other/x@1.0.0/manifest.json", None, None).await.0,
            StatusCode::OK
        );
        assert_eq!(
            call(&app, "GET", "/v/@other/x@1.1.0/manifest.json", None, None).await.0,
            StatusCode::OK
        );
        assert_eq!(
            call(&app, "GET", "/v/@other/x@1.2.0/manifest.json", None, None).await.0,
            StatusCode::NOT_FOUND
        );
    }

    /// 直连同一 SQLite 文件（服务端 pool 之外），用于一致性断言。
    async fn open_db(dir: &tempfile::TempDir) -> sqlx::SqlitePool {
        let opts = sqlx::sqlite::SqliteConnectOptions::new().filename(dir.path().join("hub.db"));
        sqlx::SqlitePool::connect_with(opts).await.unwrap()
    }

    /// 指向已删版本的残留 `version_files` 行数（孤儿行）。
    const ORPHAN_FILES_SQL: &str = "SELECT COUNT(*) FROM version_files vf \
         LEFT JOIN versions v ON vf.package_id = v.package_id AND vf.version = v.version \
         WHERE v.version IS NULL";

    /// `latest_version` 指向不存在版本的包数（悬空 latest）。
    const DANGLING_LATEST_SQL: &str = "SELECT COUNT(*) FROM packages p \
         WHERE p.latest_version IS NOT NULL AND NOT EXISTS ( \
             SELECT 1 FROM versions v WHERE v.package_id = p.id AND v.version = p.latest_version)";

    #[tokio::test]
    async fn delete_keeps_db_consistent() {
        let (app, dir, store) = make_app().await;
        let admin = setup_admin(&app).await;
        for (pkg, v) in [
            ("@dp_ui/button", "0.1.0"),
            ("@dp_ui/button", "0.2.0"),
            ("@dp_ui/other", "1.0.0"),
        ] {
            assert_eq!(
                publish(&app, pkg_body(pkg, v, b"payload"), Some(ROOT_TOKEN)).await,
                StatusCode::CREATED
            );
        }
        let button_pid = store.package_id("@dp_ui", "button").await.unwrap().unwrap();
        let other_pid = store.package_id("@dp_ui", "other").await.unwrap().unwrap();
        let db = open_db(&dir).await;
        let count = |sql: &str| {
            let db = db.clone();
            let sql = sql.to_string();
            async move { sqlx::query_scalar::<_, i64>(&sql).fetch_one(&db).await.unwrap() }
        };

        // 探测器自检：人为插入一条孤儿 version_files 行 → 同一 SQL 必须报 1（证明断言非恒真）
        sqlx::query(
            "INSERT INTO version_files (package_id, version, path, sha256, size) \
             VALUES (?, '9.9.9', '__orphan__', 'x', 1)",
        )
        .bind(button_pid)
        .execute(&db)
        .await
        .unwrap();
        assert_eq!(count(ORPHAN_FILES_SQL).await, 1, "一致性探测 SQL 必须能发现孤儿行");
        sqlx::query("DELETE FROM version_files WHERE path = '__orphan__'")
            .execute(&db)
            .await
            .unwrap();

        // 探测器自检 2：把 latest 指向不存在的版本 → 悬空探测 SQL 必须报 1
        sqlx::query("UPDATE packages SET latest_version = '9.9.9' WHERE id = ?")
            .bind(button_pid)
            .execute(&db)
            .await
            .unwrap();
        assert_eq!(count(DANGLING_LATEST_SQL).await, 1, "一致性探测 SQL 必须能发现悬空 latest");
        sqlx::query("UPDATE packages SET latest_version = '0.2.0' WHERE id = ?")
            .bind(button_pid)
            .execute(&db)
            .await
            .unwrap();

        // 删一个版本（latest）→ 无孤儿 version_files、latest 不悬空且指向幸存版本
        let (st, _) = delete(&app, "/api/packages/@dp_ui/button@0.2.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(count(ORPHAN_FILES_SQL).await, 0);
        assert_eq!(count(DANGLING_LATEST_SQL).await, 0);
        let leftover: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM version_files WHERE package_id = ? AND version = '0.2.0'",
        )
        .bind(button_pid)
        .fetch_one(&db)
        .await
        .unwrap();
        assert_eq!(leftover, 0, "已删版本的 version_files 行必须清空");
        let latest: Option<String> =
            sqlx::query_scalar("SELECT latest_version FROM packages WHERE id = ?")
                .bind(button_pid)
                .fetch_one(&db)
                .await
                .unwrap();
        assert_eq!(latest.as_deref(), Some("0.1.0"));

        // 删到无版本 → latest 置 NULL，仍无孤儿/悬空
        let (st, _) = delete(&app, "/api/packages/@dp_ui/button@0.1.0", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(count(ORPHAN_FILES_SQL).await, 0);
        assert_eq!(count(DANGLING_LATEST_SQL).await, 0);

        // 删整包 → 三张表都不含该 package_id；其它包不受影响
        let (st, _) = delete(&app, "/api/packages/@dp_ui/button", Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
        let rows: i64 = sqlx::query_scalar(
            "SELECT (SELECT COUNT(*) FROM version_files WHERE package_id = ?1) \
                  + (SELECT COUNT(*) FROM versions WHERE package_id = ?1) \
                  + (SELECT COUNT(*) FROM packages WHERE id = ?1)",
        )
        .bind(button_pid)
        .fetch_one(&db)
        .await
        .unwrap();
        assert_eq!(rows, 0, "整包删除后三张表都必须清空");
        let other_rows: i64 = sqlx::query_scalar(
            "SELECT (SELECT COUNT(*) FROM version_files WHERE package_id = ?1) \
                  + (SELECT COUNT(*) FROM versions WHERE package_id = ?1) \
                  + (SELECT COUNT(*) FROM packages WHERE id = ?1)",
        )
        .bind(other_pid)
        .fetch_one(&db)
        .await
        .unwrap();
        assert!(other_rows > 0, "其它包不得被误删");
        assert_eq!(count(ORPHAN_FILES_SQL).await, 0);
        db.close().await;
    }
}
