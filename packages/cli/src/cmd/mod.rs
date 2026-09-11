//! 子命令实现：一个命令一个模块，入口在 `main.rs` 的 `run()` 分发。

pub(crate) mod auth;
pub(crate) mod consume;
pub(crate) mod create;
pub(crate) mod fix;
pub(crate) mod init;
pub(crate) mod list;
pub(crate) mod manifest;
pub(crate) mod publish;
pub(crate) mod register;
