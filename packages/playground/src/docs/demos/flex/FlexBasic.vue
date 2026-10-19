<template>
    <div class="flex flex-col gap-4">
        <DpFlex :comp="{ justify: 'space-between', gap: 12 }">
            <span v-for="n in 3" :key="n"
                class="rounded-[var(--dp-radius-sm)] bg-[var(--dp-color-surface-2)] px-4 py-2 text-sm text-[var(--dp-color-fg-2)]">
                项目 {{ n }}
            </span>
        </DpFlex>
        <DpFlex :comp="{ align: 'center', gap: 8 }">
            <DpAvatar :theme="{ size: 'small' }" :comp="{ alt: 'A' }" />
            <span class="text-sm text-[var(--dp-color-fg-2)]">弹性布局对齐内容</span>
            <DpTag :theme="{ variant: 'success' }">已完成</DpTag>
        </DpFlex>
    </div>
</template>
