<template>
    <div class="flex flex-wrap items-center gap-3">
        <DpAvatar :theme="{ size: 'small' }" :comp="{ alt: '小' }" />
        <DpAvatar :comp="{ alt: '张' }" />
        <DpAvatar :theme="{ size: 'large' }" :comp="{ alt: '大' }" />
        <DpAvatar :theme="{ size: 'large', variant: 'primary' }" :comp="{ alt: 'P' }" />
        <DpAvatar :theme="{ size: 'large', variant: 'success' }" :comp="{ alt: 'S' }" />
        <DpAvatar :theme="{ size: 'large', round: false }" :comp="{ alt: '方' }" />
        <DpAvatar :theme="{ size: 'large', color: '#0e8f9c' }" :comp="{ alt: '色' }" />
        <DpAvatar :theme="{ size: 'large', color: '#7c3aed', round: false }" :comp="{ alt: '紫' }" />
    </div>
</template>
