<template>
    <div class="flex flex-col gap-4">
        <DpDivider :comp="{ orientation: 'left' }">左侧标题</DpDivider>
        <DpDivider>居中标题</DpDivider>
        <DpDivider :comp="{ dashed: true }" />
        <div class="flex h-6 items-center gap-3 text-sm text-[var(--dp-color-fg-2)]">
            <span>文案一</span>
            <DpDivider :comp="{ vertical: true }" />
            <span>文案二</span>
            <DpDivider :comp="{ vertical: true }" />
            <span>文案三</span>
        </div>
    </div>
</template>
