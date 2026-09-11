<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import DemoBlock from '../components/DemoBlock.vue'
// 示例（既用于在线渲染，也作为「查看代码」的真实源码）
import DemoBasic from '../demos/button/DemoBasic.vue'
import DemoBasicRaw from '../demos/button/DemoBasic.vue?raw'
import DemoVariant from '../demos/button/DemoVariant.vue'
import DemoVariantRaw from '../demos/button/DemoVariant.vue?raw'
import DemoSize from '../demos/button/DemoSize.vue'
import DemoSizeRaw from '../demos/button/DemoSize.vue?raw'
import DemoGhost from '../demos/button/DemoGhost.vue'
import DemoGhostRaw from '../demos/button/DemoGhost.vue?raw'
import DemoIconRound from '../demos/button/DemoIconRound.vue'
import DemoIconRoundRaw from '../demos/button/DemoIconRound.vue?raw'
import DemoBlockDemo from '../demos/button/DemoBlock.vue'
import DemoBlockDemoRaw from '../demos/button/DemoBlock.vue?raw'
import DemoState from '../demos/button/DemoState.vue'
import DemoStateRaw from '../demos/button/DemoState.vue?raw'
import DemoEvents from '../demos/button/DemoEvents.vue'
import DemoEventsRaw from '../demos/button/DemoEvents.vue?raw'

const demos = [
    { id: 'button-basic', title: '基础用法', desc: '按钮的默认形态与主要形态。', comp: DemoBasic, source: DemoBasicRaw },
    { id: 'button-variant', title: '类型', desc: '通过 theme.variant 切换六种语义颜色。', comp: DemoVariant, source: DemoVariantRaw },
    { id: 'button-size', title: '尺寸', desc: 'small / medium / large，高度由 --dp-size-btn-h-* 控制。', comp: DemoSize, source: DemoSizeRaw },
    { id: 'button-ghost', title: '幽灵按钮', desc: 'theme.ghost 无边框/底色，文字色随 variant。', comp: DemoGhost, source: DemoGhostRaw },
    {
        id: 'button-icon-round',
        title: '图标与圆角',
        desc: 'theme.icon 纯图标方形按钮；theme.round 圆形按钮。',
        comp: DemoIconRound,
        source: DemoIconRoundRaw,
    },
    { id: 'button-block', title: '块级按钮', desc: 'theme.block 占满整行宽度。', comp: DemoBlockDemo, source: DemoBlockDemoRaw },
    {
        id: 'button-state',
        title: '禁用与加载',
        desc: 'comp.disabled 禁用；comp.loading 显示 spinner 并禁用点击。',
        comp: DemoState,
        source: DemoStateRaw,
    },
    { id: 'button-events', title: '事件与原生 type', desc: '点击事件与 comp.nativeType。', comp: DemoEvents, source: DemoEventsRaw },
] as const

const toc = [
    ...demos.map((d) => ({ id: d.id, label: d.title })),
    { id: 'button-api', label: 'API' },
]

// 简易 scrollspy：高亮当前小节
const activeId = ref<string>('button-basic')

function updateActive() {
    let current = toc[0]?.id ?? ''
    for (const item of toc) {
        const el = document.getElementById(item.id)
        if (el && el.getBoundingClientRect().top <= 120) current = item.id
    }
    activeId.value = current
}

onMounted(() => {
    updateActive()
    window.addEventListener('scroll', updateActive, { passive: true })
})
onBeforeUnmount(() => {
    window.removeEventListener('scroll', updateActive)
})

interface ApiRow {
    name: string
    type: string
    def: string
    desc: string
}

const styleRows: ApiRow[] = [
    { name: 'variant', type: "'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'", def: "'default'", desc: '颜色语义类型（ghost 时决定文字色）' },
    { name: 'size', type: "'small' | 'medium' | 'large'", def: "'medium'", desc: '尺寸，高度由 --dp-size-btn-h-* 变量控制' },
    { name: 'round', type: 'boolean', def: 'false', desc: '圆形按钮（rounded-full）' },
    { name: 'ghost', type: 'boolean', def: 'false', desc: '幽灵按钮：无边框/底色，文字色随 variant' },
    { name: 'icon', type: 'boolean', def: 'false', desc: '纯图标模式：方形、无内边距，宽高取对应 size 变量' },
    { name: 'block', type: 'boolean', def: 'false', desc: '块级按钮（width: 100%）' },
    { name: 'class', type: 'ClassValue', def: '-', desc: '追加类名（与透传 class 合并）' },
    { name: 'style', type: 'StyleValue', def: '-', desc: '追加内联样式' },
    {
        name: 'cssVars',
        type: 'Record<string, string | number>',
        def: '-',
        desc: 'CSS 变量覆盖，写入根元素；key 省略 --dp- 前缀自动补齐（如 {"--dp-size-btn-h-sm":"24px"} 可微调图标按钮尺寸）',
    },
]

const compRows: ApiRow[] = [
    { name: 'loading', type: 'boolean', def: 'false', desc: '加载中：显示内置 spinner，并禁用点击' },
    { name: 'disabled', type: 'boolean', def: 'false', desc: '禁用按钮' },
    { name: 'nativeType', type: "'button' | 'submit' | 'reset'", def: "'button'", desc: '原生 <button> 的 type' },
]

const eventRows: ApiRow[] = [
    { name: 'click', type: '(event: MouseEvent) => void', def: '-', desc: '点击时触发（loading / disabled 时不触发）' },
]

const slotRows: ApiRow[] = [
    { name: 'default', type: '内容', def: '-', desc: '按钮内容（图标 / 文本）；loading 时组件会在其前追加 spinner' },
]
</script>

<template>
    <div class="mx-auto flex gap-10 px-6 py-8 sm:px-8 lg:px-12" style="max-width: 1100px">
        <!-- 正文 -->
        <div class="min-w-0 flex-1">
            <!-- 标题 / 简介 -->
            <header>
                <div class="mb-1 flex items-center gap-2 text-xs text-[var(--dp-color-text-secondary,#6b7280)]">
                    <RouterLink to="/docs" class="hover:text-[var(--dp-color-primary,#3b82f6)]">组件文档</RouterLink>
                    <span>/</span>
                    <span>通用</span>
                </div>
                <h1 class="text-[26px] font-semibold leading-9 text-[var(--dp-color-text,#1f2937)]">
                    Button
                    <span class="ml-2 text-lg font-normal text-[var(--dp-color-text-secondary,#6b7280)]">按钮</span>
                </h1>
                <p class="mt-3 max-w-2xl text-sm leading-6 text-[var(--dp-color-text,#1f2937)]">
                    用于触发一个动作，如提交表单、打开弹窗、开始/停止等。提供六种语义类型、三种尺寸，以及
                    <code
                        class="rounded bg-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_40%,transparent)] px-1 py-0.5 font-mono text-xs">ghost</code>
                    （幽灵）、
                    <code
                        class="rounded bg-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_40%,transparent)] px-1 py-0.5 font-mono text-xs">icon</code>
                    （纯图标）、
                    <code
                        class="rounded bg-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_40%,transparent)] px-1 py-0.5 font-mono text-xs">round</code>
                    、
                    <code
                        class="rounded bg-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_40%,transparent)] px-1 py-0.5 font-mono text-xs">block</code>
                    形态与 loading / disabled 状态。Props 采用
                    <code
                        class="rounded bg-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_40%,transparent)] px-1 py-0.5 font-mono text-xs">{ theme, comp }</code>
                    契约：外观属性放 theme、行为属性放 comp。
                </p>
                <p class="mt-2 text-sm text-[var(--dp-color-text-secondary,#6b7280)]">
                    对应组件：<code class="font-mono text-[var(--dp-color-primary,#3b82f6)]">DpButton</code>
                    <RouterLink to="/components" class="ml-2 text-[var(--dp-color-primary,#3b82f6)] hover:underline">
                        组件大全 ↗</RouterLink>
                </p>
            </header>

            <!-- 示例 -->
            <div class="mt-8 flex flex-col gap-8">
                <DemoBlock v-for="d in demos" :key="d.id" :id="d.id" :title="d.title" :desc="d.desc" :source="d.source">
                    <component :is="d.comp" />
                </DemoBlock>
            </div>

            <!-- API -->
            <section id="button-api" class="mt-14 scroll-mt-16">
                <h2 class="mb-4 text-xl font-semibold text-[var(--dp-color-text,#1f2937)]">API</h2>

                <h3 class="mb-2 mt-6 text-[15px] font-medium text-[var(--dp-color-text,#1f2937)]">
                    Props · theme（外观）
                </h3>
                <table
                    class="w-full border-collapse overflow-hidden rounded-[var(--dp-radius-md,8px)] border border-[var(--dp-color-border,#e5e7eb)] bg-white text-left text-sm">
                    <thead>
                        <tr
                            class="bg-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_30%,transparent)] text-[var(--dp-color-text,#1f2937)]">
                            <th class="w-40 px-4 py-2 font-medium">名称</th>
                            <th class="px-4 py-2 font-medium">类型</th>
                            <th class="w-28 px-4 py-2 font-medium">默认值</th>
                            <th class="px-4 py-2 font-medium">说明</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in styleRows" :key="row.name"
                            class="border-t border-[var(--dp-color-border,#e5e7eb)] text-[var(--dp-color-text,#1f2937)]">
                            <td class="px-4 py-2 font-mono text-[13px] text-[var(--dp-color-primary,#3b82f6)]">{{
                                row.name }}</td>
                            <td class="px-4 py-2 font-mono text-xs text-[var(--dp-color-text,#1f2937)]">{{ row.type }}
                            </td>
                            <td class="px-4 py-2 font-mono text-xs text-[var(--dp-color-text-secondary,#6b7280)]">{{
                                row.def }}</td>
                            <td class="px-4 py-2 text-xs leading-5 text-[var(--dp-color-text-secondary,#6b7280)]">{{
                                row.desc }}</td>
                        </tr>
                    </tbody>
                </table>

                <h3 class="mb-2 mt-6 text-[15px] font-medium text-[var(--dp-color-text,#1f2937)]">
                    Props · comp（行为）
                </h3>
                <table
                    class="w-full border-collapse overflow-hidden rounded-[var(--dp-radius-md,8px)] border border-[var(--dp-color-border,#e5e7eb)] bg-white text-left text-sm">
                    <thead>
                        <tr
                            class="bg-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_30%,transparent)] text-[var(--dp-color-text,#1f2937)]">
                            <th class="w-40 px-4 py-2 font-medium">名称</th>
                            <th class="px-4 py-2 font-medium">类型</th>
                            <th class="w-28 px-4 py-2 font-medium">默认值</th>
                            <th class="px-4 py-2 font-medium">说明</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in compRows" :key="row.name"
                            class="border-t border-[var(--dp-color-border,#e5e7eb)] text-[var(--dp-color-text,#1f2937)]">
                            <td class="px-4 py-2 font-mono text-[13px] text-[var(--dp-color-primary,#3b82f6)]">{{
                                row.name }}</td>
                            <td class="px-4 py-2 font-mono text-xs text-[var(--dp-color-text,#1f2937)]">{{ row.type }}
                            </td>
                            <td class="px-4 py-2 font-mono text-xs text-[var(--dp-color-text-secondary,#6b7280)]">{{
                                row.def }}</td>
                            <td class="px-4 py-2 text-xs leading-5 text-[var(--dp-color-text-secondary,#6b7280)]">{{
                                row.desc }}</td>
                        </tr>
                    </tbody>
                </table>

                <h3 class="mb-2 mt-6 text-[15px] font-medium text-[var(--dp-color-text,#1f2937)]">Events</h3>
                <table
                    class="w-full border-collapse overflow-hidden rounded-[var(--dp-radius-md,8px)] border border-[var(--dp-color-border,#e5e7eb)] bg-white text-left text-sm">
                    <thead>
                        <tr
                            class="bg-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_30%,transparent)] text-[var(--dp-color-text,#1f2937)]">
                            <th class="w-40 px-4 py-2 font-medium">名称</th>
                            <th class="px-4 py-2 font-medium">类型</th>
                            <th class="w-28 px-4 py-2 font-medium">默认值</th>
                            <th class="px-4 py-2 font-medium">说明</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in eventRows" :key="row.name"
                            class="border-t border-[var(--dp-color-border,#e5e7eb)] text-[var(--dp-color-text,#1f2937)]">
                            <td class="px-4 py-2 font-mono text-[13px] text-[var(--dp-color-primary,#3b82f6)]">{{
                                row.name }}</td>
                            <td class="px-4 py-2 font-mono text-xs text-[var(--dp-color-text,#1f2937)]">{{ row.type }}
                            </td>
                            <td class="px-4 py-2 font-mono text-xs text-[var(--dp-color-text-secondary,#6b7280)]">{{
                                row.def }}</td>
                            <td class="px-4 py-2 text-xs leading-5 text-[var(--dp-color-text-secondary,#6b7280)]">{{
                                row.desc }}</td>
                        </tr>
                    </tbody>
                </table>

                <h3 class="mb-2 mt-6 text-[15px] font-medium text-[var(--dp-color-text,#1f2937)]">Slots</h3>
                <table
                    class="w-full border-collapse overflow-hidden rounded-[var(--dp-radius-md,8px)] border border-[var(--dp-color-border,#e5e7eb)] bg-white text-left text-sm">
                    <thead>
                        <tr
                            class="bg-[color-mix(in_srgb,var(--dp-color-border,#e5e7eb)_30%,transparent)] text-[var(--dp-color-text,#1f2937)]">
                            <th class="w-40 px-4 py-2 font-medium">名称</th>
                            <th class="px-4 py-2 font-medium">类型</th>
                            <th class="w-28 px-4 py-2 font-medium">默认值</th>
                            <th class="px-4 py-2 font-medium">说明</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in slotRows" :key="row.name"
                            class="border-t border-[var(--dp-color-border,#e5e7eb)] text-[var(--dp-color-text,#1f2937)]">
                            <td class="px-4 py-2 font-mono text-[13px] text-[var(--dp-color-primary,#3b82f6)]">{{
                                row.name }}</td>
                            <td class="px-4 py-2 font-mono text-xs text-[var(--dp-color-text,#1f2937)]">{{ row.type }}
                            </td>
                            <td class="px-4 py-2 font-mono text-xs text-[var(--dp-color-text-secondary,#6b7280)]">{{
                                row.def }}</td>
                            <td class="px-4 py-2 text-xs leading-5 text-[var(--dp-color-text-secondary,#6b7280)]">{{
                                row.desc }}</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <!-- 上一页 / 下一页 -->
            <nav class="mt-14 grid grid-cols-2 gap-4">
                <RouterLink to="/docs"
                    class="group rounded-[var(--dp-radius-md,8px)] border border-[var(--dp-color-border,#e5e7eb)] bg-white p-4 transition-colors hover:border-[var(--dp-color-primary,#3b82f6)]">
                    <div class="text-xs text-[var(--dp-color-text-secondary,#6b7280)]">← 上一页</div>
                    <div
                        class="mt-1 text-sm font-medium text-[var(--dp-color-text,#1f2937)] group-hover:text-[var(--dp-color-primary,#3b82f6)]">
                        组件文档首页
                    </div>
                </RouterLink>
                <RouterLink to="/docs/icon"
                    class="group rounded-[var(--dp-radius-md,8px)] border border-[var(--dp-color-border,#e5e7eb)] bg-white p-4 text-right transition-colors hover:border-[var(--dp-color-primary,#3b82f6)]">
                    <div class="text-xs text-[var(--dp-color-text-secondary,#6b7280)]">下一页 →</div>
                    <div
                        class="mt-1 text-sm font-medium text-[var(--dp-color-text,#1f2937)] group-hover:text-[var(--dp-color-primary,#3b82f6)]">
                        Icon 图标
                    </div>
                </RouterLink>
            </nav>
        </div>

        <!-- 右侧页内目录 -->
        <aside class="sticky top-16 hidden w-40 shrink-0 self-start lg:block">
            <div class="text-xs font-medium text-[var(--dp-color-text-secondary,#6b7280)]">本页目录</div>
            <ul class="mt-2 flex flex-col gap-1 border-l border-[var(--dp-color-border,#e5e7eb)]">
                <li v-for="item in toc" :key="item.id">
                    <a :href="`#${item.id}`" class="block border-l-2 px-3 py-1 text-[13px] leading-5 transition-colors"
                        :class="activeId === item.id
                            ? 'border-[var(--dp-color-primary,#3b82f6)] text-[var(--dp-color-primary,#3b82f6)]'
                            : 'border-transparent text-[var(--dp-color-text-secondary,#6b7280)] hover:text-[var(--dp-color-text,#1f2937)]'">
                        {{ item.label }}
                    </a>
                </li>
            </ul>
        </aside>
    </div>
</template>
