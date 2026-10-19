<script setup lang="ts">
const icons = ['star', 'check', 'dot'] as const
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-4 text-[var(--dp-color-accent)]">
            <DpIcon v-for="icon in icons" :key="icon" :comp="{ icon: `dp-demo-icon dp-demo-icon--${icon}`, size: 24 }" />
            <DpIcon :comp="{ icon: 'dp-demo-icon dp-demo-icon--star', size: 32 }" />
        </div>
        <span class="text-xs leading-5 text-[var(--dp-color-fg-2)]">
            通过 comp.icon 传入 UnoCSS 图标类（如 i-carbon-sun）或自定义 CSS 类；comp.size 控制图标字号。
        </span>
    </div>
</template>

<style>
.dp-demo-icon {
    display: inline-block;
    background: currentColor;
}

.dp-demo-icon--star {
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

.dp-demo-icon--check {
    clip-path: polygon(14% 44%, 0 65%, 40% 100%, 100% 16%, 82% 0%, 39% 62%);
}

.dp-demo-icon--dot {
    border-radius: 50%;
}
</style>
