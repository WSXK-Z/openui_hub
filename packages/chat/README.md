# @dp_ui/chat

基于 **@dp_ui/core + UnoCSS** 的 AI 对话界面组件库（不直接依赖 reka-ui，浮层/提示等基础交互复用 @dp_ui/core 的 `DpPopover` / `DpTooltip`），参照 [MateChat](https://matechat.gitcode.com/) 的组件族设计，与 **@dp_ui/core** 采用同一套技术架构与工程约定（Vue 3.5 · TypeScript · Vite 库模式 · Vitest · oxlint/oxfmt）。

> 技术约束：除 `@dp_ui/core`、`unocss` 外不引入其它第三方组件库（不直接依赖 reka-ui，浮层/提示能力经由 @dp_ui/core 提供）；不使用 CSS 预处理器，样式一律通过 UnoCSS 原子类 + `--dpc-*` CSS 变量表达。

## 设计要点

- **独立命名空间**：组件前缀 `Dpc*`（`DpcLayout` / `DpcBubble` / `DpcSender` …），CSS 变量 `--dpc-*`，UnoCSS preset `presetDpChat`。与 @dp_ui/core 的 `Dp*` / `--dp-*` 共存不冲突，可按需在应用里同时使用两套库。
- **组件 props 契约**：与 @dp_ui/core 相同的 `{ theme, comp }` 统一契约（`useDpcProps` 合并默认值、`cssVars` 自动补齐 `--dpc-` 前缀；原生 `style`/`class` 走透传）。
- **全量 / 按需**：`app.use(DpChat)` 全量注册；或具名导入 tree-shaking；或 `@dp_ui/chat/components/<Name>` 子路径按需引入。
- **相对导入**：源码内部使用相对导入（不依赖 `@` 别名），便于 playground 等消费方在 dev 通过 vite alias 直连源码。
- **基于 @dp_ui/core**：通用基建（`withInstall` / `createInstaller` 及组件注册类型）直接复用 `@dp_ui/core`（peer 依赖），chat 不再重复实现；操作按钮（Attachment 触发 / Toolbar 动作 / FileList 删除·重试 / Layout 滚动箭头 / Sender 发送）统一复用 `DpButton`（`ghost` / `icon` 形态），hover 提示用 `DpTooltip`，`DpcMention` / `DpcPopperTrigger` 的浮层用 `DpPopover`（均来自 @dp_ui/core），chat 自身不引入 reka-ui、也不再手写原生操作按钮；仍保持 `Dpc*` / `--dpc-*` 独立命名空间与独立 preset，可与 core 共存。

## 组件清单

| 分组   | 组件                                                                                | 说明                                                  |
| ------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 布局   | `DpcLayout` `DpcLayoutHeader` `DpcLayoutContent` `DpcLayoutSender` `DpcLayoutAside` | 聊天外壳（三行网格）；Content 支持自动吸底 + 滚动箭头 |
| 会话   | `DpcHeader` `DpcIntroduction` `DpcPrompt` `DpcList`                                 | 顶栏 / 欢迎引导 / 建议语 / 通用可选中列表             |
| 对话   | `DpcBubble` `DpcBubbleLoading` `DpcSender` `DpcToolbar`                             | 消息气泡 / 打字指示 / 输入发送器 / 操作工具栏         |
| 增强   | `DpcAttachment` `DpcFileList` `DpcMention` `DpcPopperTrigger`                       | 附件选择 / 附件列表 / @提及候选 / 浮层触发器          |
| 内容   | `DpcMarkdownCard`                                                                   | Markdown 卡片（v1：代码块 + 纯文本；完整渲染待增强）  |
| Agent  | `DpcLoadingState` `DpcThinkingState` `DpcStreamingText` `DpcToolChips`              | 加载态 / 思考追踪 / 流式正文 / 工具调用与 diff        |
| Agent  | `DpcApprovalCard` `DpcTaskRows` `DpcContextCards` `DpcPromptBar`                    | 人在环问答 / 任务状态 / 检索分块 / 输入条             |
| 国际化 | `DpcLocale` `useDpcLocale`                                                          | zh-CN / en-US，可局部覆盖文案                         |

### Agent 原语（设计语言移植自 beautiful-ui）

`DpcLoadingState`、`DpcThinkingState`、`DpcStreamingText`、`DpcToolChips`、`DpcApprovalCard`、`DpcTaskRows`、`DpcContextCards`、`DpcPromptBar` 的视觉语言移植自 [beautiful-ui](https://github.com/slev12397/beautiful-ui)（MIT）：冷调 oklch 中性色、1px 实色发丝线、分层语义阴影、chip 6 / control 8 / card 10 / window 14 的紧凑圆角，以及 Inter + JetBrains Mono 字体组合。它们与既有组件共用 `{ theme, comp }` 契约和 `--dpc-*` 令牌，不新增运行时依赖。

```vue
<DpcStreamingText
  :comp="{
    content: [{ text: 'Hello' }, { text: '', cite: true }],
    sources: [{ name: 'Docs', domain: 'example.com', href: 'https://example.com' }],
    followUps: ['Tell me more'],
    loop: false,
  }"
  @done="onDone"
  @follow-up="onSend"
/>

<DpcPromptBar
  v-model="draft"
  :comp="{ models: [{ key: 'default', name: 'Default' }], attachments: [] }"
  @send="onSend"
/>
```

- `DpcStreamingText` 暴露 `complete()` / `restart()` / `setCount(n)`，也可关闭 `autoPlay` 由真实 token 流驱动。
- `DpcThinkingState` / `DpcToolChips` / `DpcTaskRows` / `DpcContextCards` 均支持 `autoPlay: false` 直接展示最终态。
- `DpcApprovalCard` 单选自动前进、多选等待确认，提交后通过 `submitted` 回传全部答案。
- 完整示例见 playground 的 `/agent-kit` 路由（`packages/playground/src/pages/AgentKitPage.vue`）。

## 快速开始

```ts
// 全量注册
import DpChat from '@dp_ui/chat'
import '@dp_ui/chat/style.css'
createApp(App).use(DpChat).mount('#app')
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  DpcLayout,
  DpcHeader,
  DpcLayoutContent,
  DpcLayoutSender,
  DpcSender,
  DpcBubble,
  DpcIntroduction,
  DpcPrompt,
} from '@dp_ui/chat'

const startPage = ref(true)
const messages = ref([{ id: '1', role: 'assistant', content: '你好，有什么可以帮你？' }])
const input = ref('')

function onSend(content: string) {
  messages.value.push({ id: Date.now().toString(), role: 'user', content })
  startPage.value = false
}
</script>

<template>
  <DpcLayout class="h-screen">
    <DpcHeader title="AI 助手" />
    <DpcLayoutContent>
      <DpcIntroduction
        v-if="startPage"
        title="Hi，欢迎使用"
        description="基于 @dp_ui/chat 的 AI 助手"
      >
        <DpcPrompt
          :comp="{ direction: 'horizontal', list: [{ key: 'a', label: '帮我写一篇文章' }] }"
          @select="onSend($event.label)"
        />
      </DpcIntroduction>
      <DpcBubble
        v-for="m in messages"
        :key="m.id"
        :comp="{ role: m.role as any, content: m.content }"
      />
    </DpcLayoutContent>
    <DpcLayoutSender>
      <DpcSender v-model="input" @send="onSend" />
    </DpcLayoutSender>
  </DpcLayout>
</template>
```

## 设计令牌

令牌采用 beautiful-ui 的视觉体系：`oklch` 冷调蓝灰、实色发丝描边、1px 描边 + 平滑层叠的语义阴影（`--dpc-shadow-hairline/btn/card/raised/overlay`），以及 chip / control / card / window 四级圆角。

- 运行时 CSS 变量由 `@dp_ui/chat/style.css` 注入 `:root`（`--dpc-*`），任意层级可覆盖。
- UnoCSS 主题令牌通过 preset 继承：

```ts
// uno.config.ts
import { presetDpChat } from '@dp_ui/chat/unocss'
export default defineConfig({ presets: [presetDpChat()] })
```

- 组件级覆盖：`<DpcBubble :theme="{ cssVars: { 'color-primary': '#7c3aed' } }" />`。

## 主题（亮 / 暗）

用 `DpcConfigProvider` 包裹任意聊天区域即可按容器切换亮/暗主题，并做令牌级微调（无需改动任何子组件）：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DpcConfigProvider } from '@dp_ui/chat'
const theme = ref<'light' | 'dark'>('light')
</script>

<template>
  <DpcConfigProvider
    v-model:theme="theme"
    :comp="{ themeOverrides: { 'color-primary': '#7c3aed' } }"
  >
    <!-- 内部所有 @dp_ui/chat 组件随 data-dpc-theme 自动切换暗色变量 -->
    <DpcLayout class="h-screen">…</DpcLayout>
  </DpcConfigProvider>
</template>
```

- 暗色调色板内置（`tokens/theme.ts` 的 `dpcColorsDark` / `dpcCssVarsDark`，样式层在 `[data-dpc-theme='dark']` 生效）。
- 子组件可用 `useDpcTheme()`（`import { useDpcTheme } from '@dp_ui/chat'`）读取当前主题与覆盖值。

## 目录结构

```
src/
├── index.ts              全量入口（import 'uno.css' + 样式 + createInstaller）
├── components/           Attachment / Bubble / FileList / Header / Introduction /
│                         Layout / List / Locale / MarkdownCard / Mention /
│                         PopperTrigger / Prompt / Sender / Toolbar /
│                         LoadingState / ThinkingState / StreamingText / ToolChips /
│                         ApprovalCard / TaskRows / ContextCards / PromptBar
├── composables/          useDpcProps（{ theme, comp } 契约）
├── internal/             icons（内联 SVG）
├── styles/index.css      reset + --dpc-* 变量 + 关键帧
├── tokens/               theme.ts + presetDpChat.ts
├── types/                dpc-props.ts + chat.ts
└── utils/                withInstall.ts + createInstaller
```

## 开发命令

```bash
pnpm --filter @dp_ui/chat type-check   # 类型检查（vue-tsc --build）
pnpm --filter @dp_ui/chat test:unit    # 单元测试（vitest）
pnpm --filter @dp_ui/chat lint         # oxlint
pnpm --filter @dp_ui/chat fmt          # oxfmt
pnpm --filter @dp_ui/chat build:dist   # 产物（dist/）
```

## 状态与路线

- v0.1 已实现核心聊天闭环（Layout / Header / Bubble / Sender / Toolbar / Introduction / Prompt / List / Locale）。
- 设计令牌与 8 个 Agent 原语已按 beautiful-ui 视觉体系落地，覆盖思考、流式、工具调用、审批、任务、检索与输入。
- `DpcMarkdownCard` 为精简版（代码块 + 文本）；`DpcMention` 为候选弹层基础版。后续增强：完整 Markdown / 记忆管理 / 与 @dp_ui/core 基础组件的组合封装。
