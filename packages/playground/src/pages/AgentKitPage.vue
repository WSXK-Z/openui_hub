<script setup lang="ts">
import { ref } from 'vue'
import {
    DpcApprovalCard,
    DpcConfigProvider,
    DpcContextCards,
    DpcLoadingState,
    DpcPromptBar,
    DpcStreamingText,
    DpcTaskRows,
    DpcThinkingState,
    DpcToolChips,
    type DpcApprovalQuestion,
    type DpcContextChunk,
    type DpcPromptModel,
    type DpcStreamingSource,
    type DpcStreamingToken,
    type DpcTaskRow,
    type DpcThinkingRow,
    type DpcToolDiff,
    type DpcToolDiffLine,
    type DpcToolStep,
} from '@dp_ui/chat'

const theme = ref<'light' | 'dark'>('light')

const chunk = (text: string) => text.match(/.{1,5}/g) ?? [text]

const streamTokens: DpcStreamingToken[] = [
    ...chunk('开心果是本季增长最快的口味，本月销量上涨 23%，毛利比香草高 8 个百分点。').map(
        (text) => ({ text }),
    ),
    { text: '', cite: true },
    ...chunk('核果类口味也在同步走高。').map((text) => ({ text })),
]

const sources: DpcStreamingSource[] = [
    { name: 'Scoop Data', domain: 'scoopdata.io', href: 'https://scoopdata.io/' },
    { name: 'Trends Index', domain: 'trends.google.com', href: 'https://trends.google.com/' },
    { name: 'Market Basket', domain: 'marketbasket.io', href: 'https://marketbasket.io/' },
]

const followUps = ['冬季哪些口味最好卖', '对比冰淇淋与软冰淇淋的毛利']

const thinkingRows: DpcThinkingRow[] = [
    { primary: '阅读口味简报' },
    { primary: '扫描供应商清单' },
    { primary: '比较品鉴记录', secondary: '6 个口味' },
    { primary: '撰写口味报告' },
]

const searchRows: DpcThinkingRow[] = [
    { primary: 'Joy Cone', secondary: 'joycone.com', href: 'https://joycone.com/' },
    { primary: 'WebstaurantStore', secondary: 'webstaurantstore.com', href: 'https://www.webstaurantstore.com/' },
    { primary: 'The Konery', secondary: 'thekonery.com', href: 'https://www.thekonery.com/' },
]

const toolSteps: DpcToolStep[] = [
    {
        icon: 'think',
        label: '思考',
        chip: '排产计划…',
        detail: [{ text: '周末需求集中在开心果，优先排产。' }, { text: '产能剩下两个夜间冷冻窗口。' }],
    },
    {
        icon: 'write',
        label: '写入 204 行',
        chip: 'ChurnSchedule.tsx',
        mono: true,
        detailMono: true,
        detail: [
            { text: '+ const windows = slots.filter((s) => s.temp <= -12)', tone: 'add' },
            { text: '+ return schedule(windows, { hero: "pistachio" })', tone: 'add' },
        ],
    },
    {
        icon: 'run',
        label: '构建并校验',
        chip: 'npm run freeze',
        mono: true,
        detailMono: true,
        detail: [{ text: '✓ built in 1.2s' }, { text: '✓ 34 checks passed' }],
    },
    {
        icon: 'read',
        label: '读取图片',
        chip: 'flavor-chart.png',
        mono: true,
        detail: [{ text: '1280 × 720 · 折线图，三个夏季。' }],
    },
]

const toolDiffs: DpcToolDiff[] = [
    { file: 'flavors.css', add: 13, del: 0 },
    { file: 'ChurnSchedule.tsx', add: 74, del: 41 },
]

const diffLines: Record<string, DpcToolDiffLine[]> = {
    'flavors.css': [
        { text: '.scoop-card {', tone: 'ctx' },
        { text: '  gap: 14px;', tone: 'del' },
        { text: '  gap: 12px;', tone: 'add' },
        { text: '  container-type: inline-size;', tone: 'add' },
        { text: '}', tone: 'ctx' },
    ],
    'ChurnSchedule.tsx': [
        { text: 'const slots = coldSlots(week);', tone: 'ctx' },
        { text: 'const windows = slots;', tone: 'del' },
        { text: 'const windows = slots.filter(', tone: 'add' },
        { text: '  (s) => s.temp <= -12,', tone: 'add' },
        { text: ');', tone: 'add' },
    ],
}

const approvalQuestions: DpcApprovalQuestion[] = [
    { q: '这次上线几个口味？', type: 'radio', options: ['三个（核心线）', '五个（整箱）', '只上一个主打'] },
    { q: '备哪些配料？', type: 'check', options: ['巧克力碎', '华夫脆', '彩针'] },
]

const taskRows: DpcTaskRow[] = [
    {
        key: 'verify',
        label: '校验供应商记录',
        amount: '12 家',
        status: 'done',
        details: [
            { label: '税号与联系方式匹配', meta: '12/12' },
            { label: '标记过期记录', meta: '0' },
        ],
    },
    {
        key: 'index',
        label: '生成补货清单',
        amount: '7 个 SKU',
        status: 'running',
        step: 2,
        details: [
            { label: '读取 POS 导出', meta: '3 个文件' },
            { label: '计算缺货风险', meta: '68%' },
        ],
    },
    {
        key: 'draft',
        label: '起草供应商邮件',
        amount: '2 封',
        status: 'sequence',
        step: 3,
        details: [{ label: '蛋筒供应商跟进', meta: '草稿' }],
    },
]

const contextChunks: DpcContextChunk[] = [
    {
        title: '供应商准入规则',
        chars: '290 字',
        body: '新乳品供应商进入补货流程前，必须先完成冷链认证校验。',
        source: 'Dairy Onboarding SOP.pdf',
        badge: 'PDF',
        tone: 'red',
    },
    {
        title: '季节性需求行',
        chars: '1,250 字',
        body: 'Q4 动销表：开心果 +18%，香草 +6%， rocky road −11%。',
        source: 'Sales Velocity Export.csv',
        badge: 'CSV',
        tone: 'green',
    },
]

const models: DpcPromptModel[] = [
    { key: 'flagship', name: 'Sprinkles 5', tag: '旗舰' },
    { key: 'basic', name: 'Vanilla 1', tag: '基础' },
]

const prompt = ref('')
const promptAttachments = ref<string[]>(['flavor-chart.png'])
const sent = ref<string[]>([])

function onSend(text: string) {
    sent.value = [...sent.value, text]
    prompt.value = ''
}

function onAttach() {
    if (!promptAttachments.value.includes('summer-menu.pdf')) {
        promptAttachments.value = [...promptAttachments.value, 'summer-menu.pdf']
    }
}

function removeAttachment(index: number) {
    promptAttachments.value = promptAttachments.value.filter((_, i) => i !== index)
}

const loadingVariants = ['Drive', 'Dots', 'Orbit', 'Surfer'] as const
</script>

<template>
    <DpcConfigProvider v-model:theme="theme" class="agent-kit">
        <div class="agent-kit__page">
            <div class="agent-kit__inner">
                <header class="agent-kit__header">
                    <div>
                        <p class="agent-kit__eyebrow">@dp_ui/chat · agent primitives</p>
                        <h1 class="agent-kit__title">Beautiful UI 设计语言 · Vue 3 移植</h1>
                        <p class="agent-kit__desc">
                            冷调中性色、发丝描边、分层阴影与紧凑圆角，取自 beautiful-ui；组件 API 遵循
                            <code>{ theme, comp }</code> 契约。
                        </p>
                    </div>
                    <button type="button" class="agent-kit__toggle" @click="theme = theme === 'light' ? 'dark' : 'light'">
                        {{ theme === 'light' ? '切换到深色' : '切换到浅色' }}
                    </button>
                </header>

                <section class="agent-kit__section">
                    <h2>LoadingState</h2>
                    <div class="agent-kit__row">
                        <DpcLoadingState
                            v-for="variant in loadingVariants"
                            :key="variant"
                            :comp="{ label: variant, variant }"
                        />
                    </div>
                </section>

                <section class="agent-kit__grid">
                    <div class="agent-kit__card">
                        <h2>ThinkingState · Steps</h2>
                        <DpcThinkingState
                            :comp="{ variant: 'Steps', rows: thinkingRows, active: '正在思考', done: '思考了 4 秒' }"
                        />
                    </div>
                    <div class="agent-kit__card">
                        <h2>ThinkingState · Search</h2>
                        <DpcThinkingState
                            :comp="{
                                variant: 'Search',
                                rows: searchRows,
                                query: '最好的华夫蛋筒供应商',
                                active: '正在联网搜索',
                                done: '已搜索网页',
                            }"
                        />
                    </div>
                </section>

                <section class="agent-kit__card">
                    <h2>StreamingText</h2>
                    <DpcStreamingText
                        :comp="{ content: streamTokens, sources, followUps, loop: false, fill: true }"
                    />
                </section>

                <section class="agent-kit__grid">
                    <div class="agent-kit__card">
                        <h2>ToolChips</h2>
                        <DpcToolChips :comp="{ steps: toolSteps, diffs: toolDiffs, diffLines }" />
                    </div>
                    <div class="agent-kit__card">
                        <h2>TaskRows</h2>
                        <DpcTaskRows :comp="{ rows: taskRows }" />
                    </div>
                </section>

                <section class="agent-kit__grid">
                    <div class="agent-kit__card">
                        <h2>ApprovalCard</h2>
                        <DpcApprovalCard :comp="{ questions: approvalQuestions }" />
                    </div>
                    <div class="agent-kit__card">
                        <h2>ContextCards</h2>
                        <DpcContextCards :comp="{ chunks: contextChunks }" />
                    </div>
                </section>

                <section class="agent-kit__card">
                    <h2>PromptBar</h2>
                    <DpcPromptBar
                        v-model="prompt"
                        :comp="{
                            models,
                            placeholder: '输入指令，或粘贴一段内容…',
                            attachments: promptAttachments,
                            variant: 'Rounded',
                        }"
                        @send="onSend"
                        @attach="onAttach"
                        @remove-attachment="removeAttachment"
                    />
                    <div v-if="sent.length" class="agent-kit__sent">
                        <span v-for="(item, index) in sent" :key="index">{{ item }}</span>
                    </div>
                </section>

                <footer class="agent-kit__footer">
                    组件与令牌均以 <code>--dpc-*</code> CSS 变量输出，亮/暗主题随
                    <code>DpcConfigProvider</code> 切换。
                </footer>
            </div>
        </div>
    </DpcConfigProvider>
</template>

<style scoped>
.agent-kit {
    min-height: calc(100vh - 47px);
    background: var(--dpc-color-page);
    color: var(--dpc-color-ink);
    font-family: var(--dpc-font-family);
}

.agent-kit__page {
    padding: 32px 20px 64px;
}

.agent-kit__inner {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 960px;
    margin: 0 auto;
}

.agent-kit__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 20px;
    border: 1px dashed var(--dpc-color-line);
    border-radius: var(--dpc-radius-window);
    background: var(--dpc-color-surface);
    box-shadow: var(--dpc-shadow-card);
}

.agent-kit__eyebrow {
    font-family: var(--dpc-font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--dpc-color-ink-3);
}

.agent-kit__title {
    margin-top: 6px;
    font-size: 21px;
    font-weight: 600;
    letter-spacing: -0.02em;
}

.agent-kit__desc {
    margin-top: 6px;
    max-width: 620px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dpc-color-ink-2);
}

.agent-kit__toggle {
    height: 28px;
    padding: 0 12px;
    border-radius: 9999px;
    background: var(--dpc-color-field);
    color: var(--dpc-color-ink);
    font-size: 12px;
    box-shadow: var(--dpc-shadow-btn);
    white-space: nowrap;
}

.agent-kit__section,
.agent-kit__card {
    padding: 16px;
    border-radius: var(--dpc-radius-card);
    background: var(--dpc-color-surface);
    box-shadow: var(--dpc-shadow-card);
}

.agent-kit__card h2,
.agent-kit__section h2 {
    margin-bottom: 12px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--dpc-color-ink-3);
}

.agent-kit__row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 24px;
}

.agent-kit__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
}

.agent-kit__sent {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
    font-size: 12.5px;
    color: var(--dpc-color-ink-2);
}

.agent-kit__footer {
    padding: 12px 4px;
    border-top: 1px dashed var(--dpc-color-line);
    font-size: 12px;
    color: var(--dpc-color-ink-3);
}

code {
    font-family: var(--dpc-font-mono);
    font-size: 11.5px;
    color: var(--dpc-color-ink-2);
}
</style>
