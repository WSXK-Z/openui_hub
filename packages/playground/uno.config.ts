import presetTagify from "@unocss/preset-tagify";
import presetLegacyCompat from "@unocss/preset-legacy-compat";
import {
  defineConfig,
  presetIcons,
  presetAttributify,
  transformerVariantGroup,
  transformerDirectives,
  presetMini,
} from "unocss";
import { presetDpChat } from "../chat/src/tokens/presetDpChat";
import { presetDpUi } from "../core/src/tokens/presetDpUi";

export default defineConfig({
  // dev 通过 vite alias 直连 @dp_ui/core / @dp_ui/chat 源码，需显式扫描其 .vue 原子类
  content: {
    filesystem: [
      "./index.html",
      "./src/**/*.{vue,ts,tsx,js,jsx}",
      "../core/src/**/*.{vue,ts,tsx}",
      "../chat/src/**/*.{vue,ts,tsx}",
    ],
  },
  presets: [
    presetMini(),
    presetDpUi(),
    presetDpChat(),
    presetTagify({ prefix: "un-" }),
    presetAttributify({
      prefix: "un-",
      prefixedOnly: true,
    }),
    presetLegacyCompat({
      commaStyleColorFunction: true,
      legacyColorSpace: true,
    }),
    presetIcons({}),
  ],
  transformers: [transformerVariantGroup(), transformerDirectives()],
});
