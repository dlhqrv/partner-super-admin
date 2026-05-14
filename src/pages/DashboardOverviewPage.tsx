import { useCallback, useEffect, useState } from 'react'
import { parseJwtExp } from '../lib/session'
import { useAdminSession } from '../contexts/AdminSessionContext'
import { api, ApiError } from '../lib/api'

export function DashboardOverviewPage() {
  const { session } = useAdminSession()
  const [overview, setOverview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setOverview(null)
    try {
      const o = await api.overview()
      setOverview(JSON.stringify(o, null, 2))
    } catch (e) {
      setOverview((e as ApiError).message || 'Failed to load overview')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const exp = session?.access_token ? parseJwtExp(session.access_token) : null
  const expLabel = exp ? new Date(exp * 1000).toLocaleString() : '—'

  return (
    <div className="sadmin-page">
      <div className="sadmin-page__header">
        <h2 className="sadmin-page__title">Overview</h2>
        <p className="sadmin-page__meta">
          Signed in as <strong>{session?.admin.email}</strong>
          <span className="sadmin-page__sep">·</span>
          Access token expires {expLabel}
        </p>
        <button type="button" className="sadmin-btn sadmin-btn--secondary" onClick={() => void load()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <pre className="sadmin-pre">{loading && !overview ? 'Loading…' : overview}</pre>
    </div>
  )
}
