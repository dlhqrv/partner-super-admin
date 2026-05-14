import type { AdminSession, AdminUser } from './session'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

const NO_RETRY = ['/admin/auth/login', '/admin/auth/refresh', '/admin/auth/logout']

type AuthHooks = {
  getSession: () => AdminSession | null
  setSession: (s: AdminSession | null) => void
  tryRefresh: () => Promise<string | null>
  onUnauthorized: () => void
}

let hooks: AuthHooks | null = null

export function configureAdminAuth(h: AuthHooks) {
  hooks = h
}

export class ApiError extends Error {
  status: number
  code: string
  data: Record<string, unknown>

  constructor(message: string, status: number, code: string, data: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

async function parseJson(res: Response): Promise<{ body: Record<string, unknown>; isJson: boolean }> {
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const text = await res.text()
    return { body: { _raw: text }, isJson: false }
  }
  try {
    const body = (await res.json()) as Record<string, unknown>
    return { body, isJson: true }
  } catch {
    return { body: {}, isJson: false }
  }
}

async function fetchWithAuth(path: string, init?: RequestInit): Promise<Response> {
  const url = `${BASE}${path}`
  const headers = new Headers(init?.headers)
  const session = hooks?.getSession() ?? null
  if (session?.access_token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  try {
    return await fetch(url, { ...init, headers })
  } catch {
    throw new ApiError(
      'Cannot reach the API. In dev, start p-Back first (`cd p-Back && npm run dev`, default port 4000). If the API uses another port, set VITE_API_PROXY_TARGET in super-admin/.env and restart Vite.',
      0,
      'NETWORK_ERROR',
    )
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await fetchWithAuth(path, init)

  const canRetry =
    res.status === 401 &&
    hooks?.tryRefresh &&
    !NO_RETRY.some((p) => path.startsWith(p))

  if (canRetry) {
    const token = await hooks!.tryRefresh()
    if (token) {
      res = await fetchWithAuth(path, init)
    }
  }

  if (res.status === 204) return undefined as T

  const { body, isJson } = await parseJson(res)

  if (!res.ok) {
    const code = (body?.error as string) || `HTTP_${res.status}`
    const message = (body?.message as string) || code
    if (res.status === 401 && !path.startsWith('/admin/auth/login')) {
      hooks?.onUnauthorized()
    }
    throw new ApiError(message, res.status, code, body ?? {})
  }

  if (!isJson) {
    throw new ApiError(`Non-JSON from ${path}`, res.status, 'BAD_RESPONSE', {})
  }

  return body as T
}

export type AdminLoginResponse = AdminSession

export type AdminOverviewResponse = {
  counts: {
    partners: number | null
    admin_users: number | null
    kyc_submissions: number | null
  }
  errors: {
    partners: string | null
    admin_users: string | null
    kyc_submissions: string | null
  }
}

export const api = {
  login: (email: string, password: string) =>
    request<AdminLoginResponse>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  refresh: (refresh_token: string) =>
    request<AdminLoginResponse>('/admin/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),

  logout: (refresh_token: string | null) =>
    request<void>('/admin/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),

  me: () => request<{ admin: AdminUser }>('/admin/auth/me'),

  overview: () => request<AdminOverviewResponse>('/admin/overview'),
}
