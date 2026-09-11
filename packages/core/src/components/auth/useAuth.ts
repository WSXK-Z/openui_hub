import { injectAuthContext } from './context'
import { hasAuth } from './store'

export interface UseAuthReturn {
  has: (code: string) => boolean
}

/** 优先读取注入的权限上下文，否则回退到模块级权限码表 */
export function useAuth(): UseAuthReturn {
  const context = injectAuthContext()
  return {
    has: (code: string) => context?.has(code) ?? hasAuth(code),
  }
}
