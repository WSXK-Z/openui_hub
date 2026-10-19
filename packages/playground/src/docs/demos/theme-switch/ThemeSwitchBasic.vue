<template>
    <DpConfigProvider :comp="{ mode: 'system', persist: false }">
        <div class="flex flex-col gap-4 rounded-[var(--dp-radius-md)] bg-[var(--dp-color-bg)] p-2">
            <DpThemeSwitch />
            <div class="flex flex-wrap items-center gap-3">
                <DpButton :theme="{ variant: 'primary' }">主要按钮</DpButton>
                <DpButton>次要按钮</DpButton>
                <DpTag :theme="{ variant: 'info' }">标签</DpTag>
            </div>
        </div>
    </DpConfigProvider>
</template>
