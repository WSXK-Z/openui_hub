# 在 dp_ui 中使用 Cool Neutral 设计系统

> 设计系统来源：Open Design 设计系统包 `ds-design-system`
> 参考产物：`cool-neutral-design-system-package-2.html`（token 与组件示例）
> 适配位置：`packages/core/src/styles/themes/cool-neutral.css`

---

## 1. 先确认它是什么

该目录不是 npm 包，也没有可安装的 JS 产物，内容是：

```
ds-design-system/
├── DESIGN.md                                  # 设计系统说明（占位章节）
├── cool-neutral-design-system.html            # 设计系统展示页
├── cool-neutral-design-system-package.html    # 组件/令牌展示页
├── cool-neutral-design-system-package-2.html  # 令牌 + 组件 + 应用示例（当前采用的来源）
├── *.artifact.json                            # Open Design 产物元数据
└── context/source-context.md                  # 生成上下文
```

因此「使用」的方式不是 `npm install`，而是**把其中的设计令牌映射到 `@dp_ui/core` 的 `--dp-*` 令牌层**。组件无需任何改动。

仓库中已提供适配层：

- CSS：`packages/core/src/styles/themes/cool-neutral.css`
- 入口：`packages/core/src/index.ts` 已导入，随 `@dp_ui/core/style.css` 一起产出
- 演示：playground 路由 `/cool-neutral`

---

## 2. 快速使用

### 2.1 引入样式

```ts
import '@dp_ui/core/style.css'
```

若项目已按全量或按需方式接入 `@dp_ui/core`，无需额外引入主题文件。

### 2.2 在容器上启用主题

```vue
<template>
  <!-- 浅色 -->
  <section data-dp-theme="cool-neutral">
    <DpButton :theme="{ variant: 'primary' }">提交</DpButton>
    <DpInput v-model="name" :comp="{ label: '服务名称' }" />
  </section>

  <!-- 深色 -->
  <section data-dp-theme="cool-neutral-dark">
    <DpCard :comp="{ title: '概览' }">…</DpCard>
  </section>
</template>
```

主题令牌遵循 CSS 变量继承，可作用于任意层级的容器（页面、布局、面板、Dialog 内部均可）。

### 2.3 与 `DpConfigProvider` 组合

`DpConfigProvider` 的根节点支持属性透传，可直接挂主题：

```vue
<DpConfigProvider data-dp-theme="cool-neutral">
  <DpLayoutBasic>…</DpLayoutBasic>
</DpConfigProvider>
```

也可以继续用 `themeOverrides` 在主题之上做局部微调：

```vue
<DpConfigProvider
  data-dp-theme="cool-neutral"
  :theme-overrides="{ 'color-accent': '#3f5bd6', 'radius-lg': '12px' }"
>
  …
</DpConfigProvider>
```

### 2.4 只覆盖部分令牌

```css
.my-scope {
  --dp-color-accent: #3364f0;
  --dp-size-btn-h: 34px;
}
```

---

## 3. 令牌映射

适配层把设计系统的原始变量映射为 `@dp_ui/core` 的语义变量：

| 设计系统 Token | dp_ui Token | 浅色 | 深色 |
| --- | --- | --- | --- |
| `--bg` | `--dp-color-bg` | `#fafafb` | `#101319` |
| `--surface` | `--dp-color-surface` | `#ffffff` | `#171a21` |
| `--surface-2` | `--dp-color-surface-2` | `#f4f5f7` | `#1d212a` |
| `--surface-3` | `--dp-color-surface-3` | `#eceef1` | `#252a34` |
| `--fg` | `--dp-color-fg` | `#1b1e26` | `#f1f3f7` |
| `--fg-2` | `--dp-color-fg-2` | `#3b404d` | `#c3c8d2` |
| `--muted` | `--dp-color-muted` | `#6d7483` | `#969db0` |
| `--border` | `--dp-color-border` | `#e4e6eb` | `rgba(255,255,255,.085)` |
| `--border-strong` | `--dp-color-border-strong` | `#d3d6dd` | `rgba(255,255,255,.17)` |
| `--accent` | `--dp-color-accent` | `#3364f0` | `#6f95ff` |
| `--accent-hover` | `--dp-color-accent-hover` | `#2a55d6` | `#8ba9ff` |
| `--accent-soft` | `--dp-color-accent-soft` | `#eef2ff` | `#1b2540` |
| `--accent-fg` | `--dp-color-accent-fg` | `#ffffff` | `#0a0f1e` |
| `--accent-2` | `--dp-color-accent-2` | `#0e8f9c` | `#4fc3cf` |
| `--accent-2-soft` | `--dp-color-accent-2-soft` | `#e6f6f7` | `#122a2e` |
| `--success` / `--success-soft` | `--dp-color-success` / `--dp-color-success-soft` | `#16875a` / `#e7f5ef` | `#4cc48d` / `#12271f` |
| `--warn` / `--warn-soft` | `--dp-color-warning` / `--dp-color-warning-soft` | `#a86a12` / `#fbf1de` | `#e0a750` / `#291f12` |
| `--danger` / `--danger-soft` | `--dp-color-danger` / `--dp-color-danger-soft` | `#d1392f` / `#fceceb` | `#f0746a` / `#2b1716` |
| `--r-xs … --r-lg` | `--dp-radius-xs/sm/md/lg` | 4 / 6 / 8 / 10 | 同左 |
| `--s1 … --s4` | `--dp-shadow-1/2/3` | s1 / s2 / s4 | 深色阴影 |
| `--t-fast` / `--t-base` | `--dp-dur-fast` / `--dp-dur-base` | 90ms / 140ms | 同左 |
| `--ease` | `--dp-ease-standard` | `cubic-bezier(.2,.7,.3,1)` | 同左 |

此外：

- 按钮/输入等控件高度通过 `--dp-size-btn-h*` 收紧为 28 / 32 / 40px，匹配该设计系统的紧凑密度。
- `--dp-color-primary`、`--dp-color-text`、`--dp-color-border-hover` 等兼容别名同步指向新语义色，既有代码无需改动。
- 焦点环统一为 `0 0 0 3px var(--dp-color-accent-soft)`（对应设计系统的 focus 光晕）。

---

## 4. 与默认设计体系的关系

| 主题 | 启用方式 | 说明 |
| --- | --- | --- |
| 默认（Design System Core） | 不设置属性 | `docs/DESIGN_SYSTEM_CORE.md` 的 OKLch 体系 |
| 默认深色 | `data-dp-theme="dark"` | 默认体系的深色令牌 |
| Cool Neutral | `data-dp-theme="cool-neutral"` | 本设计系统浅色 |
| Cool Neutral 深色 | `data-dp-theme="cool-neutral-dark"` | 本设计系统深色 |

两套主题可同时存在于页面不同区域，互不影响。

---

## 5. 需要注意的边界

1. **`@dp_ui/chat` 不自动跟随**：chat 包使用独立的 `--dpc-*` 令牌。若聊天区域也要使用该设计系统，需在 chat 的令牌层做同源映射（可复用本文件的色值），或在其容器上覆盖 `--dpc-*`。
2. **组件微差异**：适配层只改令牌，不逐个重写组件样式。例如设计系统按钮为 `32px / padding 12px`，而 `DpButton` 的默认水平内边距仍是 16px（中号）。若要求像素级一致，需在主题作用域内追加组件级 CSS。
3. **来源文件是临时产物**：`E:\WSXK\projects\open-design\.tmp\...` 属于 Open Design 运行时目录，可能被清理。适配层已把令牌复制进仓库，运行时不依赖该路径；升级设计系统时对照源 HTML 更新 CSS 即可。
4. **Portal 浮层需要主题落在 `html` / `body`**：`DpModal`、`DpSelect`、`DpTooltip`、`DpPopover` 通过 reka-ui 的 Portal 挂载到 `body`，若主题只写在页面内层容器上，浮层会回落到默认主题。需要浮层也跟随主题时，把 `data-dp-theme` 设在 `<html>` 或 `<body>` 上（演示页即如此处理）。
5. **`DESIGN.md` 是占位内容**：源目录的 `DESIGN.md` 只有章节标题，未包含具体规范；本仓库的令牌以 `cool-neutral-design-system-package-2.html` 中的 CSS 为准。

---

## 6. 本地验证

```bash
pnpm dev:web
# 打开 http://localhost:5173/cool-neutral
```

页面提供浅/深两套主题切换，覆盖按钮、表单、标签、表格、标签页、分页、提示与对话框。
