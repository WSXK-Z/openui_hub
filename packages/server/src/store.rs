use std::collections::HashSet;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use sqlx::Row;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StoreError {
    #[error("db error: {0}")]
    Db(#[from] sqlx::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

const SCHEMA: [&str; 6] = [
    "CREATE TABLE IF NOT EXISTS packages(
        id INTEGER PRIMARY KEY,
        scope TEXT NOT NULL,
        name TEXT NOT NULL,
        latest_version TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(scope, name))",
    "CREATE TABLE IF NOT EXISTS versions(
        package_id INTEGER NOT NULL REFERENCES packages(id),
        version TEXT NOT NULL,
        manifest_json TEXT NOT NULL,
        checksum TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(package_id, version))",
    "CREATE TABLE IF NOT EXISTS version_files(
        package_id INTEGER NOT NULL,
        version TEXT NOT NULL,
        path TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        size INTEGER NOT NULL,
        PRIMARY KEY(package_id, version, path))",
    "CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS tokens(
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        permissions TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT,
        revoked_at TEXT)",
    "CREATE TABLE IF NOT EXISTS sessions(
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL)",
];

#[derive(Clone)]
pub struct Store {
    pool: SqlitePool,
    blobs_dir: PathBuf,
}

#[derive(Debug, Clone)]
pub struct PackageRow {
    pub scope: String,
    pub name: String,
    pub latest_version: Option<String>,
}

#[derive(Debug, Clone)]
pub struct VersionRow {
    pub version: String,
    pub manifest_json: String,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub struct UserRow {
    pub id: i64,
    pub username: String,
    pub role: String,
    pub created_at: String,
    /// 未吊销令牌数
    pub token_count: i64,
}

#[derive(Debug, Clone)]
pub struct TokenRow {
    pub id: i64,
    pub user_id: i64,
    pub username: String,
    pub name: String,
    /// JSON 字符串数组
    pub permissions: String,
    pub created_at: String,
    pub last_used_at: Option<String>,
    pub revoked_at: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SessionRow {
    pub user_id: i64,
    pub username: String,
    pub role: String,
    pub expires_at: String,
}

/// 按 hash 命中令牌（未吊销）时的信息。
#[derive(Debug, Clone)]
pub struct TokenAuth {
    pub id: i64,
    /// JSON 字符串数组
    pub permissions: String,
}

impl Store {
    /// 初始化：建目录、SQLite（文件 hub.db）、blob 存储目录 blobs/。
    pub async fn init(data_dir: &Path) -> Result<Store, StoreError> {
        std::fs::create_dir_all(data_dir)?;
        let blobs_dir = data_dir.join("blobs");
        std::fs::create_dir_all(&blobs_dir)?;
        let db_path = data_dir.join("hub.db");
        let opts = SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true);
        let pool = SqlitePool::connect_with(opts).await?;
        for stmt in SCHEMA {
            sqlx::query(stmt).execute(&pool).await?;
        }
        Ok(Store { pool, blobs_dir })
    }

    /// 内容寻址写 blob，返回 sha256 hex。
    pub fn save_blob(&self, bytes: &[u8]) -> Result<String, StoreError> {
        let mut hasher = Sha256::new();
        hasher.update(bytes);
        let hex = hasher.finalize().iter().map(|b| format!("{b:02x}")).collect::<String>();
        let path = self.blobs_dir.join(&hex);
        if !path.exists() {
            std::fs::write(&path, bytes)?;
        }
        Ok(hex)
    }

    pub fn blob_path(&self, sha256: &str) -> PathBuf {
        self.blobs_dir.join(sha256)
    }

    pub async fn package_id(&self, scope: &str, name: &str) -> Result<Option<i64>, StoreError> {
        let row = sqlx::query_scalar::<_, i64>("SELECT id FROM packages WHERE scope = ? AND name = ?")
            .bind(scope)
            .bind(name)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row)
    }

    pub async fn ensure_package(&self, scope: &str, name: &str, now: i64) -> Result<i64, StoreError> {
        if let Some(id) = self.package_id(scope, name).await? {
            return Ok(id);
        }
        let res = sqlx::query("INSERT INTO packages (scope, name, latest_version, created_at) VALUES (?, ?, NULL, ?)")
            .bind(scope)
            .bind(name)
            .bind(now.to_string())
            .execute(&self.pool)
            .await?;
        Ok(res.last_insert_rowid())
    }

    pub async fn version_exists(&self, package_id: i64, version: &str) -> Result<bool, StoreError> {
        let row = sqlx::query_scalar::<_, i64>(
            "SELECT 1 FROM versions WHERE package_id = ? AND version = ?",
        )
        .bind(package_id)
        .bind(version)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.is_some())
    }

    pub async fn insert_version(
        &self,
        package_id: i64,
        version: &str,
        manifest_json: &str,
        checksum: &str,
        now: i64,
    ) -> Result<(), StoreError> {
        sqlx::query(
            "INSERT INTO versions (package_id, version, manifest_json, checksum, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(package_id)
        .bind(version)
        .bind(manifest_json)
        .bind(checksum)
        .bind(now.to_string())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn insert_version_file(
        &self,
        package_id: i64,
        version: &str,
        path: &str,
        sha256: &str,
        size: i64,
    ) -> Result<(), StoreError> {
        sqlx::query(
            "INSERT INTO version_files (package_id, version, path, sha256, size) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(package_id)
        .bind(version)
        .bind(path)
        .bind(sha256)
        .bind(size)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn set_latest(&self, package_id: i64, version: &str) -> Result<(), StoreError> {
        sqlx::query("UPDATE packages SET latest_version = ? WHERE id = ?")
            .bind(version)
            .bind(package_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn latest_version(&self, package_id: i64) -> Result<Option<String>, StoreError> {
        let row = sqlx::query_scalar::<_, Option<String>>(
            "SELECT latest_version FROM packages WHERE id = ?",
        )
        .bind(package_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.flatten())
    }

    pub async fn list_packages(&self) -> Result<Vec<PackageRow>, StoreError> {
        let rows = sqlx::query("SELECT scope, name, latest_version FROM packages ORDER BY scope, name")
            .fetch_all(&self.pool)
            .await?;
        Ok(rows
            .iter()
            .map(|r| PackageRow {
                scope: r.get(0),
                name: r.get(1),
                latest_version: r.get(2),
            })
            .collect())
    }

    pub async fn versions_of(&self, package_id: i64) -> Result<Vec<VersionRow>, StoreError> {
        let rows = sqlx::query("SELECT version, manifest_json, created_at FROM versions WHERE package_id = ? ORDER BY rowid")
            .bind(package_id)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows
            .iter()
            .map(|r| VersionRow {
                version: r.get(0),
                manifest_json: r.get(1),
                created_at: r.get(2),
            })
            .collect())
    }

    pub async fn manifest_json(
        &self,
        package_id: i64,
        version: &str,
    ) -> Result<Option<String>, StoreError> {
        let row = sqlx::query_scalar::<_, String>(
            "SELECT manifest_json FROM versions WHERE package_id = ? AND version = ?",
        )
        .bind(package_id)
        .bind(version)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    /// 查询指定版本的 dist 文件清单（含 manifest.json 之外全部归档文件）。
    pub async fn version_files(
        &self,
        package_id: i64,
        version: &str,
    ) -> Result<Vec<(String, String, i64)>, StoreError> {
        let rows = sqlx::query(
            "SELECT path, sha256, size FROM version_files WHERE package_id = ? AND version = ? ORDER BY path",
        )
        .bind(package_id)
        .bind(version)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows
            .iter()
            .map(|r| {
                let path: String = r.get(0);
                let sha: String = r.get(1);
                let size: i64 = r.get(2);
                (path, sha, size)
            })
            .collect())
    }

    // ---------- 包/版本删除与 blob GC ----------

    /// 某版本引用到的全部 blob sha（含重复引用）。
    pub async fn version_blob_shas(
        &self,
        package_id: i64,
        version: &str,
    ) -> Result<Vec<String>, StoreError> {
        let rows = sqlx::query_scalar::<_, String>(
            "SELECT sha256 FROM version_files WHERE package_id = ? AND version = ?",
        )
        .bind(package_id)
        .bind(version)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    /// 整包全部版本引用到的 blob sha（含重复引用）。
    pub async fn package_blob_shas(&self, package_id: i64) -> Result<Vec<String>, StoreError> {
        let rows = sqlx::query_scalar::<_, String>(
            "SELECT sha256 FROM version_files WHERE package_id = ?",
        )
        .bind(package_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    /// 删除某版本（version_files + versions 行）并在**同一事务内**重算 `packages.latest_version`
    /// （剩余版本中 rowid 最大者；无剩余则 NULL）。
    ///
    /// 返回 `Ok(None)` = 版本不存在，事务已回滚、无任何副作用；`Ok(Some(latest))` = 已原子提交。
    pub async fn delete_version_and_recompute_latest(
        &self,
        package_id: i64,
        version: &str,
    ) -> Result<Option<Option<String>>, StoreError> {
        let mut tx = self.pool.begin().await?;
        let hit = sqlx::query("DELETE FROM versions WHERE package_id = ? AND version = ?")
            .bind(package_id)
            .bind(version)
            .execute(&mut *tx)
            .await?;
        if hit.rows_affected() == 0 {
            tx.rollback().await?;
            return Ok(None);
        }
        sqlx::query("DELETE FROM version_files WHERE package_id = ? AND version = ?")
            .bind(package_id)
            .bind(version)
            .execute(&mut *tx)
            .await?;
        let latest = sqlx::query_scalar::<_, String>(
            "SELECT version FROM versions WHERE package_id = ? ORDER BY rowid DESC LIMIT 1",
        )
        .bind(package_id)
        .fetch_optional(&mut *tx)
        .await?;
        sqlx::query("UPDATE packages SET latest_version = ? WHERE id = ?")
            .bind(latest.as_deref())
            .bind(package_id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        Ok(Some(latest))
    }

    /// 删除整包（version_files + versions + packages 行）于**同一事务**；返回被删版本数。
    pub async fn delete_package(&self, package_id: i64) -> Result<u64, StoreError> {
        let mut tx = self.pool.begin().await?;
        let count =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM versions WHERE package_id = ?")
                .bind(package_id)
                .fetch_one(&mut *tx)
                .await? as u64;
        sqlx::query("DELETE FROM version_files WHERE package_id = ?")
            .bind(package_id)
            .execute(&mut *tx)
            .await?;
        sqlx::query("DELETE FROM versions WHERE package_id = ?")
            .bind(package_id)
            .execute(&mut *tx)
            .await?;
        sqlx::query("DELETE FROM packages WHERE id = ?")
            .bind(package_id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        Ok(count)
    }

    /// 引用该 sha256 的 version_files 行数（blob GC 判据）。
    pub async fn blob_ref_count(&self, sha256: &str) -> Result<i64, StoreError> {
        Ok(sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM version_files WHERE sha256 = ?")
            .bind(sha256)
            .fetch_one(&self.pool)
            .await?)
    }

    /// 删除 blob 文件（不存在则忽略）。
    pub fn remove_blob(&self, sha256: &str) -> Result<(), StoreError> {
        let path = self.blobs_dir.join(sha256);
        if path.exists() {
            std::fs::remove_file(path)?;
        }
        Ok(())
    }

    /// 对候选 sha 做引用计数 GC：仅当没有任何 version_files 行引用时才删除 blob 文件。
    pub async fn gc_blobs(&self, shas: &[String]) -> Result<(), StoreError> {
        let mut seen = HashSet::new();
        for sha in shas {
            if !seen.insert(sha.as_str()) {
                continue;
            }
            if self.blob_ref_count(sha).await? == 0 {
                self.remove_blob(sha)?;
            }
        }
        Ok(())
    }

    // ---------- 账号 ----------

    pub async fn count_users(&self) -> Result<i64, StoreError> {
        Ok(sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users")
            .fetch_one(&self.pool)
            .await?)
    }

    pub async fn count_admins(&self) -> Result<i64, StoreError> {
        Ok(sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE role = 'admin'")
            .fetch_one(&self.pool)
            .await?)
    }

    pub async fn username_exists(&self, username: &str) -> Result<bool, StoreError> {
        let row = sqlx::query_scalar::<_, i64>("SELECT 1 FROM users WHERE username = ?")
            .bind(username)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.is_some())
    }

    pub async fn create_user(
        &self,
        username: &str,
        password_hash: &str,
        role: &str,
        now: i64,
    ) -> Result<i64, StoreError> {
        let res = sqlx::query(
            "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
        )
        .bind(username)
        .bind(password_hash)
        .bind(role)
        .bind(now.to_string())
        .execute(&self.pool)
        .await?;
        Ok(res.last_insert_rowid())
    }

    /// 登录用：返回 (id, password_hash, role)。
    pub async fn user_credentials(
        &self,
        username: &str,
    ) -> Result<Option<(i64, String, String)>, StoreError> {
        let row = sqlx::query("SELECT id, password_hash, role FROM users WHERE username = ?")
            .bind(username)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(|r| (r.get(0), r.get(1), r.get(2))))
    }

    pub async fn user_exists(&self, id: i64) -> Result<bool, StoreError> {
        let row = sqlx::query_scalar::<_, i64>("SELECT 1 FROM users WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.is_some())
    }

    pub async fn list_users(&self) -> Result<Vec<UserRow>, StoreError> {
        let rows = sqlx::query(
            "SELECT u.id, u.username, u.role, u.created_at,
                    (SELECT COUNT(*) FROM tokens t WHERE t.user_id = u.id AND t.revoked_at IS NULL)
             FROM users u ORDER BY u.id",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rows
            .iter()
            .map(|r| UserRow {
                id: r.get(0),
                username: r.get(1),
                role: r.get(2),
                created_at: r.get(3),
                token_count: r.get(4),
            })
            .collect())
    }

    pub async fn update_user_role(&self, id: i64, role: &str) -> Result<(), StoreError> {
        sqlx::query("UPDATE users SET role = ? WHERE id = ?")
            .bind(role)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn update_user_password(&self, id: i64, password_hash: &str) -> Result<(), StoreError> {
        sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
            .bind(password_hash)
            .bind(id)
            .execute(&self.pool)
            .await?;
        // 改密后吊销全部会话（安全默认）
        self.delete_sessions_of_user(id).await?;
        Ok(())
    }

    /// 删除用户及其令牌/会话。
    pub async fn delete_user(&self, id: i64) -> Result<(), StoreError> {
        sqlx::query("DELETE FROM tokens WHERE user_id = ?").bind(id).execute(&self.pool).await?;
        sqlx::query("DELETE FROM sessions WHERE user_id = ?").bind(id).execute(&self.pool).await?;
        sqlx::query("DELETE FROM users WHERE id = ?").bind(id).execute(&self.pool).await?;
        Ok(())
    }

    // ---------- 令牌 ----------

    pub async fn insert_token(
        &self,
        user_id: i64,
        name: &str,
        token_hash: &str,
        permissions: &str,
        now: i64,
    ) -> Result<i64, StoreError> {
        let res = sqlx::query(
            "INSERT INTO tokens (user_id, name, token_hash, permissions, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(user_id)
        .bind(name)
        .bind(token_hash)
        .bind(permissions)
        .bind(now.to_string())
        .execute(&self.pool)
        .await?;
        Ok(res.last_insert_rowid())
    }

    /// 按 hash 查未吊销令牌（发布鉴权用）。
    pub async fn token_auth_by_hash(&self, token_hash: &str) -> Result<Option<TokenAuth>, StoreError> {
        let row = sqlx::query(
            "SELECT id, permissions FROM tokens WHERE token_hash = ? AND revoked_at IS NULL",
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(|r| TokenAuth { id: r.get(0), permissions: r.get(1) }))
    }

    /// 列出令牌；`user_id=None` = 全部（仅 admin 调用）。
    pub async fn list_tokens(&self, user_id: Option<i64>) -> Result<Vec<TokenRow>, StoreError> {
        let sql = "SELECT t.id, t.user_id, u.username, t.name, t.permissions, t.created_at,
                          t.last_used_at, t.revoked_at
                   FROM tokens t JOIN users u ON u.id = t.user_id
                   WHERE (?1 IS NULL OR t.user_id = ?1)
                   ORDER BY t.id DESC";
        let rows = sqlx::query(sql).bind(user_id).fetch_all(&self.pool).await?;
        Ok(rows
            .iter()
            .map(|r| TokenRow {
                id: r.get(0),
                user_id: r.get(1),
                username: r.get(2),
                name: r.get(3),
                permissions: r.get(4),
                created_at: r.get(5),
                last_used_at: r.get(6),
                revoked_at: r.get(7),
            })
            .collect())
    }

    pub async fn token_owner(&self, id: i64) -> Result<Option<i64>, StoreError> {
        let row = sqlx::query_scalar::<_, i64>("SELECT user_id FROM tokens WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row)
    }

    pub async fn touch_token(&self, id: i64, now: i64) -> Result<(), StoreError> {
        sqlx::query("UPDATE tokens SET last_used_at = ? WHERE id = ?")
            .bind(now.to_string())
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 启用或停用令牌；`revoked_at` 保留作为停用时间。
    pub async fn set_token_enabled(&self, id: i64, enabled: bool) -> Result<bool, StoreError> {
        let res = sqlx::query("UPDATE tokens SET revoked_at = ? WHERE id = ?")
            .bind(if enabled { None } else { Some(unix_now().to_string()) })
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(res.rows_affected() > 0)
    }

    pub async fn delete_token(&self, id: i64) -> Result<bool, StoreError> {
        let res = sqlx::query("DELETE FROM tokens WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(res.rows_affected() > 0)
    }

    /// 用户全部未吊销令牌的权限并集（UI 提示用）。
    pub async fn permissions_of_user(&self, user_id: i64) -> Result<Vec<String>, StoreError> {
        let rows = sqlx::query_scalar::<_, String>(
            "SELECT permissions FROM tokens WHERE user_id = ? AND revoked_at IS NULL",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        let mut out: Vec<String> = Vec::new();
        for raw in rows {
            if let Ok(list) = serde_json::from_str::<Vec<String>>(&raw) {
                for p in list {
                    if !out.contains(&p) {
                        out.push(p);
                    }
                }
            }
        }
        Ok(out)
    }

    // ---------- 会话 ----------

    pub async fn create_session(
        &self,
        user_id: i64,
        token_hash: &str,
        now: i64,
        expires_at: i64,
    ) -> Result<(), StoreError> {
        sqlx::query(
            "INSERT INTO sessions (user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)",
        )
        .bind(user_id)
        .bind(token_hash)
        .bind(now.to_string())
        .bind(expires_at.to_string())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn session_by_hash(&self, token_hash: &str) -> Result<Option<SessionRow>, StoreError> {
        let row = sqlx::query(
            "SELECT s.user_id, u.username, u.role, s.expires_at
             FROM sessions s JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ?",
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(|r| SessionRow {
            user_id: r.get(0),
            username: r.get(1),
            role: r.get(2),
            expires_at: r.get(3),
        }))
    }

    pub async fn delete_session(&self, token_hash: &str) -> Result<(), StoreError> {
        sqlx::query("DELETE FROM sessions WHERE token_hash = ?")
            .bind(token_hash)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_sessions_of_user(&self, user_id: i64) -> Result<(), StoreError> {
        sqlx::query("DELETE FROM sessions WHERE user_id = ?")
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

/// 当前 unix 秒。
pub fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}
