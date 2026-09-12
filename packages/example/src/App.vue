<script setup lang="ts">
// 两条接入通道：
// - 构建期：hubVite 插件按 oui.lock.json 把远程产物拉进宿主一起打包（下面两个 Button）；
// - 运行时：<HubRemote> 只给 hub 地址与包名（版本可省）自行取产物 URL 并 import()，不参与宿主构建。
//
// 运行时通道不参与构建期改写：远程模块里的裸 `import "vue"` 由 @openui_hub/runtime 注入的 import map
// 解析到宿主自己那份 vue（blob shim），因此远程组件与宿主共用同一个 Vue 实例。
import { HubRemote } from '@openui_hub/runtime'

import { Button } from 'oui-hub:@test/button'
import { Button as Button1 } from 'oui-hub:@test/button@0.1.2'

/** 运行时通道的 hub 地址与包；版本省略即取该包在 hub 上的最新版本。 */
const REGISTRY = 'http://127.0.0.1:8787'
const PKG = '@test/button'
const VERSION = '0.1.2'
</script>

<template>
  <main style="padding: 32px; font-family: system-ui, sans-serif">
    <h1 style="font-size: 18px; margin-bottom: 16px">
      构建期插件通道（oui-hub:&lt;pkg&gt;[@&lt;version&gt;]）
    </h1>
    <Button variant="ghost" size="lg" @click="console.log('clicked remote button')">
      远程按钮
    </Button>
    <Button1 variant="ghost" size="lg" @click="console.log('clicked remote button1')">
      远程按钮1
    </Button1>

    <h1 style="font-size: 18px; margin: 24px 0 16px">运行时通道（&lt;HubRemote&gt; 动态 import）</h1>
    <HubRemote :registry="REGISTRY" :name="PKG" :version="VERSION" label="运行时远程按钮"
      @click="console.log('clicked runtime remote button')">
      <template #loading>加载中…</template>
      <template #error="{ message, retry }">
        <span>加载失败：{{ message }}</span>
        <button style="margin-left: 8px" @click="retry">重试</button>
      </template>
    </HubRemote>
  </main>
</template>
