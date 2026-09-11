mod admin;
mod api;
mod auth;
mod config;
mod manifest;
mod publish;
mod store;

use anyhow::Result;
use config::Config;
use store::Store;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let cfg = Config::from_env()?;
    if cfg.token_generated {
        tracing::warn!(
            "HUB_PUBLISH_TOKEN 未设置，已生成临时发布令牌（仅本次进程有效；部署请注入环境变量）: {}",
            cfg.publish_token
        );
    }
    cfg.ensure_dirs()?;
    let store = Store::init(&cfg.data_dir).await?;

    // 引导管理员：users 为空且提供了 HUB_ADMIN_USER/HUB_ADMIN_PASSWORD 时创建
    if store.count_users().await? == 0 {
        if let (Some(user), Some(password)) = (&cfg.admin_user, &cfg.admin_password) {
            let hash = auth::hash_password(password)
                .map_err(|(_, axum::Json(v))| anyhow::anyhow!("创建引导管理员失败: {v}"))?;
            store
                .create_user(user, &hash, "admin", store::unix_now())
                .await
                .map_err(|e| anyhow::anyhow!("创建引导管理员失败: {e}"))?;
            tracing::info!("已创建引导管理员 {user}（来自 HUB_ADMIN_USER/HUB_ADMIN_PASSWORD）");
        } else {
            tracing::info!(
                "尚未初始化账号：请在 web 端完成初始化（/api/setup），或设置 HUB_ADMIN_USER/HUB_ADMIN_PASSWORD"
            );
        }
    }

    tracing::info!(
        "dpui-hub-server listening on {} (data dir: {})",
        cfg.addr,
        cfg.data_dir.display()
    );

    let app = api::app(store, cfg.publish_token);
    let listener = tokio::net::TcpListener::bind(&cfg.addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
