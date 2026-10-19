<script setup lang="ts">
import { ref } from 'vue'

const pageRef = ref<{ bringToFront: (name: string) => boolean } | null>(null)

function focusHint() {
    pageRef.value?.bringToFront('hint')
}
</script>

<template>
    <DpPage ref="pageRef" :comp="{ title: '页面与面板', anchorGap: 12, persistNamespace: 'dp-playground-page' }"
        style="height: 380px; overflow: hidden; border: 1px solid var(--dp-color-border); border-radius: var(--dp-radius-md); background: var(--dp-color-surface-2)">
        <div class="flex h-full flex-col gap-3 p-4">
            <div class="text-sm font-medium text-[var(--dp-color-fg)]">页面内容区</div>
            <p class="m-0 max-w-sm text-xs leading-5 text-[var(--dp-color-fg-2)]">
                面板默认渲染全部 7 个停靠位；浮动面板按 anchor 定位，可拖动、缩放并记忆状态。
            </p>
            <div>
                <DpButton :theme="{ size: 'small', variant: 'primary' }" @click="focusHint">置顶提示面板</DpButton>
            </div>
        </div>

        <DpPanel :comp="{
            title: '提示面板',
            name: 'hint',
            fixed: true,
            anchor: 'top-right',
            width: 200,
            collapsible: true,
            showTools: true,
            persist: 'hint',
        }">
            <span class="text-xs leading-5 text-[var(--dp-color-fg-2)]">
                这个面板固定在右上角，折叠状态与位移会写入 localStorage。
            </span>
        </DpPanel>

        <DpPanel :comp="{
            title: '可拖拽面板',
            name: 'drag',
            fixed: true,
            movable: true,
            resizable: true,
            anchor: 'bottom-left',
            width: 220,
            height: 150,
            showTools: true,
        }">
            <span class="text-xs leading-5 text-[var(--dp-color-fg-2)]">
                拖动标题栏移动，拖拽右下角调整尺寸。
            </span>
        </DpPanel>
    </DpPage>
</template>
