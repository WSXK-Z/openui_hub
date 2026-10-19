<template>
    <div class="flex flex-wrap items-center gap-8">
        <DpBadge :comp="{ value: 5 }">
            <DpButton :theme="{ size: 'small' }">消息</DpButton>
        </DpBadge>
        <DpBadge :comp="{ value: 128, max: 99 }">
            <DpButton :theme="{ size: 'small' }">超出上限</DpButton>
        </DpBadge>
        <DpBadge :comp="{ dot: true }">
            <DpButton :theme="{ size: 'small' }">红点</DpButton>
        </DpBadge>
        <DpBadge :comp="{ value: 'new', color: '#0e8f9c' }">
            <DpButton :theme="{ size: 'small' }">自定义颜色</DpButton>
        </DpBadge>
    </div>
</template>
