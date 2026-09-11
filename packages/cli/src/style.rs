//! 终端样式与输出：统一着色、列对齐。
//!
//! 输出统一走 `anstream`：管道/重定向、`NO_COLOR`、`TERM=dumb` 时自动去掉转义序列，
//! Windows 控制台按需开启 VT 处理，因此重定向后的文本可直接被脚本解析。
//!
//! 样式语义：`ok` 成功与完成、`warn` 非致命提醒、`error` 错误、`strong` 强调（标题/动词）、
//! `muted` 次要信息（路径/版本/候选）、`accent` 标识（命令/字段值）。

use std::fmt::{self, Display};
use std::io::Write;

use anstyle::{AnsiColor, Color, Effects, Style as AnsiStyle};

/// 成功 / 完成（绿加粗）。
const OK: AnsiStyle = AnsiStyle::new()
    .fg_color(Some(Color::Ansi(AnsiColor::Green)))
    .effects(Effects::BOLD);
/// 非致命提醒（黄加粗）。
const WARN: AnsiStyle = AnsiStyle::new()
    .fg_color(Some(Color::Ansi(AnsiColor::Yellow)))
    .effects(Effects::BOLD);
/// 错误（红加粗）。
const ERROR: AnsiStyle = AnsiStyle::new()
    .fg_color(Some(Color::Ansi(AnsiColor::Red)))
    .effects(Effects::BOLD);
/// 强调（加粗）。
const STRONG: AnsiStyle = AnsiStyle::new().effects(Effects::BOLD);
/// 次要信息（暗）。
const MUTED: AnsiStyle = AnsiStyle::new().effects(Effects::DIMMED);
/// 标识（青）。
const ACCENT: AnsiStyle = AnsiStyle::new().fg_color(Some(Color::Ansi(AnsiColor::Cyan)));

/// 着色片段：渲染时写起止转义（`{:#}` 为复位），可安全嵌套。
struct Painted<T> {
    text: T,
    style: AnsiStyle,
}

impl<T: Display> Display for Painted<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}{}{:#}", self.style, self.text, self.style)
    }
}

/// 成功 / 完成。
pub(crate) fn ok(text: impl Display) -> impl Display {
    Painted { text, style: OK }
}

/// 非致命提醒。
pub(crate) fn warn(text: impl Display) -> impl Display {
    Painted { text, style: WARN }
}

/// 错误。
pub(crate) fn error(text: impl Display) -> impl Display {
    Painted { text, style: ERROR }
}

/// 强调。
pub(crate) fn strong(text: impl Display) -> impl Display {
    Painted { text, style: STRONG }
}

/// 次要信息。
pub(crate) fn muted(text: impl Display) -> impl Display {
    Painted { text, style: MUTED }
}

/// 标识。
pub(crate) fn accent(text: impl Display) -> impl Display {
    Painted { text, style: ACCENT }
}

/// 标准输出一行（非交互环境自动去色）。
pub(crate) fn out(line: impl Display) {
    let mut stream = anstream::stdout();
    let _ = writeln!(stream, "{line}");
}

/// 标准错误一行。
pub(crate) fn eout(line: impl Display) {
    let mut stream = anstream::stderr();
    let _ = writeln!(stream, "{line}");
}

/// 交互提示（不换行，写出后立即 flush）。
pub(crate) fn ask(label: &str, hint: &str) -> std::io::Result<()> {
    let mut stream = anstream::stdout();
    if hint.is_empty() {
        write!(stream, "{}: ", strong(label))?;
    } else {
        write!(stream, "{} [{}]: ", strong(label), muted(hint))?;
    }
    stream.flush()
}

/// 两列表格：表头加粗，第一列按最宽单元格左侧补齐（宽度按字符数估算）。
pub(crate) fn table(head: (&str, &str), rows: &[(String, String)], footer: Option<String>) {
    let width = rows
        .iter()
        .map(|(left, _)| left.chars().count())
        .chain(std::iter::once(head.0.chars().count()))
        .max()
        .unwrap_or(0);
    out(format!("{}  {}", strong(pad(head.0, width)), strong(head.1)));
    for (left, right) in rows {
        out(format!("{}  {}", muted(pad(left, width)), right));
    }
    if let Some(text) = footer {
        out(muted(text));
    }
}

/// 左侧补齐到 `width`（按字符数），不足部分补空格。
fn pad(text: &str, width: usize) -> String {
    let len = text.chars().count();
    if len >= width {
        return text.to_string();
    }
    format!("{text}{}", " ".repeat(width - len))
}
