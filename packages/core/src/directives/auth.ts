import type { Directive } from 'vue'
import { hasAuth } from '../components/auth/store.ts'

/** `v-auth="'code'"`：无权限时隐藏元素 */
export const vAuth: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    el.style.display = hasAuth(binding.value) ? '' : 'none'
  },
  updated(el, binding) {
    el.style.display = hasAuth(binding.value) ? '' : 'none'
  },
}
