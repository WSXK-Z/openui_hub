<template>
    <DpPopover :comp="{ side: 'bottom', align: 'start' }">
        <DpButton :theme="{ size: 'small' }">点击打开气泡</DpButton>
        <template #content>
            <div class="w-56 p-3">
                <div class="text-sm font-medium text-[var(--dp-color-fg)]">气泡标题</div>
                <p class="m-0 mt-1 text-xs leading-5 text-[var(--dp-color-fg-2)]">
                    浮层内容通过 content 插槽传入，触发器使用默认插槽。
                </p>
            </div>
        </template>
    </DpPopover>
</template>
