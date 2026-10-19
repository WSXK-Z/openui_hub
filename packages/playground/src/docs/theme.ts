import { ref } from "vue";

/** 演示站主题，对应 @dp_ui/core 的 data-dp-theme 取值 */
export type SiteTheme = "light" | "dark";

const STORAGE_KEY = "dp-ui-playground-theme";

function resolveInitialTheme(): SiteTheme {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

const theme = ref<SiteTheme>(resolveInitialTheme());

/** 把主题写到 <html>，让 Modal / Select 等挂到 body 的浮层同样继承变量 */
export function applySiteTheme(value: SiteTheme = theme.value) {
    document.documentElement.dataset.dpTheme = value;
}

applySiteTheme();

export function useSiteTheme() {
    function setTheme(value: SiteTheme) {
        theme.value = value;
        window.localStorage.setItem(STORAGE_KEY, value);
        applySiteTheme(value);
    }

    function toggleTheme() {
        setTheme(theme.value === "dark" ? "light" : "dark");
    }

    return { theme, setTheme, toggleTheme };
}
