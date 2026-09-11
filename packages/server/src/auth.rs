//! 账号 / 发布令牌 / 会话 与权限判定。
//!
//! 权限模型（token.permissions 为 JSON 字符串数组）：
//! - `publish`        可发布任意 scope
//! - `publish:@scope` 仅可发布该 scope
//! - `admin`          允许管理用户/令牌；同时视为有全部 publish 权限
//! - `read`           语义占位（读接口本就公开，校验时忽略）
//!
//! `HUB_PUBLISH_TOKEN`（env）为 root 令牌，等价 `admin`，不入库。

use std::sync::Arc;

use argon2::password_hash::{rand_core::OsRng, SaltString};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use axum::{
    extract::{Path, State},
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::api::{ejson, internal, ApiErr, AppState};
use crate::store::unix_now;

/// 会话有效期：72 小时。
pub const SESSION_TTL_SECS: i64 = 72 * 3600;

// ---------- 基础工具 ----------

pub fn hash_password(password: &str) -> Result<String, ApiErr> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| internal(format!("hash password failed: {e}")))
}

pub fn verify_password(hash: &str, password: &str) -> bool {
    match PasswordHash::new(hash) {
        Ok(parsed) => Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok(),
        Err(_) => false,
    }
}

pub fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hasher.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

fn rand_hex(bytes: usize) -> String {
    use rand::RngCore;
    let mut buf = vec![0u8; bytes];
    rand::thread_rng().fill_bytes(&mut buf);
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

pub fn new_publish_token() -> String {
    rand_hex(20)
}

pub fn new_session_token() -> String {
    rand_hex(20)
}

pub fn bearer<'a>(headers: &'a HeaderMap) -> Option<&'a str> {
    headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(str::trim)
        .filter(|s| !s.is_empty())
}

/// 权限串合法性：`publish` | `read` | `admin` | `publish:@scope`
pub fn valid_permission(p: &str) -> bool {
    match p {
        "publish" | "read" | "admin" => true,
        _ => match p.strip_prefix("publish:") {
            Some(scope) => {
                scope.starts_with('@')
                    && scope.len() > 1
                    && !scope.contains(char::is_whitespace)
                    && !scope[1..].contains('/')
            }
            None => false,
        },
    }
}

/// 该权限集能否发布 `scope` 的包。
pub fn can_publish(permissions: &[String], scope: &str) -> bool {
    permissions.iter().any(|p| {
        p == "admin" || p == "publish" || p.as_str() == format!("publish:{scope}")
    })
}

fn string_list(raw: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(raw).unwrap_or_default()
}

// ---------- 会话 ----------

#[derive(Debug, Clone)]
pub struct SessionUser {
    pub id: i64,
    pub username: String,
    pub role: String,
}

async fn issue_session(
    state: &AppState,
    user_id: i64,
    username: &str,
    role: &str,
) -> Result<(String, i64), ApiErr> {
    let plain = new_session_token();
    let now = unix_now();
    let expires_at = now + SESSION_TTL_SECS;
    state
        .store
        .create_session(user_id, &sha256_hex(&plain), now, expires_at)
        .await
        .map_err(internal)?;
    let _ = (username, role);
    Ok((plain, expires_at))
}

pub async fn require_session(state: &AppState, headers: &HeaderMap) -> Result<SessionUser, ApiErr> {
    let token = bearer(headers).ok_or_else(|| ejson(StatusCode::UNAUTHORIZED, "missing session token"))?;
    let hash = sha256_hex(token);
    let row = state
        .store
        .session_by_hash(&hash)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::UNAUTHORIZED, "invalid session"))?;
    if row.expires_at.parse::<i64>().unwrap_or(0) < unix_now() {
        state.store.delete_session(&hash).await.map_err(internal)?;
        return Err(ejson(StatusCode::UNAUTHORIZED, "session expired"));
    }
    Ok(SessionUser { id: row.user_id, username: row.username, role: row.role })
}

pub(crate) async fn require_admin(state: &AppState, headers: &HeaderMap) -> Result<SessionUser, ApiErr> {
    let user = require_session(state, headers).await?;
    if user.role != "admin" {
        return Err(ejson(StatusCode::FORBIDDEN, "admin required"));
    }
    Ok(user)
}

// ---------- 发布鉴权（供 publish.rs 调用） ----------

/// 校验发布身份；返回发布者标识（日志用）。
///
/// 顺序：root 令牌（env）→ 会话（仅 admin，视同全 scope publish 权限）→ tokens 表发布令牌。
pub async fn authorize_publish(
    state: &AppState,
    headers: &HeaderMap,
    scope: &str,
) -> Result<String, ApiErr> {
    let token = bearer(headers).ok_or_else(|| ejson(StatusCode::UNAUTHORIZED, "invalid publish token"))?;
    if token == state.root_token.as_str() {
        return Ok("root".to_string());
    }
    let hash = sha256_hex(token);
    // 会话令牌：admin 视为有全部 publish 权限；非 admin 会话无发布权。
    if let Some(session) = state.store.session_by_hash(&hash).await.map_err(internal)? {
        if session.expires_at.parse::<i64>().unwrap_or(0) < unix_now() {
            state.store.delete_session(&hash).await.map_err(internal)?;
        } else if session.role == "admin" {
            return Ok(format!("session#{}", session.user_id));
        } else {
            return Err(ejson(
                StatusCode::FORBIDDEN,
                format!("token lacks publish permission for {scope}"),
            ));
        }
    }
    let auth = state
        .store
        .token_auth_by_hash(&hash)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::UNAUTHORIZED, "invalid publish token"))?;
    let permissions = string_list(&auth.permissions);
    if !can_publish(&permissions, scope) {
        return Err(ejson(
            StatusCode::FORBIDDEN,
            format!("token lacks publish permission for {scope}"),
        ));
    }
    state.store.touch_token(auth.id, unix_now()).await.map_err(internal)?;
    Ok(format!("token#{}", auth.id))
}

// ---------- 请求体与校验 ----------

#[derive(Deserialize)]
pub struct Credentials {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct NewUser {
    pub username: String,
    pub password: String,
    pub role: String,
}

#[derive(Deserialize)]
pub struct PatchUser {
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub password: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewToken {
    pub name: String,
    pub permissions: Vec<String>,
    #[serde(default)]
    pub user_id: Option<i64>,
}

#[derive(Deserialize)]
pub struct PatchToken {
    pub enabled: bool,
}

fn validate_username(username: &str) -> Result<(), ApiErr> {
    let u = username.trim();
    if u.is_empty() || u.len() > 64 || u.contains(char::is_whitespace) {
        return Err(ejson(StatusCode::BAD_REQUEST, "invalid username"));
    }
    Ok(())
}

fn validate_password(password: &str) -> Result<(), ApiErr> {
    if password.len() < 6 {
        return Err(ejson(StatusCode::BAD_REQUEST, "password must be at least 6 characters"));
    }
    Ok(())
}

fn validate_role(role: &str) -> Result<(), ApiErr> {
    if role != "admin" && role != "publisher" {
        return Err(ejson(StatusCode::BAD_REQUEST, "role must be admin or publisher"));
    }
    Ok(())
}

fn user_json(id: i64, username: &str, role: &str) -> Value {
    json!({ "id": id, "username": username, "role": role })
}

// ---------- 认证端点 ----------

/// GET /api/auth/status → 是否需要初始化（users 为空）
pub async fn auth_status(State(state): State<Arc<AppState>>) -> Result<impl IntoResponse, ApiErr> {
    let count = state.store.count_users().await.map_err(internal)?;
    Ok(Json(json!({ "needsSetup": count == 0 })))
}

/// POST /api/setup → 首次初始化管理员（仅 users 为空时可用）
pub async fn setup(
    State(state): State<Arc<AppState>>,
    Json(req): Json<Credentials>,
) -> Result<impl IntoResponse, ApiErr> {
    if state.store.count_users().await.map_err(internal)? > 0 {
        return Err(ejson(StatusCode::FORBIDDEN, "already initialized"));
    }
    validate_username(&req.username)?;
    validate_password(&req.password)?;
    let hash = hash_password(&req.password)?;
    let id = state
        .store
        .create_user(req.username.trim(), &hash, "admin", unix_now())
        .await
        .map_err(internal)?;
    let (session, expires_at) = issue_session(&state, id, &req.username, "admin").await?;
    Ok((
        StatusCode::CREATED,
        Json(json!({
            "sessionToken": session,
            "expiresAt": expires_at.to_string(),
            "user": user_json(id, req.username.trim(), "admin"),
        })),
    ))
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<Credentials>,
) -> Result<impl IntoResponse, ApiErr> {
    let found = state.store.user_credentials(req.username.trim()).await.map_err(internal)?;
    let (id, _hash, role) = match found {
        Some(v) if verify_password(&v.1, &req.password) => v,
        _ => return Err(ejson(StatusCode::UNAUTHORIZED, "invalid credentials")),
    };
    let (session, expires_at) = issue_session(&state, id, &req.username, &role).await?;
    Ok(Json(json!({
        "sessionToken": session,
        "expiresAt": expires_at.to_string(),
        "user": user_json(id, req.username.trim(), &role),
    })))
}

/// POST /api/auth/logout
pub async fn logout(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, ApiErr> {
    if let Some(token) = bearer(&headers) {
        state.store.delete_session(&sha256_hex(token)).await.map_err(internal)?;
    }
    Ok(Json(json!({ "ok": true })))
}

/// GET /api/auth/me
pub async fn me(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, ApiErr> {
    let user = require_session(&state, &headers).await?;
    let permissions = state.store.permissions_of_user(user.id).await.map_err(internal)?;
    Ok(Json(json!({
        "user": user_json(user.id, &user.username, &user.role),
        "permissions": permissions,
    })))
}

// ---------- 用户管理（admin） ----------

/// GET /api/users
pub async fn list_users(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, ApiErr> {
    require_admin(&state, &headers).await?;
    let users = state.store.list_users().await.map_err(internal)?;
    let arr: Vec<Value> = users
        .iter()
        .map(|u| {
            json!({
                "id": u.id,
                "username": u.username,
                "role": u.role,
                "createdAt": u.created_at,
                "tokenCount": u.token_count,
            })
        })
        .collect();
    Ok(Json(json!({ "users": arr })))
}

/// POST /api/users
pub async fn create_user(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<NewUser>,
) -> Result<impl IntoResponse, ApiErr> {
    require_admin(&state, &headers).await?;
    validate_username(&req.username)?;
    validate_password(&req.password)?;
    validate_role(&req.role)?;
    if state.store.username_exists(req.username.trim()).await.map_err(internal)? {
        return Err(ejson(StatusCode::CONFLICT, "username exists"));
    }
    let hash = hash_password(&req.password)?;
    let id = state
        .store
        .create_user(req.username.trim(), &hash, &req.role, unix_now())
        .await
        .map_err(internal)?;
    Ok((StatusCode::CREATED, Json(user_json(id, req.username.trim(), &req.role))))
}

/// PATCH /api/users/{id}
pub async fn patch_user(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(req): Json<PatchUser>,
) -> Result<impl IntoResponse, ApiErr> {
    require_admin(&state, &headers).await?;
    if !state.store.user_exists(id).await.map_err(internal)? {
        return Err(ejson(StatusCode::NOT_FOUND, "user not found"));
    }
    if let Some(role) = &req.role {
        validate_role(role)?;
        if role != "admin" && state.store.count_admins().await.map_err(internal)? <= 1 {
            return Err(ejson(StatusCode::BAD_REQUEST, "last admin cannot be demoted"));
        }
        state.store.update_user_role(id, role).await.map_err(internal)?;
    }
    if let Some(password) = &req.password {
        validate_password(password)?;
        let hash = hash_password(password)?;
        state.store.update_user_password(id, &hash).await.map_err(internal)?;
    }
    let users = state.store.list_users().await.map_err(internal)?;
    let u = users.iter().find(|u| u.id == id);
    match u {
        Some(u) => Ok(Json(json!({
            "id": u.id, "username": u.username, "role": u.role,
            "createdAt": u.created_at, "tokenCount": u.token_count,
        }))),
        None => Err(ejson(StatusCode::NOT_FOUND, "user not found")),
    }
}

/// DELETE /api/users/{id}
pub async fn delete_user(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, ApiErr> {
    let admin = require_admin(&state, &headers).await?;
    if admin.id == id {
        return Err(ejson(StatusCode::BAD_REQUEST, "cannot delete self"));
    }
    if !state.store.user_exists(id).await.map_err(internal)? {
        return Err(ejson(StatusCode::NOT_FOUND, "user not found"));
    }
    state.store.delete_user(id).await.map_err(internal)?;
    Ok(Json(json!({ "ok": true })))
}

// ---------- 令牌管理 ----------

/// GET /api/tokens（admin 可 ?userId=）
pub async fn list_tokens(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    axum::extract::Query(q): axum::extract::Query<TokenQuery>,
) -> Result<impl IntoResponse, ApiErr> {
    let user = require_session(&state, &headers).await?;
    let filter = if user.role == "admin" { q.user_id } else { Some(user.id) };
    let tokens = state.store.list_tokens(filter).await.map_err(internal)?;
    let arr: Vec<Value> = tokens
        .iter()
        .map(|t| {
            json!({
                "id": t.id,
                "name": t.name,
                "permissions": string_list(&t.permissions),
                "userId": t.user_id,
                "username": t.username,
                "createdAt": t.created_at,
                "lastUsedAt": t.last_used_at,
                "revokedAt": t.revoked_at,
            })
        })
        .collect();
    Ok(Json(json!({ "tokens": arr })))
}

#[derive(Deserialize)]
pub struct TokenQuery {
    #[serde(default, rename = "userId")]
    pub user_id: Option<i64>,
}

/// POST /api/tokens → 明文仅此一次返回
pub async fn create_token(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<NewToken>,
) -> Result<impl IntoResponse, ApiErr> {
    let user = require_session(&state, &headers).await?;
    let name = req.name.trim();
    if name.is_empty() || name.len() > 64 {
        return Err(ejson(StatusCode::BAD_REQUEST, "invalid token name"));
    }
    if req.permissions.is_empty() {
        return Err(ejson(StatusCode::BAD_REQUEST, "permissions must not be empty"));
    }
    for p in &req.permissions {
        if !valid_permission(p) {
            return Err(ejson(StatusCode::BAD_REQUEST, format!("invalid permission: {p}")));
        }
    }
    if user.role != "admin" && req.permissions.iter().any(|p| p == "admin") {
        return Err(ejson(StatusCode::FORBIDDEN, "only admin can grant admin permission"));
    }
    let owner_id = match req.user_id {
        Some(target) if target != user.id => {
            if user.role != "admin" {
                return Err(ejson(StatusCode::FORBIDDEN, "only admin can create tokens for others"));
            }
            if !state.store.user_exists(target).await.map_err(internal)? {
                return Err(ejson(StatusCode::NOT_FOUND, "user not found"));
            }
            target
        }
        _ => user.id,
    };

    let plain = new_publish_token();
    let permissions = serde_json::to_string(&req.permissions).map_err(internal)?;
    let now = unix_now();
    let id = state
        .store
        .insert_token(owner_id, name, &sha256_hex(&plain), &permissions, now)
        .await
        .map_err(internal)?;
    Ok((
        StatusCode::CREATED,
        Json(json!({
            "token": plain,
            "id": id,
            "name": name,
            "permissions": req.permissions,
            "userId": owner_id,
            "createdAt": now.to_string(),
        })),
    ))
}

/// PATCH /api/tokens/{id} → 启用/停用（admin 或令牌所有者）
pub async fn patch_token(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(req): Json<PatchToken>,
) -> Result<impl IntoResponse, ApiErr> {
    let user = require_session(&state, &headers).await?;
    let owner = state
        .store
        .token_owner(id)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "token not found"))?;
    if user.role != "admin" && owner != user.id {
        return Err(ejson(StatusCode::FORBIDDEN, "not token owner"));
    }
    if !state.store.set_token_enabled(id, req.enabled).await.map_err(internal)? {
        return Err(ejson(StatusCode::NOT_FOUND, "token not found"));
    }
    Ok(Json(json!({ "ok": true, "enabled": req.enabled })))
}

/// DELETE /api/tokens/{id} → 删除（admin 或令牌所有者）
pub async fn delete_token(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, ApiErr> {
    let user = require_session(&state, &headers).await?;
    let owner = state
        .store
        .token_owner(id)
        .await
        .map_err(internal)?
        .ok_or_else(|| ejson(StatusCode::NOT_FOUND, "token not found"))?;
    if user.role != "admin" && owner != user.id {
        return Err(ejson(StatusCode::FORBIDDEN, "not token owner"));
    }
    if !state.store.delete_token(id).await.map_err(internal)? {
        return Err(ejson(StatusCode::NOT_FOUND, "token not found"));
    }
    Ok(Json(json!({ "ok": true })))
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

    use super::*;
    use crate::{api, store::Store};

    const ROOT_TOKEN: &str = "root-token";

    async fn make_app() -> (Router, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::init(dir.path()).await.unwrap();
        (api::app(store, ROOT_TOKEN.into()), dir)
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
        let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap();
        let v: Value = if bytes.is_empty() {
            Value::Null
        } else {
            serde_json::from_slice(&bytes).unwrap_or(Value::Null)
        };
        (status, v)
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

    /// 构造某 scoped 包的合法发布归档。
    fn publish_body(name: &str, version: &str) -> Vec<u8> {
        let manifest = format!(
            r#"{{"name":"{name}","version":"{version}","type":"vue-component",
                 "entry":{{"module":"dist/x.mjs","css":[]}},"cssStrategy":"vanilla"}}"#
        );
        make_tar(&[
            ("manifest.json", manifest.as_bytes()),
            ("dist/x.mjs", b"export default {}"),
        ])
    }

    async fn publish(app: &Router, body: Vec<u8>, bearer: Option<&str>) -> StatusCode {
        let mut builder = Request::post("/api/publish").header("content-type", "application/octet-stream");
        if let Some(t) = bearer {
            builder = builder.header(AUTHORIZATION, format!("Bearer {t}"));
        }
        app.clone()
            .oneshot(builder.body(Body::from(body)).unwrap())
            .await
            .unwrap()
            .status()
    }

    #[tokio::test]
    async fn setup_login_and_status() {
        let (app, _dir) = make_app().await;
        let (st, v) = call(&app, "GET", "/api/auth/status", None, None).await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(v["needsSetup"], true);

        let session = setup_admin(&app).await;

        let (_st, v) = call(&app, "GET", "/api/auth/status", None, None).await;
        assert_eq!(v["needsSetup"], false);

        // 二次 setup 拒绝
        let (st, _) = call(
            &app,
            "POST",
            "/api/setup",
            Some(json!({ "username": "x", "password": "secret1" })),
            None,
        )
        .await;
        assert_eq!(st, StatusCode::FORBIDDEN);

        // 登录成功 / 失败
        let (st, v) = call(
            &app,
            "POST",
            "/api/auth/login",
            Some(json!({ "username": "root", "password": "secret1" })),
            None,
        )
        .await;
        assert_eq!(st, StatusCode::OK, "{v}");
        assert_eq!(v["sessionToken"].as_str().unwrap().len(), 40);
        assert!(v["sessionToken"].as_str().unwrap().chars().all(|c| c.is_ascii_hexdigit()));
        let (st, _) = call(
            &app,
            "POST",
            "/api/auth/login",
            Some(json!({ "username": "root", "password": "wrong" })),
            None,
        )
        .await;
        assert_eq!(st, StatusCode::UNAUTHORIZED);

        // me / logout
        let (st, v) = call(&app, "GET", "/api/auth/me", None, Some(&session)).await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(v["user"]["username"], "root");
        assert_eq!(v["user"]["role"], "admin");
        let (st, _) = call(&app, "POST", "/api/auth/logout", None, Some(&session)).await;
        assert_eq!(st, StatusCode::OK);
        let (st, _) = call(&app, "GET", "/api/auth/me", None, Some(&session)).await;
        assert_eq!(st, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn user_management_guards() {
        let (app, _dir) = make_app().await;
        let admin = setup_admin(&app).await;

        // 新建 publisher
        let (st, v) = call(
            &app,
            "POST",
            "/api/users",
            Some(json!({ "username": "dev", "password": "secret1", "role": "publisher" })),
            Some(&admin),
        )
        .await;
        assert_eq!(st, StatusCode::CREATED, "{v}");
        let dev_id = v["id"].as_i64().unwrap();
        // 重名冲突
        let (st, _) = call(
            &app,
            "POST",
            "/api/users",
            Some(json!({ "username": "dev", "password": "secret1", "role": "publisher" })),
            Some(&admin),
        )
        .await;
        assert_eq!(st, StatusCode::CONFLICT);

        // publisher 无权列出用户
        let (_, v) = call(
            &app,
            "POST",
            "/api/auth/login",
            Some(json!({ "username": "dev", "password": "secret1" })),
            None,
        )
        .await;
        let dev_session = v["sessionToken"].as_str().unwrap().to_string();
        let (st, _) = call(&app, "GET", "/api/users", None, Some(&dev_session)).await;
        assert_eq!(st, StatusCode::FORBIDDEN);

        // 最后一个 admin 不可降级
        let (st, v) = call(&app, "GET", "/api/users", None, Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
        let root_id = v["users"].as_array().unwrap()[0]["id"].as_i64().unwrap();
        let (st, _) = call(
            &app,
            "PATCH",
            &format!("/api/users/{root_id}"),
            Some(json!({ "role": "publisher" })),
            Some(&admin),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);

        // 不可删除自己；可删除他人
        let (st, _) = call(
            &app,
            "DELETE",
            &format!("/api/users/{root_id}"),
            None,
            Some(&admin),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);
        let (st, _) = call(
            &app,
            "DELETE",
            &format!("/api/users/{dev_id}"),
            None,
            Some(&admin),
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        let (_, v) = call(&app, "GET", "/api/users", None, Some(&admin)).await;
        assert_eq!(v["users"].as_array().unwrap().len(), 1);
    }

    #[tokio::test]
    async fn token_permission_matrix_and_publish() {
        let (app, _dir) = make_app().await;
        let admin = setup_admin(&app).await;

        // 建三个令牌：scoped publish / 全量 publish / 只读
        let mut tokens = Vec::new();
        for perms in [json!(["publish:@dp_ui"]), json!(["publish"]), json!(["read"])] {
            let (st, v) = call(
                &app,
                "POST",
                "/api/tokens",
                Some(json!({ "name": "t", "permissions": perms })),
                Some(&admin),
            )
            .await;
            assert_eq!(st, StatusCode::CREATED, "{v}");
            assert_eq!(v["token"].as_str().unwrap().len(), 40);
            assert!(v["token"].as_str().unwrap().chars().all(|c| c.is_ascii_hexdigit()));
            tokens.push(v["token"].as_str().unwrap().to_string());
        }

        // scoped：同 scope 通过
        assert_eq!(
            publish(&app, publish_body("@dp_ui/button", "0.1.0"), Some(&tokens[0])).await,
            StatusCode::CREATED
        );
        // scoped：别的 scope 拒绝
        let (st, v) = {
            let mut b =
                Request::post("/api/publish").header("content-type", "application/octet-stream");
            b = b.header(AUTHORIZATION, format!("Bearer {}", tokens[0]));
            let resp = app
                .clone()
                .oneshot(b.body(Body::from(publish_body("@other/x", "0.1.0"))).unwrap())
                .await
                .unwrap();
            let st = resp.status();
            let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap();
            (st, serde_json::from_slice::<Value>(&bytes).unwrap_or(Value::Null))
        };
        assert_eq!(st, StatusCode::FORBIDDEN);
        assert!(v["error"].as_str().unwrap().contains("publish permission"));

        // 全量 publish：任意 scope 通过
        assert_eq!(
            publish(&app, publish_body("@other/x", "0.1.0"), Some(&tokens[1])).await,
            StatusCode::CREATED
        );
        // 只读令牌不能发布
        assert_eq!(
            publish(&app, publish_body("@dp_ui/button", "0.2.0"), Some(&tokens[2])).await,
            StatusCode::FORBIDDEN
        );
        // root 令牌（env）通过
        assert_eq!(
            publish(&app, publish_body("@dp_ui/button", "0.2.0"), Some(ROOT_TOKEN)).await,
            StatusCode::CREATED
        );
        // 伪造令牌
        assert_eq!(
            publish(&app, publish_body("@dp_ui/button", "0.3.0"), Some("dpui_deadbeef")).await,
            StatusCode::UNAUTHORIZED
        );
        // 无令牌
        assert_eq!(publish(&app, publish_body("@dp_ui/button", "0.3.0"), None).await, StatusCode::UNAUTHORIZED);

        // 列表：明文不落库，字段齐全
        let (st, v) = call(&app, "GET", "/api/tokens", None, Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
        let arr = v["tokens"].as_array().unwrap();
        assert_eq!(arr.len(), 3);
        for t in arr {
            assert!(t.get("token").is_none());
            assert!(t["permissions"].is_array());
        }
        // 令牌使用后写入 lastUsedAt
        let scoped_id = arr
            .iter()
            .find(|t| t["permissions"] == json!(["publish:@dp_ui"]))
            .unwrap()["id"]
            .as_i64()
            .unwrap();
        assert!(arr.iter().any(|t| t["id"] == scoped_id && t["lastUsedAt"].is_string()));

        // 停用后立即失效
        let (st, _) = call(
            &app,
            "PATCH",
            &format!("/api/tokens/{scoped_id}"),
            Some(json!({ "enabled": false })),
            Some(&admin),
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(
            publish(&app, publish_body("@dp_ui/button", "0.4.0"), Some(&tokens[0])).await,
            StatusCode::UNAUTHORIZED
        );
        // 启用后恢复可用
        let (st, _) = call(
            &app,
            "PATCH",
            &format!("/api/tokens/{scoped_id}"),
            Some(json!({ "enabled": true })),
            Some(&admin),
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(
            publish(&app, publish_body("@dp_ui/button", "0.4.0"), Some(&tokens[0])).await,
            StatusCode::CREATED
        );
        // 删除后永久失效
        let (st, _) = call(&app, "DELETE", &format!("/api/tokens/{scoped_id}"), None, Some(&admin)).await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(
            publish(&app, publish_body("@dp_ui/button", "0.5.0"), Some(&tokens[0])).await,
            StatusCode::UNAUTHORIZED
        );
    }

    #[tokio::test]
    async fn token_creation_guards() {
        let (app, _dir) = make_app().await;
        let admin = setup_admin(&app).await;
        let (_, v) = call(
            &app,
            "POST",
            "/api/users",
            Some(json!({ "username": "dev", "password": "secret1", "role": "publisher" })),
            Some(&admin),
        )
        .await;
        let dev_id = v["id"].as_i64().unwrap();
        let (_, v) = call(
            &app,
            "POST",
            "/api/auth/login",
            Some(json!({ "username": "dev", "password": "secret1" })),
            None,
        )
        .await;
        let dev = v["sessionToken"].as_str().unwrap().to_string();

        // publisher 不得创建含 admin 的令牌
        let (st, _) = call(
            &app,
            "POST",
            "/api/tokens",
            Some(json!({ "name": "t", "permissions": ["admin"] })),
            Some(&dev),
        )
        .await;
        assert_eq!(st, StatusCode::FORBIDDEN);
        // publisher 不得为他人创建
        let (st, _) = call(
            &app,
            "POST",
            "/api/tokens",
            Some(json!({ "name": "t", "permissions": ["publish"], "userId": dev_id + 1 })),
            Some(&dev),
        )
        .await;
        assert_eq!(st, StatusCode::FORBIDDEN);
        // 非法权限 / 空权限
        let (st, _) = call(
            &app,
            "POST",
            "/api/tokens",
            Some(json!({ "name": "t", "permissions": ["publish:nope"] })),
            Some(&dev),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);
        let (st, _) = call(
            &app,
            "POST",
            "/api/tokens",
            Some(json!({ "name": "t", "permissions": [] })),
            Some(&dev),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);
        // publisher 只能看到自己的令牌
        let (_st, _v) = call(
            &app,
            "POST",
            "/api/tokens",
            Some(json!({ "name": "dev-token", "permissions": ["publish:@dev"] })),
            Some(&dev),
        )
        .await;
        let (_, v) = call(&app, "GET", "/api/tokens", None, Some(&dev)).await;
        let arr = v["tokens"].as_array().unwrap();
        assert_eq!(arr.len(), 1);
        assert_eq!(arr[0]["userId"], dev_id);
        // admin 代他人创建
        let (st, _) = call(
            &app,
            "POST",
            "/api/tokens",
            Some(json!({ "name": "for-dev", "permissions": ["publish"], "userId": dev_id })),
            Some(&admin),
        )
        .await;
        assert_eq!(st, StatusCode::CREATED);
        let (_, v) = call(&app, "GET", &format!("/api/tokens?userId={dev_id}"), None, Some(&admin)).await;
        assert_eq!(v["tokens"].as_array().unwrap().len(), 2);
    }

    #[tokio::test]
    async fn role_change_invalidates_sessions() {
        let (app, _dir) = make_app().await;
        let admin = setup_admin(&app).await;
        let (_, v) = call(
            &app,
            "POST",
            "/api/users",
            Some(json!({ "username": "dev", "password": "secret1", "role": "publisher" })),
            Some(&admin),
        )
        .await;
        let dev_id = v["id"].as_i64().unwrap();
        let (_, v) = call(
            &app,
            "POST",
            "/api/auth/login",
            Some(json!({ "username": "dev", "password": "secret1" })),
            None,
        )
        .await;
        let dev = v["sessionToken"].as_str().unwrap().to_string();
        assert_eq!(call(&app, "GET", "/api/auth/me", None, Some(&dev)).await.0, StatusCode::OK);
        // 改密后旧会话失效
        let (st, _) = call(
            &app,
            "PATCH",
            &format!("/api/users/{dev_id}"),
            Some(json!({ "password": "secret2" })),
            Some(&admin),
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        assert_eq!(
            call(&app, "GET", "/api/auth/me", None, Some(&dev)).await.0,
            StatusCode::UNAUTHORIZED
        );
        let (st, _) = call(
            &app,
            "POST",
            "/api/auth/login",
            Some(json!({ "username": "dev", "password": "secret2" })),
            None,
        )
        .await;
        assert_eq!(st, StatusCode::OK);
    }

    #[test]
    fn permission_helpers() {
        assert!(valid_permission("publish"));
        assert!(valid_permission("publish:@dp_ui"));
        assert!(valid_permission("read"));
        assert!(valid_permission("admin"));
        assert!(!valid_permission("publish:dp_ui"));
        assert!(!valid_permission("publish:"));
        assert!(!valid_permission("publish:@a/b"));
        assert!(!valid_permission("write"));

        let perms = vec!["publish:@dp_ui".to_string()];
        assert!(can_publish(&perms, "@dp_ui"));
        assert!(!can_publish(&perms, "@other"));
        assert!(can_publish(&vec!["publish".to_string()], "@anything"));
        assert!(can_publish(&vec!["admin".to_string()], "@anything"));
        assert!(!can_publish(&vec!["read".to_string()], "@dp_ui"));

        let hash = hash_password("secret1").unwrap();
        assert!(hash.starts_with("$argon2"));
        assert!(verify_password(&hash, "secret1"));
        assert!(!verify_password(&hash, "secret2"));
        assert!(!verify_password("not-a-hash", "secret1"));
        assert_eq!(sha256_hex("abc").len(), 64);
        assert_ne!(new_publish_token(), new_publish_token());
    }

    #[tokio::test]
    async fn store_admin_counts() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::init(dir.path()).await.unwrap();
        assert_eq!(store.count_users().await.unwrap(), 0);
        let id = store.create_user("a", "h", "admin", 1).await.unwrap();
        store.create_user("b", "h", "publisher", 1).await.unwrap();
        assert_eq!(store.count_users().await.unwrap(), 2);
        assert_eq!(store.count_admins().await.unwrap(), 1);
        assert!(store.username_exists("a").await.unwrap());
        assert!(!store.username_exists("zzz").await.unwrap());
        assert_eq!(store.user_credentials("a").await.unwrap().unwrap().0, id);
        let users = store.list_users().await.unwrap();
        assert_eq!(users.len(), 2);
    }
}
