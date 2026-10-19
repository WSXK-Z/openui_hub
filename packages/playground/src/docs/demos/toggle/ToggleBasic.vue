<template>
    <div class="flex flex-wrap items-center gap-4">
        <DpToggle>加粗</DpToggle>
        <DpToggle>斜体</DpToggle>
        <DpToggle :comp="{ disabled: true }">下划线</DpToggle>
    </div>
</template>
