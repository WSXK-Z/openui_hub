<template>
    <div class="flex flex-col gap-3">
        <DpLazy :comp="{ delay: 200, rootMargin: '0px' }">
            <DpTag :theme="{ variant: 'info' }">进入视口后延迟 200ms 渲染</DpTag>
        </DpLazy>
        <DpLazy :comp="{ rootMargin: '0px' }">
            <DpTag :theme="{ variant: 'success' }">进入视口立即渲染</DpTag>
        </DpLazy>
    </div>
</template>
