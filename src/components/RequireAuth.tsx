import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminSession } from '../contexts/AdminSessionContext'

/** Dashboard and other authenticated routes. */
export function RequireAuth() {
  const { session } = useAdminSession()
  const loc = useLocation()

  if (!session?.access_token) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }

  return <Outlet />
}
