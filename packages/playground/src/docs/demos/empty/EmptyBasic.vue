<template>
    <div class="flex flex-col gap-6">
        <DpEmpty :comp="{ description: '暂无数据' }" />
        <DpEmpty :comp="{ description: '还没有创建任何项目' }">
            <DpButton :theme="{ variant: 'primary', size: 'small' }">新建项目</DpButton>
        </DpEmpty>
    </div>
</template>
