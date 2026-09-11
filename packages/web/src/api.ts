/** hub API 客户端：数据形状直接对应 server 端点 JSON（v1 不引入共享类型包）。 */

export const HUB_URL: string = import.meta.env.VITE_HUB_URL ?? 'http://127.0.0.1:8787'

export interface HubPackageItem {
  scope: string
  name: string
  latest: string | null
  description: string
  updatedAt: string
}

export interface HubIndex {
  packages: HubPackageItem[]
}

export interface HubVersionInfo {
  version: string
  manifestUrl: string
  manifest: Record<string, unknown>
}

export interface HubPackageDetail {
  scope: string
  name: string
  versions: HubVersionInfo[]
}

export interface HubResolve {
  version: string
  manifestUrl: string
  moduleUrl: string
  cssUrls: string[]
}

/** 带 HTTP 状态码的错误：调用方据此区分 409（版本已存在）/ 400（manifest 非法）/ 403（无权限）。 */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${HUB_URL}${path}`)
  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status}${res.status === 404 ? '：包或版本不存在' : ''}`)
  }
  return res.json() as Promise<T>
}

/** 路由参数 scope 不带 @（约定），此处统一补回 server 要求的 @scope 形态。 */
function scoped(scope: string): string {
  return scope.startsWith('@') ? scope : `@${scope}`
}

export function fetchIndex(): Promise<HubIndex> {
  return getJson<HubIndex>('/v/index.json')
}

export function fetchPackage(scope: string, name: string): Promise<HubPackageDetail> {
  return getJson<HubPackageDetail>(`/v/${scoped(scope)}/${name}`)
}

export function resolvePackage(scope: string, name: string): Promise<HubResolve> {
  return getJson<HubResolve>(`/resolve/${scoped(scope)}/${name}`)
}

/** files.json 中的单个文件条目（path 为包内相对路径，posix 分隔）。 */
export interface HubPackageFile {
  path: string
  size: number
  sha256: string
}

/** GET /v/@scope/name@version/files.json（公开，不含 manifest.json）。 */
export interface HubPackageFiles {
  scope: string
  name: string
  version: string
  files: HubPackageFile[]
}

function encodePath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

/**
 * files.json 的 404 有两种语义，须分开提示：
 * - `{"error":"not found"}`：catch-all 未命中该路由 → 运行中的 server 是未含 files.json 路由的旧进程；
 * - `package not found` / `version not found`：路由存在，包或版本确实不存在。
 */
export async function fetchPackageFiles(scope: string, name: string, version: string): Promise<HubPackageFiles> {
  const res = await fetch(`${HUB_URL}/v/${scoped(scope)}/${name}@${version}/files.json`)
  if (!res.ok) {
    const code: string | null = await res
      .json()
      .then((body: { error?: unknown } | null) => (typeof body?.error === 'string' ? body.error : null))
      .catch(() => null)
    if (res.status === 404 && code === 'not found') {
      throw new Error('HTTP 404：服务端未提供 files.json 接口（可能是旧版 hub server 进程），请重启 hub server')
    }
    throw new Error(`HTTP ${res.status}${res.status === 404 ? '：包或版本不存在' : ''}`)
  }
  return res.json() as Promise<HubPackageFiles>
}

/** 包内文件原始内容 URL（公开，Content-Type 依扩展名）。 */
export function packageFileUrl(scope: string, name: string, version: string, path: string): string {
  return `${HUB_URL}/v/${scoped(scope)}/${name}@${version}/${encodePath(path)}`
}

/** 指定版本的 manifest.json URL（公开）。 */
export function packageManifestUrl(scope: string, name: string, version: string): string {
  return `${HUB_URL}/v/${scoped(scope)}/${name}@${version}/manifest.json`
}

/** 版本目录下的绝对 URL（entry.module / entry.css 均为包内 posix 相对路径）。 */
export function versionBaseUrl(scope: string, name: string, version: string): string {
  return `${HUB_URL}/v/${scoped(scope)}/${name}@${version}/`
}

/** <HubRemote> 的 pkg 参数：远程模块与样式（可由运行时 loader 直接加载）。 */
export interface RemotePkg {
  moduleUrl: string
  cssUrls: string[]
}

/**
 * 从 manifest.entry 推导远程渲染 URL；entry 缺失或非法时返回 null（卡片据此降级显示）。
 * manifest 来自 detail.versions[].manifest，与 `@ver/manifest.json` 内容一致。
 */
export function remotePkgOf(
  scope: string,
  name: string,
  version: string,
  manifest: Record<string, unknown> | null | undefined,
): RemotePkg | null {
  const entry = manifest?.entry as { module?: unknown; css?: unknown } | undefined
  if (!entry || typeof entry.module !== 'string' || !entry.module) return null
  const base = versionBaseUrl(scope, name, version)
  const css = Array.isArray(entry.css) ? entry.css.filter((c): c is string => typeof c === 'string') : []
  return { moduleUrl: base + encodePath(entry.module), cssUrls: css.map((c) => base + encodePath(c)) }
}

/** 卡片「复制 CLI 命令」的剪贴板内容（构建期经 dpui use 锁定远程版本）。 */
export function cliAddCommand(scope: string, name: string, version: string): string {
  return [`pnpm add -D @openui_hub/plugin_vite`, `dpui use ${scoped(scope)}/${name}@${version}`].join('\n')
}

/* ------------------------------------------------------------------ *
 * 账号 / 权限（契约 §3.3）
 * ------------------------------------------------------------------ */

export type HubRole = 'admin' | 'publisher'

export interface AuthUser {
  id: number
  username: string
  role: HubRole
}

export interface AuthStatus {
  needsSetup: boolean
}

/** POST /api/auth/login 与 POST /api/setup 的返回体。 */
export interface LoginResult {
  sessionToken: string
  expiresAt: string
  user: AuthUser
}

export interface MeResult {
  user: AuthUser
  permissions: string[]
}

export interface HubUser {
  id: number
  username: string
  role: HubRole
  createdAt: string
  tokenCount: number
}

export interface HubToken {
  id: number
  name: string
  permissions: string[]
  userId: number
  username: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

/** POST /api/tokens 的返回体：`token` 明文仅此一次返回。 */
export interface CreateTokenResult {
  token: string
  id: number
  name: string
  permissions: string[]
  userId: number
  createdAt: string
}

/** localStorage 中持久化的登录态。 */
export interface HubSession {
  token: string
  expiresAt: string
  user: AuthUser
}

const SESSION_KEY = 'dpui.session'

function readSession(): HubSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as HubSession | null
    return parsed?.token ? parsed : null
  } catch {
    return null
  }
}

let session: HubSession | null = readSession()

/** 读取会话；storage 被其它标签页改动时以 storage 为准。 */
export function getSession(): HubSession | null {
  const stored = readSession()
  if (stored?.token !== session?.token) session = stored
  return session
}

export function setSession(next: HubSession): void {
  session = next
  localStorage.setItem(SESSION_KEY, JSON.stringify(next))
}

export function clearSession(): void {
  session = null
  localStorage.removeItem(SESSION_KEY)
}

/**
 * 会话失效时回到登录页。
 * 用整页跳转而非 vue-router：router 会经页面反向导入本模块，静态互导会形成循环依赖。
 */
function redirectToLogin(): void {
  const { pathname, search, hash } = window.location
  if (pathname === '/login') return
  const back = encodeURIComponent(`${pathname}${search}${hash}`)
  window.location.assign(`/login?redirect=${back}`)
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** 原始字节体（.tar.gz 上传）；与 `body` 互斥。 */
  raw?: { data: Blob; contentType: string }
  /** true 时附带 Bearer 会话令牌；401 会清除本地会话并跳转 /login。 */
  auth?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.raw) headers['Content-Type'] = options.raw.contentType
  else if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.auth && session) headers.Authorization = `Bearer ${session.token}`

  const res = await fetch(`${HUB_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.raw ? options.raw.data : options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (res.status === 401 && options.auth) {
    clearSession()
    redirectToLogin()
    throw new Error('登录已失效，请重新登录')
  }

  const text = await res.text()
  let payload: unknown
  try {
    payload = text ? JSON.parse(text) : undefined
  } catch {
    payload = undefined
  }

  if (!res.ok) {
    const message = (payload as { error?: string } | undefined)?.error
    throw new ApiError(res.status, message ?? `HTTP ${res.status}`)
  }
  return payload as T
}

export function fetchAuthStatus(): Promise<AuthStatus> {
  return request<AuthStatus>('/api/auth/status')
}

/** 初始化首个管理员（仅 users 表为空时可用）。 */
export function setup(username: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/api/setup', { method: 'POST', body: { username, password } })
}

export function login(username: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/api/auth/login', { method: 'POST', body: { username, password } })
}

export function logout(): Promise<void> {
  return request<void>('/api/auth/logout', { method: 'POST', auth: true })
}

export function fetchMe(): Promise<MeResult> {
  return request<MeResult>('/api/auth/me', { auth: true })
}

export function fetchUsers(): Promise<HubUser[]> {
  return request<{ users: HubUser[] }>('/api/users', { auth: true }).then((r) => r.users)
}

export interface CreateUserInput {
  username: string
  password: string
  role: HubRole
}

export function createUser(input: CreateUserInput): Promise<HubUser> {
  return request<HubUser>('/api/users', { method: 'POST', body: input, auth: true })
}

export interface UpdateUserInput {
  role?: HubRole
  password?: string
}

export function updateUser(id: number, patch: UpdateUserInput): Promise<void> {
  return request<void>(`/api/users/${id}`, { method: 'PATCH', body: patch, auth: true })
}

export function deleteUser(id: number): Promise<void> {
  return request<void>(`/api/users/${id}`, { method: 'DELETE', auth: true })
}

/** admin 可传 userId 查看指定用户的令牌。 */
export function fetchTokens(userId?: number): Promise<HubToken[]> {
  const query = userId === undefined ? '' : `?userId=${userId}`
  return request<{ tokens: HubToken[] }>(`/api/tokens${query}`, { auth: true }).then((r) => r.tokens)
}

export interface CreateTokenInput {
  name: string
  permissions: string[]
  userId?: number
}

export function createToken(input: CreateTokenInput): Promise<CreateTokenResult> {
  return request<CreateTokenResult>('/api/tokens', { method: 'POST', body: input, auth: true })
}

export function setTokenEnabled(id: number, enabled: boolean): Promise<void> {
  return request<void>(`/api/tokens/${id}`, { method: 'PATCH', body: { enabled }, auth: true })
}

export function deleteToken(id: number): Promise<void> {
  return request<void>(`/api/tokens/${id}`, { method: 'DELETE', auth: true })
}

/** unix 秒字符串 → 本地时间；空值显示 `—`。 */
export function formatTime(ts: string | null | undefined): string {
  if (!ts) return '—'
  const seconds = Number(ts)
  if (!Number.isFinite(seconds)) return ts
  return new Date(seconds * 1000).toLocaleString()
}

/* ------------------------------------------------------------------ *
 * 包管理（admin 会话令牌；契约 §管理端点）
 * ------------------------------------------------------------------ */

/** DELETE /api/packages/@scope/name@version：删单版本，latest 回落到剩余最新版。 */
export function deletePackageVersion(
  scope: string,
  name: string,
  version: string,
): Promise<{ deleted: string; latest: string | null }> {
  return request(`/api/packages/${scoped(scope)}/${name}@${version}`, { method: 'DELETE', auth: true })
}

/** DELETE /api/packages/@scope/name：删整包（含全部版本）。 */
export function deletePackage(scope: string, name: string): Promise<{ deleted: string; versions: number }> {
  return request(`/api/packages/${scoped(scope)}/${name}`, { method: 'DELETE', auth: true })
}

/** POST /api/publish 的返回体。 */
export interface PublishResult {
  name: string
  version: string
  manifestUrl: string
}

/** POST /api/publish：上传 `.tar.gz` 原始字节（manifest 校验由服务端完成）。 */
export function publishPackage(archive: Blob): Promise<PublishResult> {
  return request<PublishResult>('/api/publish', {
    method: 'POST',
    raw: { data: archive, contentType: 'application/octet-stream' },
    auth: true,
  })
}
