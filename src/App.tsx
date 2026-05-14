import { Navigate, Route, Routes } from 'react-router-dom'
import {
  AdminSessionProvider,
  useAdminSession,
} from './contexts/AdminSessionContext'
import { RequireAuth } from './components/RequireAuth'
import { RequireGuest } from './components/RequireGuest'
import { DashboardLayout } from './layouts/DashboardLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardOverviewPage } from './pages/DashboardOverviewPage'
import './App.css'

function RootRedirect() {
  const { session } = useAdminSession()
  if (session?.access_token) return <Navigate to="/dashboard" replace />
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<RequireGuest />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardOverviewPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AdminSessionProvider>
      <AppRoutes />
    </AdminSessionProvider>
  )
}
