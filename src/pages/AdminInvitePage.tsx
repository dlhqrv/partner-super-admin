import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../lib/api'

export function AdminInvitePage() {
  const [full_name, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin')
  const [access_level_notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [devUrl, setDevUrl] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setDevUrl(null)
    setDone(false)
    try {
      const res = await api.createAdminInvite({
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        access_level_notes: access_level_notes.trim() || null,
      })
      setDone(true)
      if (res.dev_invite_url) setDevUrl(res.dev_invite_url)
    } catch (ex) {
      const ae = ex as ApiError
      setErr(ae.message || 'Invite failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sadmin-page">
      <div className="sadmin-page__header">
        <h2 className="sadmin-page__title">Invite admin</h2>
        <p className="sadmin-page__meta">Creates an invited account and a 72-hour setup link (email integration pending).</p>
        <Link to="/dashboard/admins" className="sadmin-btn sadmin-btn--secondary">
          Back to list
        </Link>
      </div>

      {done && (
        <div className="sadmin-callout sadmin-callout--success">
          <strong>Invite created</strong>
          <p className="sadmin-muted">The admin appears as &quot;invited&quot; in the list. Production email delivery is not wired yet.</p>
          {devUrl && (
            <>
              <p className="sadmin-muted">Setup link (only when ADMIN_INVITE_RETURN_URL=1 on API):</p>
              <pre className="sadmin-pre sadmin-pre--tight">{devUrl}</pre>
            </>
          )}
        </div>
      )}

      {err && <p className="sadmin-error">{err}</p>}

      <form className="sadmin-auth__form" onSubmit={(ev) => void onSubmit(ev)}>
        <label className="sadmin-field">
          <span className="sadmin-field__label">Full name</span>
          <input
            className="sadmin-input"
            value={full_name}
            onChange={(ev) => setFullName(ev.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label className="sadmin-field">
          <span className="sadmin-field__label">Work email</span>
          <input
            className="sadmin-input"
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
          />
        </label>
        <label className="sadmin-field">
          <span className="sadmin-field__label">Phone (E.164)</span>
          <input
            className="sadmin-input"
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            required
            placeholder="+84…"
          />
        </label>
        <label className="sadmin-field">
          <span className="sadmin-field__label">Role</span>
          <select className="sadmin-input" value={role} onChange={(ev) => setRole(ev.target.value as 'admin' | 'super_admin')}>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </label>
        <label className="sadmin-field">
          <span className="sadmin-field__label">Access notes (optional)</span>
          <textarea className="sadmin-input" value={access_level_notes} onChange={(ev) => setNotes(ev.target.value)} rows={3} />
        </label>
        <button type="submit" className="sadmin-btn sadmin-btn--primary" disabled={busy}>
          {busy ? 'Sending…' : 'Create invite'}
        </button>
      </form>
    </div>
  )
}
