<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { applySiteTheme } from '../docs/theme'
import {
    DpAlert,
    DpButton,
    DpCard,
    DpInput,
    DpModal,
    DpPagination,
    DpSwitch,
    DpTable,
    DpTag,
    DpTabs,
} from '@dp_ui/core'

const theme = ref<'cool-neutral' | 'cool-neutral-dark'>('cool-neutral')
const isDark = () => theme.value === 'cool-neutral-dark'

const columns = [
    { key: 'service', title: '服务' },
    { key: 'status', title: '状态' },
    { key: 'rpm', title: '请求 / 分钟', align: 'right' as const },
]
const rows = [
    { service: 'dp-uaip-ai', status: '健康', rpm: '12,480' },
    { service: 'dp-ump-api-gateway', status: '降级', rpm: '8,120' },
    { service: 'dp-ump-service', status: '健康', rpm: '3,904' },
]

const tabItems = [
    { label: '概览', value: 'overview', content: '展示服务的健康度、吞吐与依赖拓扑。' },
    { label: '日志', value: 'logs', content: '按实例与级别检索最近日志。' },
    { label: '配置', value: 'config', content: '查看并下发实例配置。' },
]
const tab = ref('overview')

const input = ref('dp-uaip-ai')
const enabled = ref(true)
const page = ref(2)
const modalOpen = ref(false)

function toggleTheme() {
    theme.value = isDark() ? 'cool-neutral' : 'cool-neutral-dark'
}

// Dialog / Select / Tooltip 通过 Portal 挂到 body，主题需落在 html 上才能覆盖浮层
function applyThemeToDocument() {
    document.documentElement.setAttribute('data-dp-theme', theme.value)
}

onMounted(applyThemeToDocument)
watch(theme, applyThemeToDocument)
// 离开演示页时恢复演示站主题，避免把浮层主题留在 cool-neutral 上
onBeforeUnmount(() => applySiteTheme())
</script>

<template>
    <div :data-dp-theme="theme" class="cn">
        <div class="cn__inner">
            <header class="cn__header">
                <div>
                    <p class="cn__eyebrow">COOL NEUTRAL · DESIGN SYSTEM</p>
                    <h1>@dp_ui/core · 冷调中性色主题</h1>
                    <p class="cn__lead">
                        令牌来自 Open Design 的 ds-design-system，经主题适配层映射为 <code>--dp-*</code>
                        变量；组件用法与 API 不变。
                    </p>
                </div>
                <DpButton :theme="{ variant: 'default' }" @click="toggleTheme">
                    {{ isDark() ? '切换浅色' : '切换深色' }}
                </DpButton>
            </header>

            <section class="cn__grid">
                <DpCard :comp="{ title: '按钮' }">
                    <div class="cn__row">
                        <DpButton :theme="{ variant: 'primary' }">主要操作</DpButton>
                        <DpButton :theme="{ variant: 'default' }">次要操作</DpButton>
                        <DpButton :theme="{ variant: 'primary', ghost: true }">幽灵按钮</DpButton>
                        <DpButton :theme="{ variant: 'danger' }">删除</DpButton>
                        <DpButton :theme="{ variant: 'primary' }" :comp="{ disabled: true }">禁用</DpButton>
                    </div>
                </DpCard>

                <DpCard :comp="{ title: '表单' }">
                    <div class="cn__field">
                        <DpInput v-model="input" :comp="{ label: '服务名称', placeholder: 'dp-uaip-ai' }" />
                        <div class="cn__row">
                            <DpSwitch v-model="enabled" :comp="{ label: '启用实时语音' }" />
                            <DpTag :theme="{ variant: 'primary' }">进行中</DpTag>
                            <DpTag :theme="{ variant: 'success' }">健康</DpTag>
                            <DpTag :theme="{ variant: 'warning' }">降级</DpTag>
                            <DpTag :theme="{ variant: 'danger' }">失败</DpTag>
                        </div>
                    </div>
                </DpCard>
            </section>

            <DpCard :comp="{ title: '表格' }">
                <DpTable :theme="{ bordered: true }" :comp="{ columns, data: rows }">
                    <template #td-status="{ row }">
                        <DpTag :theme="{ variant: row.status === '健康' ? 'success' : 'warning' }">
                            {{ row.status }}
                        </DpTag>
                    </template>
                </DpTable>
            </DpCard>

            <section class="cn__grid">
                <DpCard :comp="{ title: '标签页与分页' }">
                    <DpTabs v-model="tab" :comp="{ items: tabItems }" />
                    <div class="cn__pager">
                        <DpPagination v-model:current="page" :comp="{ total: 60, pageSize: 10 }" />
                    </div>
                </DpCard>

                <DpCard :comp="{ title: '反馈' }">
                    <div class="cn__stack">
                        <DpAlert :theme="{ variant: 'info' }" :comp="{ title: '提示' }">
                            这是一条提示信息
                        </DpAlert>
                        <DpAlert :theme="{ variant: 'success' }" :comp="{ title: '成功' }">
                            操作已成功
                        </DpAlert>
                        <DpAlert :theme="{ variant: 'warning' }" :comp="{ title: '警告' }">
                            请注意风险
                        </DpAlert>
                        <DpButton :theme="{ variant: 'danger' }" @click="modalOpen = true">
                            打开对话框
                        </DpButton>
                    </div>
                </DpCard>
            </section>

            <DpModal v-model:open="modalOpen" :comp="{ title: '删除该服务实例？', width: 440 }">
                <p>实例 svc_8f2d41 将被停止并从网关摘除，此操作不可撤销。</p>
                <template #footer>
                    <DpButton @click="modalOpen = false">取消</DpButton>
                    <DpButton :theme="{ variant: 'danger' }" @click="modalOpen = false">确认删除</DpButton>
                </template>
            </DpModal>
        </div>
    </div>
</template>

<style scoped>
.cn {
    min-height: calc(100vh - 47px);
    background: var(--dp-color-bg);
    color: var(--dp-color-fg);
    padding: 28px 20px 64px;
}

.cn__inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 1080px;
    margin: 0 auto;
}

.cn__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px;
    border: 1px solid var(--dp-color-border);
    border-radius: var(--dp-radius-lg);
    background: var(--dp-color-surface);
    box-shadow: var(--dp-shadow-2);
}

.cn__eyebrow {
    font-family: var(--dp-font-mono);
    font-size: 10.5px;
    letter-spacing: 0.1em;
    color: var(--dp-color-muted);
}

.cn__header h1 {
    margin-top: 6px;
    font-family: var(--dp-font-display);
    font-size: 21px;
    font-weight: 600;
    letter-spacing: -0.015em;
}

.cn__lead {
    margin-top: 6px;
    max-width: 640px;
    font-size: 13px;
    color: var(--dp-color-fg-2);
}

.cn__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
}

.cn__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.cn__field {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.cn__stack {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
}

.cn__pager {
    margin-top: 14px;
}

code {
    font-family: var(--dp-font-mono);
    font-size: 12px;
    color: var(--dp-color-fg-2);
}
</style>
