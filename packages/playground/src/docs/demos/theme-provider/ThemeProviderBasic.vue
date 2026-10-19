<script setup lang="ts">
import { defineComponent, h } from "vue";
import { DpButton, DpTag, useTheme } from "@dp_ui/core";

const ThemePicker = defineComponent({
    name: "ThemePicker",
    setup() {
        const theme = useTheme();
        return () =>
            h(
                "div",
                { class: "flex flex-wrap items-center gap-2" },
                [
                    theme.themeNames.value.map((name) =>
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
                ],
            );
    },
});
</script>

<template>
    <DpThemeProvider :comp="{
        themes: {
            ocean: { overrides: { 'color-accent': '#0284c7', 'color-primary': '#0284c7' } },
            violet: { overrides: { 'color-accent': '#7c3aed', 'color-primary': '#7c3aed' } },
            emerald: { overrides: { 'color-accent': '#059669', 'color-primary': '#059669' } },
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
