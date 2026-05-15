import type { AdminSession, AdminUser } from './session'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

const NO_RETRY = ['/admin/auth/login', '/admin/auth/login/mfa', '/admin/auth/refresh', '/admin/auth/logout']

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

async function postAdminAuthJson(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = `${BASE}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'Cannot reach the API. In dev, start p-Back first (`cd p-Back && npm run dev`, default port 4000). If the API uses another port, set VITE_API_PROXY_TARGET in super-admin/.env and restart Vite.',
      0,
      'NETWORK_ERROR',
    )
  }
  const { body: json, isJson } = await parseJson(res)
  if (res.status === 423) {
    const code = (json?.error as string) || 'ACCOUNT_LOCKED'
    const message = (json?.message as string) || code
    throw new ApiError(message, res.status, code, json ?? {})
  }
  if (!res.ok) {
    const code = (json?.error as string) || `HTTP_${res.status}`
    const message = (json?.message as string) || code
    throw new ApiError(message, res.status, code, json ?? {})
  }
  if (!isJson) {
    throw new ApiError(`Non-JSON from ${path}`, res.status, 'BAD_RESPONSE', {})
  }
  return json
}

export type AdminLoginResponse = AdminSession

export type AdminLoginStep1Result = AdminLoginResponse | { mfa_required: true; mfa_token: string }

export type AdminOverviewResponse = {
  counts: {
    partners: number | null
    admin_accounts: number | null
    kyc_submissions: number | null
  }
  errors: {
    partners: string | null
    admin_accounts: string | null
    kyc_submissions: string | null
  }
}

export type AdminAccountRow = {
  id: string
  full_name: string
  email: string
  phone: string
  role: string
  status: string
  totp_enrolled: boolean
  hardware_key_enrolled: boolean
  access_level_notes: string | null
  created_by_admin_id: string | null
  invited_at: string | null
  activated_at: string | null
  last_login_at: string | null
  created_at: string
}

export type AdminAccountsListResponse = {
  accounts: AdminAccountRow[]
}

export type AdminInviteCreateResponse = {
  account: {
    id: string
    full_name: string
    email: string
    phone: string
    role: string
    status: string
    invited_at: string | null
    created_at: string
  }
  dev_invite_url?: string
}

export type AuditLogItem = {
  id: string
  partner_id: string | null
  event: string
  metadata: Record<string, unknown> | null
  ip: string | null
  user_agent: string | null
  created_at: string
}

export type AuditLogsResponse = {
  items: AuditLogItem[]
}

export const api = {
  loginStep1: async (email: string, password: string): Promise<AdminLoginStep1Result> => {
    const json = await postAdminAuthJson('/admin/auth/login', { email, password })
    if (json.mfa_required === true && typeof json.mfa_token === 'string') {
      return { mfa_required: true, mfa_token: json.mfa_token }
    }
    return json as AdminLoginResponse
  },

  loginStep2Totp: async (mfa_token: string, totp: string): Promise<AdminLoginResponse> => {
    const json = await postAdminAuthJson('/admin/auth/login/mfa', { mfa_token, totp })
    return json as AdminLoginResponse
  },

  login: async (email: string, password: string): Promise<AdminLoginResponse> => {
    const r = await api.loginStep1(email, password)
    if ('mfa_required' in r && r.mfa_required) {
      throw new ApiError('Authenticator code required', 400, 'MFA_REQUIRED', {})
    }
    return r as AdminLoginResponse
  },

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

  accounts: () => request<AdminAccountsListResponse>('/admin/accounts'),

  createAdminInvite: (body: {
    full_name: string
    email: string
    phone: string
    role: 'admin' | 'super_admin'
    access_level_notes?: string | null
  }) =>
    request<AdminInviteCreateResponse>('/admin/accounts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  auditLogs: (params?: { limit?: number; since?: string; event?: string }) => {
    const sp = new URLSearchParams()
    if (params?.limit != null) sp.set('limit', String(params.limit))
    if (params?.since) sp.set('since', params.since)
    if (params?.event) sp.set('event', params.event)
    const q = sp.toString()
    return request<AuditLogsResponse>(`/admin/audit-logs${q ? `?${q}` : ''}`)
  },
}
