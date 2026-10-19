<template>
    <div class="flex flex-col gap-4">
        <DpSpace :comp="{ wrap: true }">
            <DpTag v-for="n in 4" :key="n" :theme="{ variant: 'primary' }">标签 {{ n }}</DpTag>
        </DpSpace>
        <DpSpace :comp="{ direction: 'vertical', align: 'start' }">
            <DpButton :theme="{ size: 'small' }">按钮一</DpButton>
            <DpButton :theme="{ size: 'small', variant: 'primary' }">按钮二</DpButton>
            <DpButton :theme="{ size: 'small' }">按钮三</DpButton>
        </DpSpace>
        <DpSpace :comp="{ justify: 'space-between' }" style="width: 320px">
            <span class="text-sm text-[var(--dp-color-fg-2)]">左</span>
            <span class="text-sm text-[var(--dp-color-fg-2)]">中</span>
            <span class="text-sm text-[var(--dp-color-fg-2)]">右</span>
        </DpSpace>
    </div>
</template>
