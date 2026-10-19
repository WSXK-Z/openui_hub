<template>
    <DpCard :comp="{ title: '卡片标题', padding: 'default' }">
        <template #cover>
            <div class="h-24 w-full"
                style="background: linear-gradient(120deg, var(--dp-color-accent), var(--dp-color-info))" />
        </template>
        <template #header-extra>
            <DpButton :theme="{ size: 'small', text: true, variant: 'primary' }">更多</DpButton>
        </template>
        <p class="m-0 text-sm leading-6 text-[var(--dp-color-fg-2)]">卡片支持封面、标题栏右侧操作区与页脚插槽。</p>
        <template #footer>
            <div class="flex items-center justify-between text-xs text-[var(--dp-color-fg-2)]">
                <span>更新于 2 分钟前</span>
                <DpButton :theme="{ size: 'small', variant: 'primary' }">查看</DpButton>
            </div>
        </template>
    </DpCard>
</template>
