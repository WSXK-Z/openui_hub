<template>
    <DpConfigProvider :comp="{ mode: 'light', persist: false }">
        <div class="flex flex-col items-start gap-4">
            <DpThemeToggle :comp="{ showLabel: true }" />
            <div class="flex flex-wrap items-center gap-3">
                <DpButton :theme="{ variant: 'primary' }">主要按钮</DpButton>
                <DpTag>标签</DpTag>
            </div>
        </div>
    </DpConfigProvider>
</template>
