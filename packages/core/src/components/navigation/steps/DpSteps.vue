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
    /** 垂直排列 */
    vertical: boolean
    /** 整体状态：process 进行中 / finish 全部完成 / error 当前步骤失败 */
    status: 'process' | 'finish' | 'error'
}

export type DpStepsProps = DpProps<DpStepsComp>

const props = defineProps<DpStepsProps>()

const { comp: c, rootAttrs } = useDpProps<DpStepsComp>(props, {
    compDefaults: { steps: [], current: 0, vertical: false, status: 'process' },
})

type StepState = 'finish' | 'process' | 'error' | 'wait'

function stateOf(index: number): StepState {
    if (c.value.status === 'finish') return 'finish'
    if (c.value.status === 'error' && index === c.value.current) return 'error'
    if (index < c.value.current) return 'finish'
    return index === c.value.current ? 'process' : 'wait'
}

const DOT_CLASSES: Record<StepState, string> = {
    finish: 'bg-[var(--dp-color-accent)] text-[var(--dp-color-accent-fg)]',
    process: 'border-2 border-[var(--dp-color-accent)] text-[var(--dp-color-accent)]',
    error: 'bg-[var(--dp-color-danger)] text-[var(--dp-color-bg)]',
    wait: 'border border-[var(--dp-color-border-strong)] text-[var(--dp-color-muted)]',
}

const TEXT_CLASSES: Record<StepState, string> = {
    finish: 'text-[var(--dp-color-fg)]',
    process: 'text-[var(--dp-color-accent)]',
    error: 'text-[var(--dp-color-danger)]',
    wait: 'text-[var(--dp-color-muted)]',
}
</script>

<template>
    <ol v-bind="rootAttrs" class="dp-steps"
        :class="c.vertical ? 'dp-steps--vertical flex flex-col gap-4' : 'dp-steps--horizontal flex items-start gap-4'">
        <li v-for="(step, index) in c.steps" :key="index"
            class="flex items-start gap-2" :class="c.vertical ? '' : 'flex-1'">
            <span class="dp-steps__dot flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs"
                :class="DOT_CLASSES[stateOf(index)]">
                {{ stateOf(index) === 'finish' ? '✓' : stateOf(index) === 'error' ? '!' : index + 1 }}
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
                <strong class="text-sm" :class="TEXT_CLASSES[stateOf(index)]">{{ step.title }}</strong>
                <span v-if="step.description" class="text-xs text-[var(--dp-color-muted)]">{{ step.description }}</span>
            </span>
        </li>
    </ol>
</template>
