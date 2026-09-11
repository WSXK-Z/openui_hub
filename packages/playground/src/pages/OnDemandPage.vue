<script setup lang="ts">
import { ref } from 'vue'

// 按需加载演示：具名导入（依赖 tree-shaking，未使用的组件不进包）
// 构建产物另提供子路径入口：`@dp_ui/core/components/common/button` 等
import { DpButton, DpLayoutSider, DpPage, DpPanel, DpSpace, DpTag } from '@dp_ui/core'

const count = ref(0)
</script>

<template>
  <DpLayoutSider>
    <template #sider>
      <div style="padding: 16px">
        <DpSpace :comp="{ direction: 'vertical' }">
          <DpTag :theme="{ variant: 'info' }">按需加载</DpTag>
          <DpTag>sidebar</DpTag>
        </DpSpace>
      </div>
    </template>
    <template #header>
      <div style="display: flex; align-items: center; padding: 0 16px; height: 48px">
        <strong>按需加载（具名导入 + tree-shaking）</strong>
      </div>
    </template>

    <DpPage :comp="{ title: '按需加载演示' }">
      <DpPanel :comp="{ title: '计数' }">
        <DpSpace>
          <DpButton :theme="{ variant: 'primary' }" @click="count++">+1</DpButton>
          <DpTag :theme="{ variant: 'success' }">count: {{ count }}</DpTag>
        </DpSpace>
        <p style="margin-top: 12px; font-size: 13px; color: var(--dp-color-text-secondary, #6b7280)">
          本页组件通过
          <code>import &#123; DpButton, DpPanel … &#125; from '@dp_ui/core'</code> 具名导入；
          构建产物另提供 <code>@dp_ui/core/components/*</code> 子路径入口实现精确按需。
        </p>
      </DpPanel>
    </DpPage>
  </DpLayoutSider>
</template>
