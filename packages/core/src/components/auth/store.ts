import { reactive } from 'vue'

interface AuthState {
  codes: Set<string>
}

/** 模块级权限码表，作为无注入上下文时的回退（配合 v-auth 指令使用） */
export const authState = reactive<AuthState>({ codes: new Set<string>() })

export function setAuthCodes(codes: string[]) {
  authState.codes = new Set(codes)
}

export function hasAuth(code: string): boolean {
  return authState.codes.has(code)
}
