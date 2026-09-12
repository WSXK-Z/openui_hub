<script setup lang="ts">
// 远程组件：由 hubVite 插件在构建期解析 oui.lock.json 并从 hub 拉取
import { Button } from 'oui-hub:@test/button'
import { Button as Button1 } from 'oui-hub:@test/button@0.1.2'
</script>

<template>
  <main style="padding: 32px; font-family: system-ui, sans-serif">
    <h1 style="font-size: 18px; margin-bottom: 16px">openui_hub 远程组件示例（构建期插件通道）</h1>
    <Button variant="ghost" size="lg" @click="console.log('clicked remote button')">
      远程按钮
    </Button>
    <Button1 variant="ghost" size="lg" @click="console.log('clicked remote button1')">
      远程按钮1
    </Button1>
  </main>
</template>
