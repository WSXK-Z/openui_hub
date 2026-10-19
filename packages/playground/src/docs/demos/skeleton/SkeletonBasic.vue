<template>
    <div class="flex flex-col gap-4">
        <DpSkeleton :comp="{ rows: 3 }" />
        <DpSkeleton :comp="{ rows: 2, animated: false }" />
        <DpSkeleton :comp="{ variant: 'rect', height: 72 }" />
        <DpSkeleton :comp="{ variant: 'circle', width: 48, height: 48 }" />
    </div>
</template>
