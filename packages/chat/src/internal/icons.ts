/**
 * @dp_ui/chat 内置图标（内联 SVG，Feather 风格 stroke 图标）。
 *
 * 不依赖任何图标字体/在线图标集合：组件通过相对路径复用本模块，
 * 需要对外暴露的图标（如 DpcCopyIcon 等）由各组件 index.ts 具名导出。
 */
import { defineComponent, h } from 'vue'
import type { VNode } from 'vue'

type IconRenderer = () => VNode[]

function icon(name: string, render: IconRenderer) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: {
      size: { type: [Number, String], default: 16 },
      color: { type: String, default: 'currentColor' },
    },
    setup(props) {
      return () =>
        h(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            width: props.size,
            height: props.size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: props.color,
            'stroke-width': 1.8,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'aria-hidden': 'true',
            'data-icon': name,
          },
          render(),
        )
    },
  })
}

/* ---- 发送 / 停止 ---- */
export const DpcSendIcon = icon('DpcSendIcon', () => [
  h('line', { x1: 22, y1: 2, x2: 11, y2: 13 }),
  h('polygon', { points: '22 2 15 22 11 13 2 9 22 2' }),
])

export const DpcStopIcon = icon('DpcStopIcon', () => [
  h('rect', { x: 6, y: 6, width: 12, height: 12, rx: 2 }),
])

/* ---- 工具栏：复制 / 点赞 / 点踩 / 刷新 / 删除 / 对勾 ---- */
export const DpcCopyIcon = icon('DpcCopyIcon', () => [
  h('rect', { x: 9, y: 9, width: 13, height: 13, rx: 2, ry: 2 }),
  h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }),
])

export const DpcCheckIcon = icon('DpcCheckIcon', () => [
  h('polyline', { points: '20 6 9 17 4 12' }),
])

export const DpcLikeIcon = icon('DpcLikeIcon', () => [
  h('path', { d: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z' }),
  h('path', { d: 'M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3' }),
])

export const DpcDislikeIcon = icon('DpcDislikeIcon', () => [
  h('path', { d: 'M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z' }),
  h('path', { d: 'M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3' }),
])

export const DpcRefreshIcon = icon('DpcRefreshIcon', () => [
  h('polyline', { points: '23 4 23 10 17 10' }),
  h('path', { d: 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10' }),
])

export const DpcDeleteIcon = icon('DpcDeleteIcon', () => [
  h('polyline', { points: '3 6 5 6 21 6' }),
  h('path', {
    d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  }),
  h('line', { x1: 10, y1: 11, x2: 10, y2: 17 }),
  h('line', { x1: 14, y1: 11, x2: 14, y2: 17 }),
])

/* ---- 滚动 / 附件 / 关闭 ---- */
export const DpcArrowUpIcon = icon('DpcArrowUpIcon', () => [
  h('line', { x1: 12, y1: 19, x2: 12, y2: 5 }),
  h('polyline', { points: '5 12 12 5 19 12' }),
])

export const DpcArrowDownIcon = icon('DpcArrowDownIcon', () => [
  h('line', { x1: 12, y1: 5, x2: 12, y2: 19 }),
  h('polyline', { points: '19 12 12 19 5 12' }),
])

export const DpcPaperclipIcon = icon('DpcPaperclipIcon', () => [
  h('path', {
    d: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  }),
])

export const DpcCloseIcon = icon('DpcCloseIcon', () => [
  h('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
  h('line', { x1: 6, y1: 6, x2: 18, y2: 18 }),
])

export const DpcFileIcon = icon('DpcFileIcon', () => [
  h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
  h('polyline', { points: '14 2 14 8 20 8' }),
  h('line', { x1: 16, y1: 13, x2: 8, y2: 13 }),
  h('line', { x1: 16, y1: 17, x2: 8, y2: 17 }),
])

/* ---- 用户 / 助手 头像占位 & 装饰 ---- */
export const DpcUserIcon = icon('DpcUserIcon', () => [
  h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
  h('circle', { cx: 12, cy: 7, r: 4 }),
])

export const DpcBotIcon = icon('DpcBotIcon', () => [
  h('rect', { x: 4, y: 8, width: 16, height: 12, rx: 3 }),
  h('path', { d: 'M12 8V4' }),
  h('circle', { cx: 12, cy: 3, r: 1 }),
  h('line', { x1: 9, y1: 13, x2: 9, y2: 13.01 }),
  h('line', { x1: 15, y1: 13, x2: 15, y2: 13.01 }),
])

export const DpcSparkleIcon = icon('DpcSparkleIcon', () => [
  h('polygon', {
    points:
      '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2',
  }),
])
