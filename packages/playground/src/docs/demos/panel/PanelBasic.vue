<template>
    <div class="flex flex-col gap-4">
        <DpPanel :comp="{ title: '基础面板' }">
            <span class="text-sm text-[var(--dp-color-fg-2)]">面板用于划分页面功能区域。</span>
        </DpPanel>
        <DpPanel :comp="{ title: '可折叠面板', collapsible: true }">
            <span class="text-sm text-[var(--dp-color-fg-2)]">点击右上角箭头折叠 / 展开。</span>
        </DpPanel>
        <DpPanel :comp="{ title: '加载中', loading: true }">
            <span class="text-sm text-[var(--dp-color-fg-2)]">加载完成后展示内容。</span>
        </DpPanel>
    </div>
</template>
