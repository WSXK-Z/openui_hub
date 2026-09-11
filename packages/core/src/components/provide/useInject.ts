import { inject } from 'vue'

/** 从 `DpProvide`（或任意 `provide(key, value)`，key 为字符串）注入指定 key 的值 */
export function useInject<T>(key: string): T | undefined {
  return inject<T | undefined>(key, undefined)
}
