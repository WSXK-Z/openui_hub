<template>
    <DpConfigProvider :comp="{ mode: 'dark', persist: false }">
        <div class="flex flex-wrap items-center gap-3">
            <DpThemeToggle :theme="{ round: true }" />
            <DpThemeToggle :comp="{ showLabel: true, label: '切换主题' }" :theme="{ round: true }" />
        </div>
    </DpConfigProvider>
</template>
