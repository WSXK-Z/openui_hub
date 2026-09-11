/**
 * @dp_ui/chat 内置文案字典。
 * 使用方可通过 DpcLocale 的 messages 覆盖，或自建语言包（Partial<DpcLocaleMessages>）。
 */

export interface DpcLocaleMessages {
  /** 发送 */
  send: string
  /** 停止生成 */
  stop: string
  /** 输入框占位 */
  placeholder: string
  /** 复制 */
  copy: string
  /** 复制成功 */
  copied: string
  /** 有帮助（点赞） */
  like: string
  /** 无帮助（点踩） */
  dislike: string
  /** 重新生成 */
  refresh: string
  /** 删除 */
  delete: string
  /** 回到顶部 */
  scrollToTop: string
  /** 回到底部 */
  scrollToBottom: string
  /** 添加附件 */
  attachment: string
  /** 思考中… */
  thinking: string
  /** 暂无内容 */
  empty: string
}

export const dpcLocaleZhCN: DpcLocaleMessages = {
  send: '发送',
  stop: '停止生成',
  placeholder: '输入消息，Enter 发送，Shift + Enter 换行',
  copy: '复制',
  copied: '已复制',
  like: '有帮助',
  dislike: '无帮助',
  refresh: '重新生成',
  delete: '删除',
  scrollToTop: '回到顶部',
  scrollToBottom: '回到底部',
  attachment: '添加附件',
  thinking: '思考中…',
  empty: '暂无内容',
}

export const dpcLocaleEnUS: DpcLocaleMessages = {
  send: 'Send',
  stop: 'Stop',
  placeholder: 'Type a message. Enter to send, Shift + Enter for newline',
  copy: 'Copy',
  copied: 'Copied',
  like: 'Helpful',
  dislike: 'Not helpful',
  refresh: 'Regenerate',
  delete: 'Delete',
  scrollToTop: 'Back to top',
  scrollToBottom: 'Back to bottom',
  attachment: 'Attach',
  thinking: 'Thinking…',
  empty: 'No content',
}

export type DpcLocaleName = 'zh-CN' | 'en-US'

export const dpcLocaleMap: Record<DpcLocaleName, DpcLocaleMessages> = {
  'zh-CN': dpcLocaleZhCN,
  'en-US': dpcLocaleEnUS,
}
