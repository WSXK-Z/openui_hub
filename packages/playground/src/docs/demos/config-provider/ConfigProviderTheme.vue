<template>
    <DpConfigProvider :comp="{ mode: 'system', persist: false }">
        <div class="flex flex-col gap-4 rounded-[var(--dp-radius-md)] border border-[var(--dp-color-border)] bg-[var(--dp-color-bg)] p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <span class="text-sm text-[var(--dp-color-muted)]">comp.mode 控制整个 Provider 子树的主题</span>
                <DpThemeSwitch :comp="{ showLabels: false }" />
            </div>
            <div class="flex flex-wrap items-center gap-3">
                <DpButton :theme="{ variant: 'primary' }">主要按钮</DpButton>
                <DpInput :theme="{ style: 'width: 180px' }" placeholder="输入内容" />
                <DpTag :theme="{ variant: 'success' }">标签</DpTag>
            </div>
        </div>
    </DpConfigProvider>
</template>
