import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, configureAdminAuth } from '../lib/api'
import { clearSession, loadSession, saveSession, type AdminSession } from '../lib/session'

type Ctx = {
  session: AdminSession | null
  setSession: (s: AdminSession | null) => void
  refreshSession: () => void
}

const AdminSessionContext = createContext<Ctx | null>(null)

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AdminSession | null>(() => loadSession())

  const setSession = useCallback((s: AdminSession | null) => {
    setSessionState(s)
    if (s) saveSession(s)
    else clearSession()
  }, [])

  const refreshSession = useCallback(() => {
    setSessionState(loadSession())
  }, [])

  const tryRefresh = useCallback(async (): Promise<string | null> => {
    const s = loadSession()
    if (!s?.refresh_token) return null
    try {
      const next = await api.refresh(s.refresh_token)
      saveSession(next)
      setSessionState(next)
      return next.access_token
    } catch {
      clearSession()
      setSessionState(null)
      return null
    }
  }, [])

  const onUnauthorized = useCallback(() => {
    clearSession()
    setSessionState(null)
  }, [])

  useEffect(() => {
    configureAdminAuth({
      getSession: loadSession,
      setSession,
      tryRefresh,
      onUnauthorized,
    })
  }, [setSession, tryRefresh, onUnauthorized])

  const value = useMemo(
    () => ({
      session,
      setSession,
      refreshSession,
    }),
    [session, setSession, refreshSession],
  )

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
}

export function useAdminSession() {
  const c = useContext(AdminSessionContext)
  if (!c) throw new Error('useAdminSession must be used within AdminSessionProvider')
  return c
}
