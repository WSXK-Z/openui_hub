<template>
    <div class="flex flex-wrap items-center gap-2">
        <DpButton :theme="{ text: true, variant: 'primary' }">文字按钮</DpButton>
        <DpButton :theme="{ quaternary: true, variant: 'primary' }">次级按钮</DpButton>
        <DpButton :theme="{ dashed: true, variant: 'primary' }">虚线按钮</DpButton>
        <DpButton :theme="{ dashed: true }">虚线默认</DpButton>
        <DpButton :theme="{ circle: true, variant: 'primary' }">圆</DpButton>
        <DpButton :theme="{ strong: true, variant: 'primary' }">加粗按钮</DpButton>
    </div>
</template>
