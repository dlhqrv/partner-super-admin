const KEY = 'eddyconnect.admin.session'

export type AdminUser = {
  id: string
  email: string
  role: string
  last_login_at: string | null
  created_at: string | null
}

export type AdminSession = {
  access_token: string
  refresh_token: string
  refresh_expires_at: string
  admin: AdminUser
}

export function loadSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as AdminSession
    if (!s?.access_token || !s?.refresh_token || !s?.admin?.id) return null
    return s
  } catch {
    return null
  }
}

export function saveSession(s: AdminSession) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}

export function parseJwtExp(token: string | undefined | null): number | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = atob(padded)
    const obj = JSON.parse(json) as { exp?: number }
    return typeof obj.exp === 'number' ? obj.exp : null
  } catch {
    return null
  }
}
