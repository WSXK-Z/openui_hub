<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'DpcAgentIcon' })

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    strokeWidth?: number
  }>(),
  { size: 16, strokeWidth: 2 },
)

type IconSpec = { paths: string[]; fill?: boolean }

const ICONS: Record<string, IconSpec> = {
  sparkle: {
    paths: ['M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z'],
    fill: true,
  },
  check: { paths: ['M20 6L9 17l-5-5'] },
  'chevron-down': { paths: ['M6 9l6 6 6-6'] },
  'chevron-left': { paths: ['M15 6l-6 6 6 6'] },
  'chevron-right': { paths: ['M9 6l6 6-6 6'] },
  close: { paths: ['M18 6L6 18M6 6l12 12'] },
  copy: {
    paths: [
      'M9 9h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z',
      'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    ],
  },
  retry: { paths: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6'] },
  'thumbs-up': {
    paths: [
      'M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z',
    ],
  },
  'thumbs-down': {
    paths: [
      'M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z',
    ],
  },
  search: { paths: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M21 21l-4.3-4.3'] },
  globe: {
    paths: [
      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
      'M2 12h20',
      'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
    ],
  },
  paperclip: {
    paths: [
      'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
    ],
  },
  send: { paths: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z'] },
  stop: { paths: ['M7 7h10v10H7z'] },
  clock: { paths: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2'] },
  file: { paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'] },
  'arrow-up-right': { paths: ['M7 17L17 7', 'M7 7h10v10'] },
  plus: { paths: ['M12 5v14M5 12h14'] },
  mic: {
    paths: [
      'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z',
      'M19 10v1a7 7 0 0 1-14 0v-1',
      'M12 18v3',
    ],
  },
  write: { paths: ['M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z'] },
  run: { paths: ['M4 17l6-5-6-5', 'M12 19h8'] },
  read: { paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'] },
}

const icon = computed<IconSpec>(() => ICONS[props.name] ?? ICONS.sparkle ?? { paths: [] })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="icon.fill ? 'currentColor' : 'none'"
    :stroke="icon.fill ? 'none' : 'currentColor'"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, index) in icon.paths" :key="index" :d="d" />
  </svg>
</template>
