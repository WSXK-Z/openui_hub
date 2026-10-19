<template>
    <DpLayoutSider style="min-height: 0; height: 300px; overflow: hidden; border-radius: var(--dp-radius-md)">
        <template #sider>
            <div class="p-4">
                <div class="text-sm font-medium">侧边栏</div>
                <div class="mt-3 flex flex-col gap-2 text-[13px] text-[var(--dp-color-fg-2)]">
                    <span>导航一</span>
                    <span>导航二</span>
                    <span>导航三</span>
                </div>
            </div>
        </template>
        <template #header>
            <div class="flex h-12 items-center px-4 text-sm font-medium">页头 header</div>
        </template>
        <div class="text-sm text-[var(--dp-color-fg-2)]">右侧主体内容区域</div>
    </DpLayoutSider>
</template>
