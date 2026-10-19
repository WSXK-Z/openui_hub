<template>
    <DpConfigProvider :comp="{ themeOverrides: { 'color-primary': '#7c3aed', 'color-accent': '#7c3aed', radius: '10px' } }">
        <div class="flex flex-wrap items-center gap-3 rounded-[var(--dp-radius-md)] border border-[var(--dp-color-border)] p-4">
            <DpButton :theme="{ variant: 'primary' }">紫色主题按钮</DpButton>
            <DpButton :theme="{ variant: 'primary', round: true }">圆角</DpButton>
            <DpTag :theme="{ variant: 'primary' }">标签</DpTag>
            <DpSwitch :comp="{ label: '开关' }" />
        </div>
    </DpConfigProvider>
</template>
