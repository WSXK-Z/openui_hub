import { inject, provide, type InjectionKey } from 'vue'

export interface AuthContext {
  has: (code: string) => boolean
}

export const authContextKey: InjectionKey<AuthContext> = Symbol('dp-auth')

export function provideAuth(context: AuthContext) {
  provide(authContextKey, context)
}

export function injectAuthContext(): AuthContext | undefined {
  return inject(authContextKey, undefined)
}
