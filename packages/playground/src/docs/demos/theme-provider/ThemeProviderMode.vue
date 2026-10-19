<script setup lang="ts">
import { defineComponent, h } from "vue";
import { DpButton, DpThemeSwitch, useTheme } from "@dp_ui/core";

const ThemeModePicker = defineComponent({
    name: "ThemeModePicker",
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
                h(DpThemeSwitch, { comp: { showLabels: false } }),
            ]);
    },
});
</script>

<template>
    <DpThemeProvider :comp="{
        themes: {
            day: { mode: 'light', overrides: { 'color-accent': '#2563eb', 'color-primary': '#2563eb' } },
            night: { mode: 'dark', overrides: { 'color-accent': '#818cf8', 'color-primary': '#818cf8' } },
        },
        defaultTheme: 'day',
        persist: false,
    }">
        <div class="flex flex-col gap-4 rounded-[var(--dp-radius-md)] border border-[var(--dp-color-border)] bg-[var(--dp-color-bg)] p-4 text-[var(--dp-color-fg)]">
            <ThemeModePicker />
            <div class="flex flex-wrap items-center gap-2">
                <DpButton :theme="{ variant: 'primary' }">主题按钮</DpButton>
                <DpButton>普通按钮</DpButton>
            </div>
        </div>
    </DpThemeProvider>
</template>
