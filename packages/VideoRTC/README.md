# @dp_ui/video-rtc

go2rtc 视频播放器组件包，只导出两个组件：

- `VideoRTC` —— 播放内核（WebSocket 信令 + WebRTC/MSE 择优，回退 HLS/MP4/MJPEG，断线自动重连，页面不可见/滚出视口自动暂停）
- `VideoStream` —— 在 `VideoRTC` 上叠加状态栏 GUI（当前播放方式 + 错误信息）

## 使用

```bash
pnpm add @dp_ui/video-rtc
```

```vue
<script setup lang="ts">
import { VideoStream } from '@dp_ui/video-rtc'
import '@dp_ui/video-rtc/style.css'
</script>

<template>
  <VideoStream src="/api/ws?src=xiaomi1" class="h-96 w-full" />
</template>
```

`src` 支持三种写法：

- `ws://host/api/ws?src=<stream>` —— go2rtc 的 WebSocket 地址
- `http(s)://host/...` —— 自动替换为 `ws`
- `/api/ws?src=<stream>` —— 相对路径，取当前页面的 `location.origin`

## Props

| 名称                  | 类型            | 默认值                 | 说明                                                                                                    |
| --------------------- | --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `src`                 | `string \| URL` | 必填                   | go2rtc 的 `/api/ws?src=<stream>` 地址                                                                   |
| `visibilityCheck`     | `boolean`       | `true`                 | 页面切到后台（`document.hidden`）时暂停，回到前台恢复                                                   |
| `visibilityThreshold` | `number`        | `0`                    | 视口可见比例（0~1），大于 `0` 时滚出视口即暂停，`0` 表示不监听                                          |
| `mode`                | `string`        | `webrtc,mse,hls,mjpeg` | 允许的通道，逗号分隔：`webrtc`、`webrtc/tcp`、`mse`、`hls`、`mp4`、`mjpeg`；只写 `webrtc` 就只走 WebRTC |
| `media`               | `string`        | `video,audio`          | 请求的媒体，逗号分隔：`video`、`audio`、`microphone`                                                    |
| `fit`                 | `string`        | `fill`                 | 画面适配（`object-fit`）：`fill` 铺满、`contain` 等比留边、`cover` 等比裁切                             |
| `ratio`               | `string`        | `''`                   | 容器比例（CSS `aspect-ratio`，如 `'16/9'`、`'4/3'`、`'auto'`），留空不设置                              |

`fit` 写在组件的 `<video>` 上；`ratio` 在 `VideoRTC` 上写在 `<video>` 上并把高度交给比例（宽度可驱动），在 `VideoStream` 上写在根元素上，所以 `VideoStream` 可以只给宽度就得到等高容器。

## 实例方法

通过模板 ref 调用，`VideoRTC` 与 `VideoStream` 均可用：

| 名称          | 说明                                                 |
| ------------- | ---------------------------------------------------- |
| `play()`      | 播放视频；被浏览器自动播放策略拦截时降级为静音后再播 |
| `send(value)` | 向 go2rtc 发送 JSON 消息，连接未建立时忽略           |

## 事件

| 名称         | 载荷              | 触发时机                                                 |
| ------------ | ----------------- | -------------------------------------------------------- |
| `connect`    | `result: boolean` | 尝试建立 WebSocket，`false` 表示已有连接或组件未挂载     |
| `open`       | `modes: string[]` | WebSocket 打开并完成模式选择（mse/hls/mp4/webrtc/mjpeg） |
| `message`    | `msg: any`        | 收到 go2rtc 的每条 JSON 消息（在内部处理器之后派发）     |
| `pcvideo`    | `pcState: number` | WebRTC 与 MSE 择优结束                                   |
| `close`      | —                 | WebSocket 关闭（含重连前的关闭）                         |
| `disconnect` | —                 | 主动断开（切后台、卸载、重连前释放资源）                 |

## VideoStream

在 `VideoRTC` 之上叠加左上状态栏：

- `mode`：`loading` → `MSE` / `HLS` / `MP4` / `MJPEG` / `RTC`，出错时为 `error`
- `status`：仅在 `loading` 阶段出现的错误会被记录

额外暴露 `mode`、`status` 两个状态供父组件读取。

## 开发

```bash
pnpm run type-check   # vue-tsc --build
pnpm run lint         # oxlint（只检查 .ts，.vue 由 vue-tsc 覆盖）
pnpm run build:dist   # dist/VideoRTC.mjs|.cjs + dist/style.css + dist/types
```

样式全部写在组件内的 `<style scoped>` 里，构建时提取为 `dist/style.css`（只含组件自身样式，不含任何 reset），使用方引入 `@dp_ui/video-rtc/style.css` 即可，不需要额外配置 CSS 框架。

组件不设置自身尺寸：容器由使用方决定（例如 `class="h-96 w-full"`），`VideoRTC` 的 `<video>` 会撑满容器。

## 注意

go2rtc 默认校验 WebSocket 握手请求的 `Origin` 与 `Host` 是否同源：页面需与 go2rtc 同源（或经同一反向代理且不改 Host），否则要在 `go2rtc.yaml` 中配置 `api: origin: "*"`。
