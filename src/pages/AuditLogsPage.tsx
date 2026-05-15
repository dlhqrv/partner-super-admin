import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, type AuditLogItem } from '../lib/api'
import { getBrowserSupabase, isAuditRealtimeConfigured } from '../lib/supabaseBrowser'
import { useAdminSession } from '../contexts/AdminSessionContext'

const POLL_FALLBACK_MS = 12_000
const MAX_ROWS = 250

function shortUa(s: string | null, max = 80): string {
  if (!s) return '—'
  return s.length <= max ? s : `${s.slice(0, max)}…`
}

function formatMeta(meta: Record<string, unknown> | null): string {
  if (meta == null) return '—'
  try {
    return JSON.stringify(meta, null, 2)
  } catch {
    return String(meta)
  }
}

function rowFromRealtimePayload(newRow: Record<string, unknown>): AuditLogItem {
  return {
    id: String(newRow.id ?? ''),
    partner_id: (newRow.partner_id as string | null) ?? null,
    event: String(newRow.event ?? ''),
    metadata: (newRow.metadata as Record<string, unknown> | null) ?? null,
    ip: (newRow.ip as string | null) ?? null,
    user_agent: (newRow.user_agent as string | null) ?? null,
    created_at: String(newRow.created_at ?? ''),
  }
}

export function AuditLogsPage() {
  const { session } = useAdminSession()
  const isSuper = session?.admin?.role === 'super_admin'

  const [items, setItems] = useState<AuditLogItem[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [live, setLive] = useState(true)
  const [eventFilter, setEventFilter] = useState('')
  const [debouncedEvent, setDebouncedEvent] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<'idle' | 'connecting' | 'subscribed' | 'error' | 'disabled'>(
    () => (isAuditRealtimeConfigured() ? 'idle' : 'disabled'),
  )

  const filterRef = useRef(debouncedEvent)
  filterRef.current = debouncedEvent

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedEvent(eventFilter.trim()), 400)
    return () => window.clearTimeout(t)
  }, [eventFilter])

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isSuper) return
      if (opts?.silent) setRefreshing(true)
      else setLoading(true)
      setErr(null)
      try {
        const { items: rows } = await api.auditLogs({
          limit: 150,
          event: debouncedEvent || undefined,
        })
        setItems(rows)
        setLastUpdated(new Date())
      } catch (e) {
        const ae = e as ApiError
        setErr(ae.message || 'Failed to load audit log')
        setItems(null)
      } finally {
        if (opts?.silent) setRefreshing(false)
        else setLoading(false)
      }
    },
    [isSuper, debouncedEvent],
  )

  useEffect(() => {
    if (!isSuper) {
      setLoading(false)
      return
    }
    void load()
  }, [isSuper, load])

  /** Supabase Realtime: push new INSERT rows into the table. */
  useEffect(() => {
    if (!isSuper || !live) {
      setRealtimeStatus((s) => (isAuditRealtimeConfigured() ? s : 'disabled'))
      return
    }
    if (!isAuditRealtimeConfigured()) {
      setRealtimeStatus('disabled')
      return
    }

    const supabase = getBrowserSupabase()
    if (!supabase) {
      setRealtimeStatus('disabled')
      return
    }

    setRealtimeStatus('connecting')
    const channel = supabase
      .channel(`audit_logs_inserts_${Math.random().toString(36).slice(2, 9)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          const raw = payload.new as Record<string, unknown>
          const row = rowFromRealtimePayload(raw)
          if (!row.id) return
          const f = filterRef.current.toLowerCase()
          if (f && !row.event.toLowerCase().includes(f)) return
          setItems((prev) => {
            if (!prev) return [row]
            if (prev.some((x) => x.id === row.id)) return prev
            return [row, ...prev].slice(0, MAX_ROWS)
          })
          setLastUpdated(new Date())
        },
      )
      .subscribe((status, subErr) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('subscribed')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('error')
          if (subErr) console.error('[audit realtime]', status, subErr)
        }
      })

    return () => {
      void supabase.removeChannel(channel)
      setRealtimeStatus('idle')
    }
  }, [isSuper, live])

  const pollFallback = !isAuditRealtimeConfigured() || realtimeStatus === 'error'

  useEffect(() => {
    if (!isSuper || !live || !pollFallback) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void load({ silent: true })
    }, POLL_FALLBACK_MS)
    return () => window.clearInterval(id)
  }, [isSuper, live, pollFallback, load])

  if (!isSuper) {
    return (
      <div className="sadmin-page">
        <h2 className="sadmin-page__title">Audit log</h2>
        <p className="sadmin-error">Super admin access required.</p>
        <p className="sadmin-muted">Only super admins can read the global audit trail.</p>
        <Link to="/dashboard" className="sadmin-btn sadmin-btn--secondary">
          Back to overview
        </Link>
      </div>
    )
  }

  const rtConfigured = isAuditRealtimeConfigured()
  const liveModeLabel =
    !live
      ? 'Off'
      : !rtConfigured
        ? 'Polling'
        : realtimeStatus === 'subscribed'
          ? 'Realtime'
          : realtimeStatus === 'connecting'
            ? 'Connecting…'
            : realtimeStatus === 'error'
              ? 'Realtime error (polling)'
              : 'Starting…'

  return (
    <div className="sadmin-page sadmin-page--audit">
      <div className="sadmin-page__header">
        <div className="sadmin-audit-header__titles">
          <h2 className="sadmin-page__title">Audit log</h2>
          <p className="sadmin-page__meta">
            Tail of <code className="sadmin-code">audit_logs</code> (KYC views, approvals, partner logins, admin
            actions). With <strong>Live</strong> on, new rows stream via{' '}
            <strong>Supabase Realtime</strong> when <code className="sadmin-code">VITE_SUPABASE_URL</code> and{' '}
            <code className="sadmin-code">VITE_SUPABASE_ANON_KEY</code> are set and the table is in the{' '}
            <code className="sadmin-code">supabase_realtime</code> publication (
            <code className="sadmin-code">p-Back/sql/FIX_audit_logs_realtime_publication.sql</code>). Otherwise the UI
            falls back to polling the API.
          </p>
        </div>

        <div className="sadmin-audit-toolbar">
          <label className="sadmin-audit-field">
            <span className="sadmin-audit-field__label">Filter by event</span>
            <input
              type="search"
              className="sadmin-audit-input"
              placeholder="e.g. kyc_ or partner_login"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="sadmin-audit-toggle">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
            <span>Live updates</span>
          </label>
          {live ? (
            <span
              className={`sadmin-audit-live-badge${pollFallback && rtConfigured ? ' sadmin-audit-live-badge--warn' : ''}`}
              title={
                pollFallback && rtConfigured
                  ? 'Realtime failed; using HTTP polling until you fix the connection or publication.'
                  : undefined
              }
            >
              {liveModeLabel}
            </span>
          ) : null}
          {refreshing ? <span className="sadmin-muted">Refreshing…</span> : null}
          <button type="button" className="sadmin-btn sadmin-btn--secondary" onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh now'}
          </button>
        </div>
        {lastUpdated ? (
          <p className="sadmin-muted sadmin-audit-updated">
            Last update: {lastUpdated.toLocaleString()} · {items?.length ?? 0} rows
            {rtConfigured && live && realtimeStatus === 'subscribed' ? ' · inserts pushed live' : ''}
          </p>
        ) : null}
      </div>

      {err && <p className="sadmin-error">{err}</p>}

      {loading && !items && <p className="sadmin-muted">Loading…</p>}

      {items && (
        <div className="sadmin-table-wrap sadmin-audit-table-wrap">
          <table className="sadmin-table sadmin-audit-table">
            <thead>
              <tr>
                <th className="sadmin-audit-col-time">Time</th>
                <th className="sadmin-audit-col-event">Event</th>
                <th className="sadmin-audit-col-partner">Partner</th>
                <th className="sadmin-audit-col-meta">Metadata</th>
                <th className="sadmin-audit-col-ip">IP</th>
                <th className="sadmin-audit-col-ua">User agent</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td className="sadmin-audit-col-time">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="sadmin-audit-col-event">
                    <code className="sadmin-code">{row.event}</code>
                  </td>
                  <td className="sadmin-audit-col-partner">{row.partner_id ?? '—'}</td>
                  <td className="sadmin-audit-col-meta">
                    <details className="sadmin-audit-details">
                      <summary className="sadmin-audit-details__summary">JSON</summary>
                      <pre className="sadmin-pre sadmin-audit-json">{formatMeta(row.metadata)}</pre>
                    </details>
                  </td>
                  <td className="sadmin-audit-col-ip">{row.ip ?? '—'}</td>
                  <td className="sadmin-audit-col-ua">{shortUa(row.user_agent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items && items.length === 0 && !loading ? (
        <p className="sadmin-muted">No rows match the current filter.</p>
      ) : null}
    </div>
  )
}
