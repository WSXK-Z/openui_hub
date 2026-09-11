<script setup lang="ts">
import { useDpProps } from '../../../composables/useDpProps.ts'
import type { DpProps } from '../../../types'

defineOptions({ name: 'DpSteps', inheritAttrs: false })

export interface DpStep {
    title: string
    description?: string
}

export interface DpStepsComp {
    steps: DpStep[]
    current: number
}

export type DpStepsProps = DpProps<DpStepsComp>

const props = defineProps<DpStepsProps>()

const { comp: c, rootAttrs } = useDpProps<DpStepsComp>(props, {
    compDefaults: { steps: [], current: 0 },
})
</script>

<template>
    <ol v-bind="rootAttrs" class="dp-steps flex items-start gap-4">
        <li v-for="(step, index) in c.steps" :key="index" class="flex flex-1 items-start gap-2"
            :class="index <= c.current ? 'text-[var(--dp-color-primary)]' : 'text-[var(--dp-color-text-secondary)]'">
            <span class="dp-steps__dot flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs" :class="index < c.current
                    ? 'bg-[var(--dp-color-primary)] text-white'
                    : index === c.current
                        ? 'border-2 border-[var(--dp-color-primary)]'
                        : 'border border-[var(--dp-color-border)]'
                ">
                {{ index < c.current ? '✓' : index + 1 }} </span>
                    <span class="flex min-w-0 flex-col">
                        <strong class="text-sm">{{ step.title }}</strong>
                        <span v-if="step.description" class="text-xs opacity-80">{{ step.description }}</span>
                    </span>
        </li>
    </ol>
</template>
