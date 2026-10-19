<template>
    <div class="flex items-center gap-6">
        <DpSpin />
        <DpSpin :comp="{ size: 16 }" />
        <DpSpin :comp="{ size: 32, description: '加载中…' }" />
    </div>
</template>
