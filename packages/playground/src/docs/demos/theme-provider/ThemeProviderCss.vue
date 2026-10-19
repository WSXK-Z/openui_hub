<script setup lang="ts">
import { defineComponent, h } from "vue";
import { DpButton, DpTag, useTheme } from "@dp_ui/core";

const ThemePicker = defineComponent({
    name: "ThemePicker",
    setup() {
        const theme = useTheme();
        return () =>
            h("div", { class: "flex flex-wrap items-center gap-2" }, [
                ...theme.themeNames.value.map((name) =>
                    h(
                        DpButton,
                        {
                            key: name,
                            theme: {
                                size: "small",
                                variant: theme.theme.value === name ? "primary" : "default",
                            },
                            onClick: () => theme.setTheme(name),
                        },
                        () => name,
                    ),
                ),
                h(DpTag, { theme: { variant: "info" } }, () => `当前：${theme.theme.value}`),
            ]);
    },
});
</script>

<template>
    <DpThemeProvider :comp="{
        themes: {
            ocean: { className: 'theme-ocean' },
            rose: { className: 'theme-rose' },
        },
        defaultTheme: 'ocean',
        persist: false,
    }">
        <div class="flex flex-col gap-4 rounded-[var(--dp-radius-md)] border border-[var(--dp-color-border)] bg-[var(--dp-color-bg)] p-4">
            <ThemePicker />
            <div class="flex flex-wrap items-center gap-2">
                <DpButton :theme="{ variant: 'primary' }">主要按钮</DpButton>
                <DpButton>次要按钮</DpButton>
                <DpTag :theme="{ variant: 'primary' }">标签</DpTag>
            </div>
        </div>
    </DpThemeProvider>
</template>

<style scoped>
.theme-ocean {
    --dp-color-primary: oklch(55% 0.16 240);
    --dp-color-primary-hover: oklch(50% 0.17 240);
    --dp-color-accent: oklch(55% 0.16 240);
    --dp-color-accent-hover: oklch(50% 0.17 240);
    --dp-color-accent-soft: oklch(95% 0.03 240);
}

.theme-rose {
    --dp-color-primary: oklch(58% 0.18 15);
    --dp-color-primary-hover: oklch(53% 0.19 15);
    --dp-color-accent: oklch(58% 0.18 15);
    --dp-color-accent-hover: oklch(53% 0.19 15);
    --dp-color-accent-soft: oklch(95% 0.03 15);
}
</style>
