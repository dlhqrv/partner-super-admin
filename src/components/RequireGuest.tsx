import { Navigate, Outlet } from 'react-router-dom'
import { useAdminSession } from '../contexts/AdminSessionContext'

/** Login only — signed-in users go to the dashboard. */
export function RequireGuest() {
  const { session } = useAdminSession()

  if (session?.access_token) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
