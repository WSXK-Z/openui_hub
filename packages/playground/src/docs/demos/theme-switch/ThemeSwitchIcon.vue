<template>
    <DpConfigProvider :comp="{ mode: 'light', persist: false }">
        <DpThemeSwitch :comp="{ showLabels: false }" />
    </DpConfigProvider>
</template>
