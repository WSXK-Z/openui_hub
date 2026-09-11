use std::path::PathBuf;

use anyhow::{Context, Result};

/// 服务端配置：全部来自环境变量（无配置文件）。
#[derive(Clone, Debug)]
pub struct Config {
    /// 监听地址，env `HUB_ADDR`，默认 `127.0.0.1:8787`
    pub addr: String,
    /// 数据目录，env `HUB_DATA_DIR`，默认 `<cwd>/.dpui_hub_data`
    pub data_dir: PathBuf,
    /// 发布令牌，env `HUB_PUBLISH_TOKEN`；未设置则自动生成 32 hex（仅警告，部署应注入）
    pub publish_token: String,
    /// 令牌是否由本进程自动生成（main 据此打印一次警告）
    pub token_generated: bool,
    /// 启动引导管理员（env `HUB_ADMIN_USER` + `HUB_ADMIN_PASSWORD`；users 为空时创建）
    pub admin_user: Option<String>,
    pub admin_password: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let addr = std::env::var("HUB_ADDR").unwrap_or_else(|_| "127.0.0.1:8787".into());
        let data_dir = std::env::var("HUB_DATA_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from(".dpui_hub_data"));
        let (publish_token, token_generated) = match std::env::var("HUB_PUBLISH_TOKEN") {
            Ok(t) if !t.is_empty() => (t, false),
            _ => {
                use rand::RngCore;
                let mut buf = [0u8; 16];
                rand::thread_rng().fill_bytes(&mut buf);
                (buf.iter().map(|b| format!("{b:02x}")).collect(), true)
            }
        };
        let admin_user = std::env::var("HUB_ADMIN_USER").ok().filter(|s| !s.is_empty());
        let admin_password = std::env::var("HUB_ADMIN_PASSWORD").ok().filter(|s| !s.is_empty());
        Ok(Self { addr, data_dir, publish_token, token_generated, admin_user, admin_password })
    }

    pub fn ensure_dirs(&self) -> Result<()> {
        std::fs::create_dir_all(&self.data_dir).with_context(|| {
            format!("创建数据目录失败: {}", self.data_dir.display())
        })?;
        Ok(())
    }
}
