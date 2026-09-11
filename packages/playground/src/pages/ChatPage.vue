<script setup lang="ts">
import { computed, ref } from 'vue'
import {
    DpcBubble,
    DpcConfigProvider,
    DpcHeader,
    DpcIntroduction,
    DpcLayout,
    DpcLayoutContent,
    DpcLayoutSender,
    DpcLocale,
    DpcMarkdownCard,
    DpcPrompt,
    DpcSender,
    DpcToolbar,
    type DpcChatMessage,
    type DpcPromptItem,
} from '@dp_ui/chat'

const startPage = ref(true)
const messages = ref<DpcChatMessage[]>([])
const input = ref('')
const theme = ref<'light' | 'dark'>('light')
const isDark = computed(() => theme.value === 'dark')

const prompts: DpcPromptItem[] = [
    { key: 'article', label: '帮我写一篇文章', desc: '标题、大纲与正文生成' },
    { key: 'explain', label: '解释一段代码', desc: '粘贴代码并给出逐行讲解' },
    { key: 'summarize', label: '总结这段对话', desc: '提炼要点与待办' },
    { key: 'quicksort', label: '用 JS 写一个快速排序', desc: '附复杂度说明' },
]

let seq = 0
let timer: ReturnType<typeof setTimeout> | null = null

function pushUser(content: string) {
    messages.value.push({ id: `u-${seq++}`, role: 'user', content })
}

function pushAssistant(content = '', loading = false): DpcChatMessage {
    const index = messages.value.length
    messages.value.push({ id: `a-${seq++}`, role: 'assistant', content, loading })
    // 返回数组内的响应式代理：定时器里改 loading/content 才能触发列表重渲染
    return messages.value[index] as DpcChatMessage
}

function onSend(content: string) {
    const text = content.trim()
    if (!text) return
    startPage.value = false
    pushUser(text)
    const reply = pushAssistant('', true)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
        reply.loading = false
        reply.content = demoReply(text)
    }, 900)
}

function onPromptSelect(item: DpcPromptItem) {
    onSend(item.label)
}

function onRemove(msg: DpcChatMessage) {
    messages.value = messages.value.filter((m) => m !== msg)
}

function onRefresh(msg: DpcChatMessage) {
    msg.statusText = '正在重新生成…'
    msg.loading = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
        msg.loading = false
        msg.statusText = ''
        msg.content = '这是重新生成后的模拟回复。\n\n```ts\nconst ok = true\n```'
    }, 700)
}

function resetChat() {
    messages.value = []
    startPage.value = true
    input.value = ''
}

function demoReply(question: string): string {
    return [
        `收到你的问题：**${question}**`,
        '',
        '这是一条由 @dp_ui/chat（@dp_ui/core + UnoCSS）生成的**模拟**流式回复。',
        '',
        '```ts',
        "const hello = (name: string) => `Hi, ${name}!`",
        '',
        'console.log(hello("@dp_ui/chat"))',
        '```',
        '',
        '你可以点击气泡下方的操作按钮体验「复制 / 点赞 / 重新生成 / 删除」。',
    ].join('\n')
}
</script>

<template>
    <DpcLocale :comp="{ locale: 'zh-CN' }">
        <div class="chat-demo h-[calc(100vh-47px)] w-full overflow-hidden p-4 transition-colors"
            style="background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 48%, #ecfeff 100%)">
            <DpcConfigProvider v-model:theme="theme"
                class="chat-card mx-auto block h-full w-full max-w-[920px] overflow-hidden rounded-2xl border border-[var(--dpc-color-border)] bg-[var(--dpc-color-surface)] shadow-[0_16px_40px_-12px_rgb(30_41_59_/_0.18)]">
                <DpcLayout>
                    <DpcHeader title="AI 助手 · @dp_ui/chat">
                        <template #logo>
                            <span
                                class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--dpc-color-primary),#8b5cf6)] text-xs font-bold text-white">
                                DP
                            </span>
                        </template>
                        <template #actions>
                            <button type="button"
                                class="rounded-full border border-[var(--dpc-color-border)] px-3 py-1 text-xs text-[var(--dpc-color-text-secondary)] transition-colors hover:border-[var(--dpc-color-primary)] hover:text-[var(--dpc-color-primary)]"
                                @click="theme = isDark ? 'light' : 'dark'">
                                {{ isDark ? '浅色' : '深色' }}
                            </button>
                            <button type="button"
                                class="rounded-full border border-[var(--dpc-color-border)] px-3 py-1 text-xs text-[var(--dpc-color-text-secondary)] transition-colors hover:border-[var(--dpc-color-primary)] hover:text-[var(--dpc-color-primary)]"
                                @click="resetChat">
                                新建对话
                            </button>
                        </template>
                    </DpcHeader>

                    <DpcLayoutContent :comp="{ autoScroll: true, showScrollArrow: true }">
                        <DpcIntroduction v-if="startPage" title="Hi，欢迎使用 @dp_ui/chat"
                            description="参照 MateChat 的聊天界面组件库，底层 @dp_ui/core + UnoCSS、浮层/提示复用 core 的 DpPopover/DpTooltip（chat 不直接依赖 reka-ui）。">
                            <DpcPrompt class="mt-3 w-full max-w-md" :comp="{ direction: 'vertical', list: prompts }"
                                @select="onPromptSelect" />
                        </DpcIntroduction>

                        <div v-else
                            class="mx-auto flex w-full max-w-[var(--dpc-chat-max-width)] flex-1 flex-col gap-5 px-4 py-6">
                            <DpcBubble v-for="m in messages" :key="m.id" class="dpc-demo-msg" :comp="{
                                role: m.role,
                                content: m.content,
                                loading: Boolean(m.loading),
                                statusText: m.statusText ?? '',
                                avatar: m.role === 'assistant' ? { name: 'DP' } : null,
                            }">
                                <template v-if="m.role === 'assistant' && !m.loading" #content>
                                    <DpcMarkdownCard :comp="{ content: m.content }" />
                                </template>

                                <template v-if="m.role === 'assistant' && !m.loading" #footer>
                                    <DpcToolbar :comp="{ content: m.content, showRefresh: true, showDelete: true }"
                                        @delete="onRemove(m)" @refresh="onRefresh(m)" />
                                </template>
                            </DpcBubble>
                        </div>
                    </DpcLayoutContent>

                    <DpcLayoutSender>
                        <div class="mx-auto w-full max-w-[var(--dpc-chat-max-width)] px-4 py-3">
                            <DpcSender v-model="input" :comp="{
                                placeholder: '输入消息，Enter 发送，Shift + Enter 换行',
                                showCount: true,
                                maxLength: 2000,
                                autosize: { minRows: 1, maxRows: 6 },
                            }" @send="onSend">
                                <template #footer>
                                    <p class="mt-1 text-center text-xs text-[var(--dpc-color-text-secondary)]">
                                        内容由演示模拟生成，无法确保准确性与完整性
                                    </p>
                                </template>
                            </DpcSender>
                        </div>
                    </DpcLayoutSender>
                </DpcLayout>
            </DpcConfigProvider>
        </div>
    </DpcLocale>
</template>
