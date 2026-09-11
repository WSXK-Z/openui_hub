<script setup lang="ts">
import { computed } from 'vue'
import { useDpcProps } from '../../composables/useDpcProps'
import type { DpcProps } from '../../types/dpc-props'

defineOptions({ name: 'DpcMarkdownCard', inheritAttrs: false })

export interface DpcMarkdownCardComp {
  /** Markdown 文本内容 */
  content: string
}

export type DpcMarkdownCardProps = DpcProps<DpcMarkdownCardComp>

const props = defineProps<DpcMarkdownCardProps>()

const { comp: c, rootAttrs } = useDpcProps<DpcMarkdownCardComp>(props, {
  compDefaults: { content: '' },
})

/**
 * v1 精简渲染：识别 ``` 代码块，其余按普通文本（保留换行）展示。
 * TODO(增强): 引入 markdown-it + highlight.js 等渲染完整 Markdown
 * （当前库约束：除 unocss/@dp_ui/core 外不引入三方依赖，故先做 lite 版）。
 */
interface MdSegment {
  type: 'text' | 'code'
  lang?: string
  content: string
}

function parseSegments(content: string): MdSegment[] {
  const segments: MdSegment[] = []
  const regex = /```([\w+-]*)\s*\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    const lang = (match[1] ?? '').trim()
    segments.push({ type: 'code', lang, content: (match[2] ?? '').replace(/\n$/, '') })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) })
  }
  return segments
}

const segments = computed(() => parseSegments(c.value.content ?? ''))
</script>

<template>
  <div v-bind="rootAttrs" class="dpc-markdown-card text-sm leading-relaxed text-[var(--dpc-color-text)]">
    <template v-for="(seg, index) in segments" :key="index">
      <pre v-if="seg.type === 'code'"
        class="dpc-markdown-card__code my-1.5 overflow-x-auto rounded-[var(--dpc-radius-md)] bg-[color-mix(in_srgb,var(--dpc-color-border)_22%,transparent)] p-3 text-[13px] leading-relaxed"><code>{{ seg.content }}</code></pre>
      <div v-else class="dpc-markdown-card__text whitespace-pre-wrap break-words">
        {{ seg.content }}
      </div>
    </template>
  </div>
</template>
