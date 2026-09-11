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
| 国际化 | `DpcLocale` `useDpcLocale`                                                          | zh-CN / en-US，可局部覆盖文案                         |

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
│                         PopperTrigger / Prompt / Sender / Toolbar
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
- `DpcMarkdownCard` 为精简版（代码块 + 文本）；`DpcMention` 为候选弹层基础版。后续增强：完整 Markdown / 流式输出 / 记忆管理 / 与 @dp_ui/core 基础组件的组合封装。
