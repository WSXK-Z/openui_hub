<template>
    <DpGrid :comp="{ cols: 3, gap: 12 }">
        <div v-for="n in 6" :key="n"
            class="rounded-[var(--dp-radius-sm)] border border-[var(--dp-color-border)] bg-[var(--dp-color-surface-2)] p-4 text-center text-sm text-[var(--dp-color-fg-2)]">
            {{ n }}
        </div>
    </DpGrid>
</template>
