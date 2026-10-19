<template>
    <DpLayoutBasic style="min-height: 0; height: 280px; overflow: hidden; border-radius: var(--dp-radius-md)">
        <template #header>
            <div class="flex h-12 items-center px-4 text-sm font-medium">页头 header</div>
        </template>
        <div class="text-sm text-[var(--dp-color-fg-2)]">主体内容区域（main）</div>
        <template #footer>
            <div class="flex h-10 items-center px-4 text-xs text-[var(--dp-color-fg-2)]">页脚 footer</div>
        </template>
    </DpLayoutBasic>
</template>
