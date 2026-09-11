<script setup lang="ts">
// 远程组件：由 hubVite 插件在构建期解析 dpui-hub.lock.json 并从 hub 拉取
import { Button } from 'dpui-hub:@dp_ui_hub/button'
</script>

<template>
  <main style="padding: 32px; font-family: system-ui, sans-serif">
    <h1 style="font-size: 18px; margin-bottom: 16px">openui_hub 远程组件示例（构建期插件通道）</h1>
    <Button variant="ghost" size="lg" @click="alert('clicked remote button')">
      远程按钮
    </Button>
  </main>
</template>
