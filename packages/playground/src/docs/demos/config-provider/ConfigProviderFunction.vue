<script setup lang="ts">
import { defineComponent, h } from "vue";
import { DpButton, DpTag, useTheme } from "@dp_ui/core";

const LocalTokens = defineComponent({
    name: "LocalTokens",
    setup() {
        useTheme({ themeOverrides: { 'color-primary': '#7c3aed', 'color-accent': '#7c3aed' } });
        return () =>
            h(
                "div",
                {
                    class: "flex flex-wrap items-center gap-2 rounded-[var(--dp-radius-md)] bg-[var(--dp-color-surface-2)] p-3",
                },
                [
                    h(DpButton, { theme: { variant: "primary" } }, () => "局部令牌"),
                    h(DpTag, { theme: { variant: "primary" } }, () => "标签"),
                ],
            );
    },
});
</script>

<template>
    <DpConfigProvider :comp="{ mode: 'light', persist: false }">
        <div class="flex flex-col gap-3">
            <DpButton :theme="{ variant: 'primary' }">Provider 默认主色</DpButton>
            <LocalTokens />
        </div>
    </DpConfigProvider>
</template>
