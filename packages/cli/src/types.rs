//! 远程组件类型接入：`oui.d.ts` / tsconfig 登记与 paths 映射，以及本地类型声明
//! （`oui-types/`）的落盘与重建。

use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

use anyhow::{anyhow, bail, Context, Result};
use serde_json::Value;

use crate::config::{read_lock_at, TYPES_DIR};
use crate::decl::has_vue_files;
use crate::text::{find_key, insert_into_array, insert_into_object, skip_ws, write_if_changed};

/// 重建缺失的本地类型声明：lock 内每个包若本地入口或对应版本目录缺失，按锁定版本取 manifest
/// （`/v/<name>@<version>/manifest.json`，与 latest 无关）重新下载声明并重建转发入口；
/// 该版本未提供类型声明则跳过。失败只提示（该包退化为 any），不影响其它修复项。
pub(crate) async fn repair_local_types(root: &Path, lock: &Value, fallback_registry: &str) {
    let Some(pkgs) = lock.get("packages").and_then(Value::as_object) else {
        return;
    };
    let client = reqwest::Client::new();
    for (name, v) in pkgs {
        let version = v.get("version").and_then(Value::as_str).unwrap_or_default();
        if version.is_empty() {
            continue;
        }
        let entry = format!("{TYPES_DIR}/{name}/index.d.ts");
        if root.join(&entry).is_file() && root.join(TYPES_DIR).join(name).join(version).is_dir() {
            continue;
        }
        let registry = v
            .get("registry")
            .and_then(Value::as_str)
            .map(|s| s.trim_end_matches('/').to_string())
            .unwrap_or_else(|| fallback_registry.to_string());
        let url = format!("{registry}/v/{name}@{version}/manifest.json");
        let rebuilt = async {
            let resp = client
                .get(&url)
                .send()
                .await
                .with_context(|| format!("请求 hub 失败: {url}"))?;
            if !resp.status().is_success() {
                bail!("{url} → HTTP {}", resp.status());
            }
            let m: Value = resp.json().await.with_context(|| format!("解析 manifest 失败: {url}"))?;
            let Some(entry_rel) = m["entry"]["types"].as_str() else {
                return Ok(None);
            };
            let files: Vec<String> = m["entry"]["typesFiles"]
                .as_array()
                .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
                .unwrap_or_default();
            let local =
                fetch_pkg_types(&client, &registry, name, version, entry_rel, &files, root).await?;
            Ok::<_, anyhow::Error>(Some(local))
        }
        .await;
        match rebuilt {
            Ok(Some(files)) => {
                println!("已重建 {name}@{version} 的本地类型声明（{} 个文件）→ {entry}", files.len())
            }
            Ok(None) => println!("{name}@{version} 未提供类型声明（按 any 处理）"),
            Err(e) => println!("类型声明重建失败：{e}"),
        }
    }
}

// ---------- 类型接入（oui.d.ts / tsconfig） ----------

/// 工程是否已接入远程组件类型（根 oui.d.ts 存在，或 tsconfig.json 已引用/登记）。
pub(crate) fn has_remote_types(root: &Path) -> bool {
    if root.join(TYPES_FILE).is_file() {
        return true;
    }
    fs::read_to_string(root.join(MAIN_TSCONFIG))
        .map(|t| t.contains(REF_TSCONFIG) || t.contains(TYPES_FILE))
        .unwrap_or(false)
}

/// 类型声明文件的处理结果。
pub(crate) enum TypesEdit {
    /// 生成了声明文件
    Written(Vec<PathBuf>),
    /// 已是最新，无需改动
    Already(PathBuf),
    /// 工程自行维护（含手写引用），不自动改写
    Manual(PathBuf),
}

/// 工程根的类型入口文件：内容转发 @openui_hub/plugin_vite 的声明（声明真源在该包内）。
pub(crate) const TYPES_FILE: &str = "oui.d.ts";
pub(crate) const MAIN_TSCONFIG: &str = "tsconfig.json";
/// references 模式下被 tsconfig.json 引用的独立工程文件。
pub(crate) const REF_TSCONFIG: &str = "tsconfig.oui.json";
/// references 模式下「编译源码」的工程文件（solution-style 必须有工程包含源码）。
pub(crate) const APP_TSCONFIG: &str = "tsconfig.app.json";
pub(crate) const REMOTE_REF: &str = "/// <reference types=\"@openui_hub/plugin_vite/remote\" />";

pub(crate) fn types_file_content() -> String {
    format!("/* 由 oui 生成（oui init --tsconfig / oui use --with-types）：引入远程组件类型声明，请勿手改。 */\n{REMOTE_REF}\n")
}

/// Generated type references for tsconfig.
/// （声明必须与源码同 Program，否则源码落进编辑器的 inferred project 看不到声明）。
pub(crate) fn ref_tsconfig_content(with_sources: bool, paths: &BTreeMap<String, String>) -> String {
    let include = if with_sources {
        "[\"src/**/*\", \"src/**/*.vue\", \"oui.d.ts\"]"
    } else {
        "[\"oui.d.ts\"]"
    };
    let paths = paths_block(paths);
    format!(
        "{{\n  \"include\": {include},\n  \"compilerOptions\": {{\n{paths}    \"composite\": true,\n    \"noEmit\": true,\n    \"tsBuildInfoFile\": \"./node_modules/.tmp/tsconfig.oui.tsbuildinfo\",\n    \"target\": \"ESNext\",\n    \"module\": \"ESNext\",\n    \"moduleResolution\": \"bundler\",\n    \"skipLibCheck\": true\n  }}\n}}\n"
    )
}

/// 工程内已有的、覆盖源码的工程配置（如 create-vue 的 tsconfig.app.json）。
pub(crate) fn source_project_covering_src(root: &Path) -> Option<PathBuf> {
    for name in [APP_TSCONFIG, "tsconfig.web.json", "tsconfig.client.json"] {
        let p = root.join(name);
        if p.is_file() {
            let text = fs::read_to_string(&p).unwrap_or_default();
            if text.contains("src") && (text.contains("\"include\"") || text.contains("\"files\"")) {
                return Some(p);
            }
        }
    }
    None
}

/// lock 中已落盘本地类型的包 → tsconfig paths 映射：`oui-hub:<name>` → `./oui-types/<name>/index`。
/// 声明入口固定为 `oui-types/<name>/index.d.ts`（不随版本变化），故插入后无需再改写。
pub(crate) fn type_paths_of(root: &Path, lock: &Value) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    let Some(pkgs) = lock.get("packages").and_then(Value::as_object) else {
        return out;
    };
    for name in pkgs.keys() {
        if root.join(TYPES_DIR).join(name).join("index.d.ts").is_file() {
            out.insert(format!("oui-hub:{name}"), format!("./{TYPES_DIR}/{name}/index"));
        }
    }
    out
}

/// tsconfig.oui.json 里的 paths 片段（无映射则空串）。
pub(crate) fn paths_block(paths: &BTreeMap<String, String>) -> String {
    if paths.is_empty() {
        return String::new();
    }
    let mut s = String::from("    \"paths\": {\n");
    let items: Vec<String> = paths
        .iter()
        .map(|(k, v)| format!("      \"{k}\": [\"{v}\"]"))
        .collect();
    s.push_str(&items.join(",\n"));
    s.push_str("\n    },\n");
    s
}

/// 在 JSONC 文本的 compilerOptions.paths 里插入一条映射（键已存在则不动）。
pub(crate) fn insert_path_mapping(text: &str, key: &str, value: &str) -> Option<String> {
    if text.contains(&format!("\"{key}\"")) {
        return None;
    }
    let entry = format!("\"{key}\": [\"{value}\"]");
    if let Some(key_end) = find_key(text, "paths") {
        let open = text[key_end..].find('{')? + key_end;
        let mut out = text.to_string();
        out.insert_str(open + 1, &format!("\n      {entry},"));
        return Some(out);
    }
    insert_into_object(text, "compilerOptions", &format!("\"paths\": {{ {entry} }}"))
}

/// 把 JSONC 文本里 `"key"` 的数组值替换为 `["value"]`；键不存在或值已一致 → None。
pub(crate) fn set_path_mapping(text: &str, key: &str, value: &str) -> Option<String> {
    let key_end = find_key(text, key)?;
    let bytes = text.as_bytes();
    let mut i = skip_ws(bytes, key_end);
    if bytes.get(i) == Some(&b':') {
        i = skip_ws(bytes, i + 1);
    }
    if bytes.get(i) != Some(&b'[') {
        return None;
    }
    // 扫描到匹配的 `]`（字符串内不计数）
    let mut depth = 0usize;
    let mut j = i;
    let mut in_str = false;
    while j < bytes.len() {
        let c = bytes[j];
        if in_str {
            if c == b'\\' {
                j += 2;
                continue;
            }
            if c == b'"' {
                in_str = false;
            }
        } else if c == b'"' {
            in_str = true;
        } else if c == b'[' {
            depth += 1;
        } else if c == b']' {
            depth -= 1;
            if depth == 0 {
                break;
            }
        }
        j += 1;
    }
    if depth != 0 {
        return None;
    }
    let want = format!("[\"{value}\"]");
    if text[i..=j] == want {
        return None;
    }
    let mut out = String::with_capacity(text.len());
    out.push_str(&text[..i]);
    out.push_str(&want);
    out.push_str(&text[j + 1..]);
    Some(out)
}

/// 逐条把 paths 映射写入 JSONC 文本：缺键则插入，值不对（过期/指向不存在的声明）则改写；无改动返回 None。
pub(crate) fn merge_paths(text: &str, paths: &BTreeMap<String, String>) -> Option<String> {
    let mut cur = text.to_string();
    let mut changed = false;
    for (k, v) in paths {
        let next = if cur.contains(&format!("\"{k}\"")) {
            set_path_mapping(&cur, k, v)
        } else {
            insert_path_mapping(&cur, k, v)
        };
        if let Some(n) = next {
            cur = n;
            changed = true;
        }
    }
    changed.then_some(cur)
}

/// 入口声明是否导出 default（决定转发入口要不要再 `export { default }`）。
pub(crate) fn declares_default_export(text: &str) -> bool {
    text.contains("export default")
        || text.lines().any(|l| {
            let t = l.trim_start();
            t.starts_with("export {") && t.contains("default")
        })
}

/// 下载某包全部声明文件到 `<root>/oui-types/<name>/<version>/`，并生成转发入口
/// `<root>/oui-types/<name>/index.d.ts`（入口里对同目录声明的相对引用保持可解析）。
/// 拉取成功后落盘到本地类型目录，并重建转发入口。
pub(crate) async fn fetch_pkg_types(
    client: &reqwest::Client,
    reg: &str,
    base: &str,
    version: &str,
    entry: &str,
    files: &[String],
    root: &Path,
) -> Result<Vec<String>> {
    const PREFIX: &str = "types/";
    let pkg_dir = root.join(TYPES_DIR).join(base);
    let ver_dir = pkg_dir.join(version);
    // 清掉其它版本残留（index.d.ts 只转发当前版本）
    if pkg_dir.is_dir() {
        for ent in fs::read_dir(&pkg_dir)?.flatten() {
            let p = ent.path();
            if p.is_dir() && ent.file_name().to_string_lossy() != version {
                let _ = fs::remove_dir_all(&p);
            }
        }
    }
    let mut local: Vec<String> = Vec::new();
    for rel in files {
        let sub = rel
            .strip_prefix(PREFIX)
            .ok_or_else(|| anyhow!("manifest 类型路径异常（应以 {PREFIX} 开头）: {rel}"))?;
        let url = format!("{reg}/v/{base}@{version}/{rel}");
        let resp = client
            .get(&url)
            .send()
            .await
            .with_context(|| format!("请求类型声明失败: {url}"))?;
        if !resp.status().is_success() {
            bail!("{url} → HTTP {}", resp.status());
        }
        let dst = ver_dir.join(sub);
        if let Some(p) = dst.parent() {
            fs::create_dir_all(p).with_context(|| format!("创建目录失败: {}", p.display()))?;
        }
        fs::write(&dst, resp.bytes().await?).with_context(|| format!("写入失败: {}", dst.display()))?;
        local.push(format!("{TYPES_DIR}/{base}/{version}/{sub}"));
    }

    let entry_sub = entry
        .strip_prefix(PREFIX)
        .ok_or_else(|| anyhow!("manifest entry.types 异常（应以 {PREFIX} 开头）: {entry}"))?;
    let entry_spec = entry_sub
        .strip_suffix(".d.ts")
        .or_else(|| entry_sub.strip_suffix(".d.mts"))
        .unwrap_or(entry_sub);
    let has_default = fs::read_to_string(ver_dir.join(entry_sub))
        .map(|t| declares_default_export(&t))
        .unwrap_or(false);
    let mut content = String::from("/* 由 oui 生成（oui use / oui fix），请勿手改。 */\n");
    content.push_str(&format!("export * from './{version}/{entry_spec}';\n"));
    if has_default {
        content.push_str(&format!("export {{ default }} from './{version}/{entry_spec}';\n"));
    }
    let index = pkg_dir.join("index.d.ts");
    fs::write(&index, content).with_context(|| format!("写入失败: {}", index.display()))?;
    Ok(local)
}

/// 生成/修复类型接入文件（4 步）：
/// 1) 根目录建 `oui.d.ts`（三斜杠引用 `@openui_hub/plugin_vite/remote`）；
/// 2) 无 `tsconfig.json` → 自建 references 模式（tsconfig.json 引用 ./tsconfig.oui.json）；
/// 3) references 模式 → references 加 `./tsconfig.oui.json`；该文件承载声明，工程里没有别的含源码工程时连 `src/**` 一起收录；
/// 4) 有但非 references → 把 `oui.d.ts` 登记进 include（无 include 试 files；都没有则 TS 默认包含根目录）。
///
/// 5) 有类型的包 → 在「包含源码」的那个 tsconfig 里插 `compilerOptions.paths` 映射
///    （`oui-hub:<name>` → `./oui-types/<name>/index.d.ts`，由 `oui use` 落盘）。
///
/// 注意：project references 之间只共享"声明产物"，被引用工程里只放 `.d.ts` 传不到引用方；
/// 且 solution-style 下若没有工程包含 `src/`，源码文件会落进编辑器的 inferred project 而看不到声明。
/// 因此 references 模式必须同时具备一个包含源码（并在 include 里带上 oui.d.ts）的工程。
pub(crate) fn configure_types(root: &Path) -> TypesEdit {
    let dts = root.join(TYPES_FILE);
    let main = root.join(MAIN_TSCONFIG);
    let ref_cfg = root.join(REF_TSCONFIG);
    // 已落盘本地类型的包 → paths 映射（值指向 oui-types/<pkg>/index.d.ts，不随版本变化）
    let paths = type_paths_of(root, &read_lock_at(root));
    let mut written: Vec<PathBuf> = Vec::new();
    match write_if_changed(&dts, &types_file_content()) {
        Ok(true) => written.push(dts.clone()),
        Ok(false) => {}
        Err(()) => return TypesEdit::Manual(dts),
    }

    // 无 tsconfig.json → 建 solution-style 骨架（references 模式）
    let text = if main.is_file() {
        fs::read_to_string(&main).unwrap_or_default()
    } else {
        let skeleton = "{\n  \"files\": [],\n  \"references\": []\n}\n";
        if write_if_changed(&main, skeleton).is_err() {
            return TypesEdit::Manual(main);
        }
        written.push(main.clone());
        skeleton.to_string()
    };

    if text.contains("\"references\"") {
        // (a) 登记 tsconfig.oui.json
        let text = fs::read_to_string(&main).unwrap_or_default();
        if !text.contains(REF_TSCONFIG) {
            match insert_into_array(&text, "references", "{ \"path\": \"./tsconfig.oui.json\" }") {
                Some(next) => {
                    if fs::write(&main, &next).is_err() {
                        return TypesEdit::Manual(main);
                    }
                    written.push(main.clone());
                }
                None => return TypesEdit::Manual(main),
            }
        }

        // (b) tsconfig.oui.json 承载声明；若工程里没有别的"含源码"的工程，连源码一起放进它
        //     （声明必须与源码同 Program：否则源码会落进编辑器的 inferred project 而看不到声明）
        let source_project = source_project_covering_src(root);
        let with_sources = source_project.is_none();
        match write_if_changed(&ref_cfg, &ref_tsconfig_content(with_sources, &paths)) {
            Ok(true) => written.push(ref_cfg.clone()),
            Ok(false) => {}
            Err(()) => return TypesEdit::Manual(ref_cfg),
        }
        if with_sources && has_vue_files(&root.join("src"), 0) {
            println!("提示：工程含 .vue，类型检查请用 `vue-tsc -p {REF_TSCONFIG}`");
        }

        // (c) 若已有独立源码工程（如 create-vue 的 tsconfig.app.json）→ oui.d.ts 与 paths 都登记进它
        if let Some(app) = source_project {
            let mut app_text = fs::read_to_string(&app).unwrap_or_default();
            if !app_text.contains("\"composite\"") {
                // 被 references 引用的工程必须 composite
                if let Some(next) = insert_into_object(&app_text, "compilerOptions", "\"composite\": true,") {
                    if fs::write(&app, &next).is_err() {
                        return TypesEdit::Manual(app);
                    }
                    written.push(app.clone());
                    app_text = next;
                }
            }
            if !app_text.contains(TYPES_FILE)
                && let Some(next) = insert_into_array(&app_text, "include", "\"oui.d.ts\"")
                    .or_else(|| insert_into_array(&app_text, "files", "\"oui.d.ts\""))
            {
                if fs::write(&app, &next).is_err() {
                    return TypesEdit::Manual(app);
                }
                written.push(app.clone());
                app_text = next;
            }
            if let Some(next) = merge_paths(&app_text, &paths) {
                if fs::write(&app, next).is_err() {
                    return TypesEdit::Manual(app);
                }
                written.push(app);
            }
        }
        written.dedup();
        return if written.is_empty() {
            TypesEdit::Already(dts)
        } else {
            TypesEdit::Written(written)
        };
    }

    // 非 references 分支：oui.d.ts 登记进 include（或 files；都无则 TS 默认包含根目录文件）
    let mut text = text;
    if !text.contains(TYPES_FILE)
        && let Some(next) = insert_into_array(&text, "include", "\"oui.d.ts\"")
            .or_else(|| insert_into_array(&text, "files", "\"oui.d.ts\""))
    {
        if fs::write(&main, &next).is_err() {
            return TypesEdit::Manual(main);
        }
        written.push(main.clone());
        text = next;
    }

    // 路径映射：有类型的包 → 本地 oui-types/<pkg>/index.d.ts（用户 tsconfig 只插不改）
    if let Some(next) = merge_paths(&text, &paths) {
        if fs::write(&main, next).is_err() {
            return TypesEdit::Manual(main);
        }
        if !written.contains(&main) {
            written.push(main);
        }
    }

    if written.is_empty() {
        TypesEdit::Already(dts)
    } else {
        TypesEdit::Written(written)
    }
}

/// 输出类型接入的处理结果。
pub(crate) fn report_types(edit: &TypesEdit) {
    match edit {
        TypesEdit::Written(files) => {
            let list: Vec<String> = files.iter().map(|p| p.display().to_string()).collect();
            println!("{}", list.join(","));
        }
        TypesEdit::Already(p) => println!("类型接入已就绪: {}", p.display()),
        TypesEdit::Manual(p) => {
            println!("需手动配置类型接入: {}", p.display());
        }
    }
}
