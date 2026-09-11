use std::sync::Arc;

use axum::{
    body::Body,
    extract::{DefaultBodyLimit, State},
    http::{
        header::{AUTHORIZATION, CACHE_CONTROL, CONTENT_TYPE},
        HeaderMap, HeaderValue, Method, StatusCode, Uri,
    },
    response::IntoResponse,
    routing::{delete, get, patch, post},
    Json, Router,
};
use serde_json::{json, Value};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};

use crate::{
    admin, auth,
    manifest::Manifest,
    publish::publish_handler,
    store::{Store, StoreError},
};

pub const MAX_BODY: usize = 32 * 1024 * 1024;

type HttpResponse = axum::http::Response<Body>;

pub(crate) type ApiErr = (StatusCode, Json<Value>);

pub(crate) fn ejson(status: StatusCode, msg: impl Into<String>) -> ApiErr {
    (status, Json(json!({ "error": msg.into() })))
}

pub(crate) fn internal<E: std::fmt::Display>(e: E) -> ApiErr {
    ejson(StatusCode::INTERNAL_SERVER_ERROR, format!("internal error: {e}"))
}

/// 基于请求 Host 头拼绝对 URL（dev 场景 http；生产代理场景后续再处理）。
pub(crate) fn base_url(headers: &HeaderMap) -> String {
    let host = headers
        .get("host")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("127.0.0.1:8787");
    format!("http://{host}")
}

fn pkg_rest(scope: &str, name: &str, version: &str) -> String {
    format!("{scope}/{name}@{version}")
}

pub(crate) fn text_response(s: &'static str) -> HttpResponse {
    axum::http::Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, HeaderValue::from_static("text/plain; charset=utf-8"))
        .body(Body::from(s))
        .unwrap()
}

#[derive(Clone)]
pub struct AppState {
    pub store: Store,
    /// env `HUB_PUBLISH_TOKEN`：root 发布令牌（等价 admin 权限，不入库）
    pub root_token: Arc<String>,
}

pub fn app(store: Store, token: String) -> Router {
    let state = Arc::new(AppState { store, root_token: Arc::new(token) });
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE]);
    Router::new()
        .route("/api/publish", post(publish_handler))
        .route("/api/auth/status", get(auth::auth_status))
        .route("/api/setup", post(auth::setup))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/logout", post(auth::logout))
        .route("/api/auth/me", get(auth::me))
        .route("/api/users", get(auth::list_users).post(auth::create_user))
        .route("/api/users/{id}", patch(auth::patch_user).delete(auth::delete_user))
        .route("/api/tokens", get(auth::list_tokens).post(auth::create_token))
        .route("/api/tokens/{id}", delete(auth::delete_token).patch(auth::patch_token))
        .route("/api/packages/{scope}/{name}", delete(admin::delete_package))
        .route("/{*path}", get(public_get))
        .layer(DefaultBodyLimit::max(MAX_BODY))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

// ---------- 路径解析 ----------

#[derive(Debug, PartialEq, Eq)]
pub enum PkgTarget {
    Detail { scope: String, name: String },
    Manifest { scope: String, name: String, version: String },
    Files { scope: String, name: String, version: String },
    Dist { scope: String, name: String, version: String, path: String },
    Source { scope: String, name: String, version: String, path: String },
    Types { scope: String, name: String, version: String, path: String },
}

/// 解析 `rest`（`/v/` 或 `/resolve/` 之后的部分）。返回 None = 无法识别。
/// 形态：
///   @scope/name                              → Detail
///   @scope/name@version/manifest.json        → Manifest
///   @scope/name@version/files.json           → Files（归档内全部文件清单）
///   @scope/name@version/dist/<file...>       → Dist
///   @scope/name@version/source/<file...>     → Source
///   @scope/name@version/types/<file...>      → Types（声明文件，与 dist/ 同级）
/// 特殊：rest == "index.json" 由调用方先行处理。
pub fn parse_pkg_path(rest: &str) -> Option<PkgTarget> {
    let segs: Vec<&str> = rest.split('/').collect();
    if segs.len() < 2 || !segs[0].starts_with('@') {
        return None;
    }
    let scope = segs[0];
    let (name, version) = match segs[1].split_once('@') {
        Some((n, v)) if !n.is_empty() && !v.is_empty() => (n, Some(v)),
        _ => (segs[1], None),
    };
    if name.is_empty() {
        return None;
    }
    match segs.len() {
        2 if version.is_none() => Some(PkgTarget::Detail { scope: scope.into(), name: name.into() }),
        2 => None, // "@scope/name@ver" 无子路径：非法（Detail 不接受版本）
        3 if segs[2] == "manifest.json" => version.map(|v| PkgTarget::Manifest {
            scope: scope.into(),
            name: name.into(),
            version: v.into(),
        }),
        3 if segs[2] == "files.json" => version.map(|v| PkgTarget::Files {
            scope: scope.into(),
            name: name.into(),
            version: v.into(),
        }),
        _ if segs.len() >= 4 && segs[2] == "dist" => version.map(|v| PkgTarget::Dist {
            scope: scope.into(),
            name: name.into(),
            version: v.into(),
            path: segs[3..].join("/"),
        }),
        _ if segs.len() >= 4 && segs[2] == "source" => version.map(|v| PkgTarget::Source {
            scope: scope.into(),
            name: name.into(),
            version: v.into(),
            path: segs[3..].join("/"),
        }),
        _ if segs.len() >= 4 && segs[2] == "types" => version.map(|v| PkgTarget::Types {
            scope: scope.into(),
            name: name.into(),
            version: v.into(),
            path: segs[3..].join("/"),
        }),
        _ => None,
    }
}

// ---------- 公开 GET：统一 catch-all，按原始路径手动路由 ----------

async fn public_get(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    uri: Uri,
) -> Result<HttpResponse, ApiErr> {
    let path = uri.path();
    if path == "/healthz" {
        return Ok(text_response("ok"));
    }
    if let Some(rest) = path.strip_prefix("/v/") {
        return v_routes(&state, &headers, rest).await;
    }
    if let Some(rest) = path.strip_prefix("/resolve/") {
        return resolve_handler(&state, &headers, rest).await;
    }
    Err(ejson(StatusCode::NOT_FOUND, "not found"))
}

async fn v_routes(
    state: &AppState,
    headers: &HeaderMap,
    rest: &str,
) -> Result<HttpResponse, ApiErr> {
    if rest == "index.json" {
        let v = index_json(state).await.map_err(internal)?;
        return Ok(Json(v).into_response());
    }
    let target = parse_pkg_path(rest).ok_or_else(|| ejson(StatusCode::NOT_FOUND, "not found"))?;
    let base = base_url(headers);
    match target {
        PkgTarget::Detail { scope, name } => pkg_detail(state, &base, &scope, &name).await,
        PkgTarget::Manifest { scope, name, version } => {
            pkg_manifest(state, &scope, &name, &version).await
        }
        PkgTarget::Files { scope, name, version } => {
            pkg_files(state, &scope, &name, &version).await
        }
        PkgTarget::Dist { scope, name, version, path } => {
            dist_file(state, &scope, &name, &version, &path).await
        }
        PkgTarget::Source { scope, name, version, path } => {
            source_file(state, &scope, &name, &version, &path).await
        }
        PkgTarget::Types { scope, name, version, path } => {
            types_file(state, &scope, &name, &version, &path).await
        }
    }
}

async fn resolve_handler(
    state: &AppState,
    headers: &HeaderMap,
    rest: &str,
) -> Result<HttpResponse, ApiErr> {
    let target = parse_pkg_path(rest).ok_or_else(|| ejson(StatusCode::NOT_FOUND, "not found"))?;
    let (scope, name) = match target {
        PkgTarget::Detail { scope, name } => (scope, name),
        _ => return Err(ejson(StatusCode::NOT_FOUND, "resolve expects @scope/name")),
    };
    let id = state
        .store
        .package_id(&scope, &name)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "package not found"))?;
    let version = state
        .store
        .latest_version(id)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "package has no version"))?;
    let mj = state
        .store
        .manifest_json(id, &version)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "version manifest missing"))?;
    let m: Manifest = serde_json::from_str(&mj).map_err(internal)?;
    let base = base_url(headers);
    let head = format!("{base}/v/{}", pkg_rest(&scope, &name, &version));
    let css_urls: Vec<String> = m.entry.css.iter().map(|c| format!("{head}/{c}")).collect();
    Ok(Json(json!({
        "version": version,
        "manifestUrl": format!("{head}/manifest.json"),
        "moduleUrl": format!("{head}/{}", m.entry.module),
        "cssUrls": css_urls,
        "entry": {
            "module": m.entry.module,
            "css": m.entry.css,
            "types": m.entry.types,
            "typesFiles": m.entry.types_files,
        },
    }))
    .into_response())
}

// ---------- 数据组装 ----------

async fn index_json(state: &AppState) -> Result<Value, StoreError> {
    let pkgs = state.store.list_packages().await?;
    let mut arr = Vec::new();
    for p in &pkgs {
        // 无版本的包（latest_version 为 NULL）不进 index：避免前端拿到没有版本可选的空卡片。
        let (Some(id), Some(latest)) = (
            state.store.package_id(&p.scope, &p.name).await?,
            &p.latest_version,
        ) else {
            continue;
        };
        let mj = state.store.manifest_json(id, latest).await?.unwrap_or_default();
        let description = serde_json::from_str::<Value>(&mj)
            .ok()
            .and_then(|v| v.get("description").and_then(|d| d.as_str()).map(String::from))
            .unwrap_or_default();
        let updated_at = state
            .store
            .versions_of(id)
            .await?
            .iter()
            .find(|r| &r.version == latest)
            .map(|r| r.created_at.clone())
            .unwrap_or_default();
        arr.push(json!({
            "scope": p.scope,
            "name": p.name,
            "latest": p.latest_version,
            "description": description,
            "updatedAt": updated_at,
        }));
    }
    Ok(json!({ "packages": arr }))
}

async fn pkg_detail(
    state: &AppState,
    base: &str,
    scope: &str,
    name: &str,
) -> Result<HttpResponse, ApiErr> {
    let id = state
        .store
        .package_id(scope, name)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "package not found"))?;
    let rows = state.store.versions_of(id).await.map_err(internal)?;
    let versions: Vec<Value> = rows
        .iter()
        .map(|r| {
            let manifest: Value = serde_json::from_str(&r.manifest_json).unwrap_or(Value::Null);
            json!({
                "version": r.version,
                "manifestUrl": format!("{base}/v/{}/manifest.json", pkg_rest(scope, name, &r.version)),
                "manifest": manifest,
            })
        })
        .collect();
    Ok(Json(json!({ "scope": scope, "name": name, "versions": versions })).into_response())
}

async fn pkg_manifest(
    state: &AppState,
    scope: &str,
    name: &str,
    version: &str,
) -> Result<HttpResponse, ApiErr> {
    let id = state
        .store
        .package_id(scope, name)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "package not found"))?;
    let mj = state
        .store
        .manifest_json(id, version)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "version not found"))?;
    let value: Value = serde_json::from_str(&mj).map_err(internal)?;
    Ok(Json(value).into_response())
}

/// 权威文件清单：该版本归档内除 manifest.json 外的全部文件（按 path 字典序）。
async fn pkg_files(
    state: &AppState,
    scope: &str,
    name: &str,
    version: &str,
) -> Result<HttpResponse, ApiErr> {
    let id = state
        .store
        .package_id(scope, name)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "package not found"))?;
    // version_files 为空无法区分“版本不存在”与“版本无文件”，故先验版本存在性。
    if state.store.manifest_json(id, version).await.map_err(internal)?.is_none() {
        return Err(ejson(StatusCode::NOT_FOUND, "version not found"));
    }
    let files = state.store.version_files(id, version).await.map_err(internal)?;
    let files: Vec<Value> = files
        .iter()
        .map(|(path, sha256, size)| json!({ "path": path, "size": size, "sha256": sha256 }))
        .collect();
    Ok(Json(json!({
        "scope": scope,
        "name": name,
        "version": version,
        "files": files,
    }))
    .into_response())
}

async fn dist_file(
    state: &AppState,
    scope: &str,
    name: &str,
    version: &str,
    path: &str,
) -> Result<HttpResponse, ApiErr> {
    serve_pkg_file(state, scope, name, version, &format!("dist/{path}")).await
}

async fn source_file(
    state: &AppState,
    scope: &str,
    name: &str,
    version: &str,
    path: &str,
) -> Result<HttpResponse, ApiErr> {
    serve_pkg_file(state, scope, name, version, &format!("source/{path}")).await
}

/// 声明文件（包内 `types/`，与 `dist/` 同级）。
async fn types_file(
    state: &AppState,
    scope: &str,
    name: &str,
    version: &str,
    path: &str,
) -> Result<HttpResponse, ApiErr> {
    serve_pkg_file(state, scope, name, version, &format!("types/{path}")).await
}

/// 按归档内精确 path 分发文件（dist/、source/、types/ 前缀已含于 wanted）。
async fn serve_pkg_file(
    state: &AppState,
    scope: &str,
    name: &str,
    version: &str,
    wanted: &str,
) -> Result<HttpResponse, ApiErr> {
    let id = state
        .store
        .package_id(scope, name)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "package not found"))?;
    let files = state.store.version_files(id, version).await.map_err(internal)?;
    let hit = files
        .iter()
        .find(|(p, _, _)| p == wanted)
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "file not found"))?;
    let blob = std::fs::read(state.store.blob_path(&hit.1)).map_err(internal)?;
    let content_type = match wanted.rsplit('.').next() {
        Some("mjs") | Some("js") => "text/javascript",
        Some("css") => "text/css",
        Some("json") => "application/json",
        Some("map") => "application/json",
        _ => "application/octet-stream",
    };
    // builder 定义在 http::Response<()> 上，须以 () 类型路径调用
    axum::http::Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, HeaderValue::from_static(content_type))
        .header(CACHE_CONTROL, HeaderValue::from_static("public, max-age=31536000, immutable"))
        .body(Body::from(blob))
        .map_err(internal)
}

#[cfg(test)]
mod tests {
    use super::{parse_pkg_path, PkgTarget};

    #[test]
    fn parse_detail() {
        assert_eq!(
            parse_pkg_path("@dp_ui/button"),
            Some(PkgTarget::Detail { scope: "@dp_ui".into(), name: "button".into() })
        );
    }

    #[test]
    fn parse_manifest() {
        assert_eq!(
            parse_pkg_path("@dp_ui/button@0.1.0/manifest.json"),
            Some(PkgTarget::Manifest {
                scope: "@dp_ui".into(),
                name: "button".into(),
                version: "0.1.0".into()
            })
        );
    }

    #[test]
    fn parse_files() {
        assert_eq!(
            parse_pkg_path("@dp_ui/button@0.1.0/files.json"),
            Some(PkgTarget::Files {
                scope: "@dp_ui".into(),
                name: "button".into(),
                version: "0.1.0".into()
            })
        );
        // files.json 不得抢走 manifest.json 分支
        assert_eq!(
            parse_pkg_path("@dp_ui/button@0.1.0/manifest.json"),
            Some(PkgTarget::Manifest {
                scope: "@dp_ui".into(),
                name: "button".into(),
                version: "0.1.0".into()
            })
        );
        // 无版本 → None
        assert_eq!(parse_pkg_path("@dp_ui/button/files.json"), None);
    }

    #[test]
    fn parse_dist() {
        assert_eq!(
            parse_pkg_path("@dp_ui/button@0.1.0/dist/button.mjs"),
            Some(PkgTarget::Dist {
                scope: "@dp_ui".into(),
                name: "button".into(),
                version: "0.1.0".into(),
                path: "button.mjs".into()
            })
        );
    }

    #[test]
    fn parse_dist_nested() {
        assert_eq!(
            parse_pkg_path("@a/b@1.0.0/dist/deep/thing.css"),
            Some(PkgTarget::Dist {
                scope: "@a".into(),
                name: "b".into(),
                version: "1.0.0".into(),
                path: "deep/thing.css".into()
            })
        );
    }

    #[test]
    fn parse_source() {
        assert_eq!(
            parse_pkg_path("@dp_ui/button@0.1.0/source/src/ui/button/Button.vue"),
            Some(PkgTarget::Source {
                scope: "@dp_ui".into(),
                name: "button".into(),
                version: "0.1.0".into(),
                path: "src/ui/button/Button.vue".into()
            })
        );
    }

    #[test]
    fn parse_types() {
        assert_eq!(
            parse_pkg_path("@dp_ui/button@0.1.0/types/ui/button/button.d.ts"),
            Some(PkgTarget::Types {
                scope: "@dp_ui".into(),
                name: "button".into(),
                version: "0.1.0".into(),
                path: "ui/button/button.d.ts".into()
            })
        );
        // 缺子路径 → None（与 dist/source 同规则）
        assert_eq!(parse_pkg_path("@dp_ui/button@0.1.0/types"), None);
    }

    #[test]
    fn parse_source_rejects() {
        // segs[2] != "source"（近似段）或缺少子路径 → None
        assert_eq!(parse_pkg_path("@dp_ui/button@0.1.0/sourc/x.vue"), None);
        assert_eq!(parse_pkg_path("@dp_ui/button@0.1.0/source"), None);
    }

    #[test]
    fn parse_rejects() {
        assert_eq!(parse_pkg_path("index.json"), None);
        assert_eq!(parse_pkg_path("plain/name"), None);
        assert_eq!(parse_pkg_path("@dp_ui/button@0.1.0"), None); // version 需带子路径
        assert_eq!(parse_pkg_path("@dp_ui/button/extra"), None);
    }
}
