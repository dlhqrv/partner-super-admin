import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { loadSession } from '../lib/session'
import { useAdminSession } from '../contexts/AdminSessionContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useMediaQuery } from '../hooks/useMediaQuery'

const SIDEBAR_COLLAPSED_KEY = 'eddyconnect.admin.sidebarCollapsed'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function DashboardLayout() {
  const { session, setSession } = useAdminSession()
  const navigate = useNavigate()
  const location = useLocation()
  const titlebarLabel = location.pathname.startsWith('/dashboard/audit')
    ? 'Audit log'
    : location.pathname.startsWith('/dashboard/admins/new')
      ? 'Invite admin'
      : location.pathname.startsWith('/dashboard/admins')
        ? 'Admins'
        : 'Dashboard'
  const isNarrow = useMediaQuery('(max-width: 768px)')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed])

  const dockCollapsed = sidebarCollapsed && !isNarrow

  async function doLogout() {
    setLoggingOut(true)
    try {
      const s = loadSession()
      await api.logout(s?.refresh_token ?? null)
    } catch {
      /* ignore */
    } finally {
      setSession(null)
      setConfirmLogout(false)
      setLoggingOut(false)
      setSidebarOpen(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="sadmin-app">
      <div
        className={`sadmin-sidebar-scrim ${sidebarOpen ? 'is-open' : ''}`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={[
          'sadmin-sidebar',
          sidebarOpen ? 'is-open' : '',
          dockCollapsed ? 'sadmin-sidebar--collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Main navigation"
      >
        <div className="sadmin-sidebar__brand">
          <span className="sadmin-sidebar__logo" aria-hidden="true" />
          <span className="sadmin-sidebar__title">Super Admin</span>
          {isNarrow ? (
            <button
              type="button"
              className="sadmin-sidebar__pin"
              aria-label="Close sidebar"
              title="Close"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeftIcon />
            </button>
          ) : (
            <button
              type="button"
              className="sadmin-sidebar__pin"
              aria-label={dockCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={dockCollapsed ? 'Expand' : 'Collapse'}
              onClick={() => setSidebarCollapsed((c) => !c)}
            >
              {dockCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          )}
        </div>

        <nav className="sadmin-sidebar__nav">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `sadmin-nav-item${isActive ? ' is-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            title="Overview"
          >
            <span className="sadmin-nav-item__icon" aria-hidden="true">
              <OverviewIcon />
            </span>
            <span className="sadmin-nav-item__text">Overview</span>
          </NavLink>
          <NavLink
            to="/dashboard/audit"
            className={({ isActive }) => `sadmin-nav-item${isActive ? ' is-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            title="Audit log"
          >
            <span className="sadmin-nav-item__icon" aria-hidden="true">
              <AuditIcon />
            </span>
            <span className="sadmin-nav-item__text">Audit</span>
          </NavLink>
          <NavLink
            to="/dashboard/admins"
            className={({ isActive }) => `sadmin-nav-item${isActive ? ' is-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            title="Admin accounts"
          >
            <span className="sadmin-nav-item__icon" aria-hidden="true">
              <UsersIcon />
            </span>
            <span className="sadmin-nav-item__text">Admins</span>
          </NavLink>
        </nav>

        <div className="sadmin-sidebar__footer">
          <div className="sadmin-sidebar__user" title={session?.admin.email}>
            <span className="sadmin-sidebar__user-email">{session?.admin.email}</span>
          </div>
          <button
            type="button"
            className="sadmin-sidebar__logout"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => setConfirmLogout(true)}
          >
            <span className="sadmin-sidebar__logout-icon" aria-hidden="true">
              <LogoutIcon />
            </span>
            <span className="sadmin-sidebar__logout-text">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="sadmin-workspace">
        <header className="sadmin-titlebar">
          <button
            type="button"
            className="sadmin-titlebar__menu"
            aria-label="Open menu"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <span className="sadmin-titlebar__label">{titlebarLabel}</span>
        </header>

        <main className="sadmin-editor">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out"
        body="You will need to sign in again to access the admin panel."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        busy={loggingOut}
        onCancel={() => !loggingOut && setConfirmLogout(false)}
        onConfirm={() => void doLogout()}
      />
    </div>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function OverviewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function AuditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10 17H6a2 2 0 01-2-2V9a2 2 0 012-2h4M14 15l4-3-4-3M18 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

