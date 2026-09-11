//! JSONC 文本级改写工具：保留用户文件原有缩进与其它键，只动目标字段。

use std::fs;
use std::path::Path;

use anyhow::Result;

/// 读 JSON 文本里 `"key": "value"` 的字符串值（脚本命令不含转义引号，故不做转义处理）。
pub(crate) fn json_string_value(text: &str, key: &str) -> Option<String> {
    let key_end = find_key(text, key)?;
    let bytes = text.as_bytes();
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    if bytes.get(i) != Some(&b'"') {
        return None;
    }
    let start = i + 1;
    let end = text[start..].find('"')? + start;
    Some(text[start..end].to_string())
}

/// 替换 `"key": "..."` 的字符串值；键不存在或值相同 → None。
pub(crate) fn replace_json_string_value(text: &str, key: &str, new: &str) -> Option<String> {
    let key_end = find_key(text, key)?;
    let bytes = text.as_bytes();
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    if bytes.get(i) != Some(&b'"') {
        return None;
    }
    let start = i + 1;
    let end = text[start..].find('"')? + start;
    if &text[start..end] == new {
        return None;
    }
    let mut out = String::with_capacity(text.len());
    out.push_str(&text[..start]);
    out.push_str(new);
    out.push_str(&text[end..]);
    Some(out)
}

/// 找到 `"key": ` 之后的值起始位置（首个非空白字符）；找不到返回 None。
pub(crate) fn find_value_pos(text: &str, key: &str) -> Option<usize> {
    let bytes = text.as_bytes();
    let key_end = find_key(text, key)?;
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    (i < bytes.len()).then_some(i)
}

/// 找到 `"key"` 之后的字符串值起始位置（指向开引号）；找不到返回 None。
pub(crate) fn find_string_value_of(text: &str, key: &str) -> Option<usize> {
    let i = find_value_pos(text, key)?;
    (text.as_bytes().get(i) == Some(&b'"')).then_some(i)
}

/// 读取从 `start`（开引号）开始的字符串值，返回 (内容, 结束引号后位置)。
pub(crate) fn read_string_value(text: &str, start: usize) -> (String, usize) {
    let bytes = text.as_bytes();
    let mut i = start + 1;
    while i < bytes.len() && bytes[i] != b'"' {
        i += 1;
    }
    (text[start + 1..i].to_string(), (i + 1).min(text.len()))
}

/// 用 `value` 替换从 `start` 开始的字符串值内容。
pub(crate) fn replace_string_value(text: &str, start: usize, value: &str) -> String {
    let (_, end) = read_string_value(text, start);
    format!("{}{}{}", &text[..start + 1], value, &text[end - 1..])
}

// ---------- 基础文本工具 ----------

pub(crate) fn find_key(text: &str, key: &str) -> Option<usize> {
    let pat = format!("\"{key}\"");
    text.find(&pat).map(|i| i + pat.len())
}

pub(crate) fn skip_ws(bytes: &[u8], mut i: usize) -> usize {
    while matches!(bytes.get(i), Some(c) if c.is_ascii_whitespace()) {
        i += 1;
    }
    i
}

/// 内容有变化才写入；返回是否实际写入。
pub(crate) fn write_if_changed(path: &Path, content: &str) -> Result<bool, ()> {
    if fs::read_to_string(path).map(|t| t == content).unwrap_or(false) {
        return Ok(false);
    }
    fs::write(path, content).map(|_| true).map_err(|_| ())
}

/// 把 `item`（JSON 片段）插入 `"key": [...]` 数组开头；无该键或非数组返回 None。
pub(crate) fn insert_into_array(text: &str, key: &str, item: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let key_end = find_key(text, key)?;
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    if bytes.get(i) != Some(&b'[') {
        return None;
    }
    let inner = skip_ws(bytes, i + 1);
    let ins = if bytes.get(inner) == Some(&b']') {
        item.to_string()
    } else {
        format!("{item}, ")
    };
    let mut out = String::with_capacity(text.len() + ins.len());
    out.push_str(&text[..=i]);
    out.push_str(&ins);
    out.push_str(&text[i + 1..]);
    Some(out)
}

/// 把 `entry`（JSON 片段，不带尾逗号）插入 `"key": { ... }` 对象开头；无该键或非对象返回 None。
/// 成功则返回插入后的完整文本。
pub(crate) fn insert_into_object(text: &str, key: &str, entry: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let key_end = find_key(text, key)?;
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    if bytes.get(i) != Some(&b'{') {
        return None;
    }
    let inner = skip_ws(bytes, i + 1);
    let non_empty = bytes.get(inner) != Some(&b'}');
    let trimmed = entry.trim_end().trim_end_matches(',');
    let ins = if non_empty {
        format!("\n    {trimmed},")
    } else {
        format!("\n    {trimmed}")
    };
    let mut out = String::with_capacity(text.len() + ins.len());
    out.push_str(&text[..=i]);
    out.push_str(&ins);
    out.push_str(&text[i + 1..]);
    Some(out)
}
