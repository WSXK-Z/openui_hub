<script setup lang="ts">
const items = [
    { value: 'a', title: '什么是 @dp_ui/core？', content: '基于 reka-ui + UnoCSS 的页面级 Vue 组件库。' },
    { value: 'b', title: '为什么拆分 theme / comp？', content: '外观与行为分离，便于默认值与主题覆盖。' },
    { value: 'c', title: '支持哪些加载方式？', content: '支持 app.use(DpUi) 全量注册与具名导入按需加载。' },
]
</script>

<template>
    <DpAccordion :comp="{ items, collapsible: true }" style="max-width: 520px" />
</template>
