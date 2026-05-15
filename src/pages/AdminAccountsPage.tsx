import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import type { AdminAccountRow } from '../lib/api'

export function AdminAccountsPage() {
  const [rows, setRows] = useState<AdminAccountRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const { accounts } = await api.accounts()
      setRows(accounts)
    } catch (e) {
      setRows(null)
      setErr((e as ApiError).message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="sadmin-page">
      <div className="sadmin-page__header">
        <h2 className="sadmin-page__title">Admin accounts</h2>
        <p className="sadmin-page__meta">Invite staff, track status, and manage access.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/dashboard/admins/new" className="sadmin-btn sadmin-btn--primary">
            Invite admin
          </Link>
          <button type="button" className="sadmin-btn sadmin-btn--secondary" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {err && <p className="sadmin-error">{err}</p>}

      {loading && !rows && <p className="sadmin-muted">Loading…</p>}

      {rows && (
        <div className="sadmin-table-wrap">
          <table className="sadmin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>TOTP</th>
                <th>Hardware</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{a.full_name}</td>
                  <td>{a.email}</td>
                  <td>{a.role}</td>
                  <td>{a.status}</td>
                  <td>{a.totp_enrolled ? 'yes' : 'no'}</td>
                  <td>{a.hardware_key_enrolled ? 'yes' : 'no'}</td>
                  <td>{a.last_login_at ? new Date(a.last_login_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
