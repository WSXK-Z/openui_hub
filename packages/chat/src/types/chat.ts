/**
 * 对话数据模型：Bubble / List / Sender 之间共享的消息结构与工具。
 * 状态归属使用方（如 Pinia），库只提供纯类型与纯函数。
 */

/** 发言方 */
export type DpcChatRole = 'user' | 'assistant'

/** 消息附加状态（如「思考中」「已深度思考」等来源标签） */
export type DpcChatMessageStatus = 'thinking' | 'done' | 'error' | 'paused'

/** 单条对话消息 */
export interface DpcChatMessage {
  /** 唯一 id，缺省时使用方可用 createDpcChatId() 生成 */
  id?: string
  role: DpcChatRole
  /** 纯文本内容（富文本渲染由 MarkdownCard / 使用方负责） */
  content: string
  /** 辅助方是否正在流式生成（Bubble 显示 loading） */
  loading?: boolean
  /** 消息状态标签 */
  status?: DpcChatMessageStatus
  /** 状态标签文本（如「已深度思考（用时 15 秒）」），用于 Bubble 状态位 */
  statusText?: string
  /** 附加业务元信息 */
  meta?: Record<string, unknown>
  /** 时间戳（number 或可转 Date 的字符串） */
  createdAt?: number | string
}

let seq = 0

/** 生成稳定的消息 id（默认前缀 dpc-msg-） */
export function createDpcChatId(prefix = 'dpc-msg'): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`
}
