import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useAdminSession } from '../contexts/AdminSessionContext'

export function LoginPage() {
  const { setSession } = useAdminSession()
  const navigate = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from || '/dashboard'

  const [email, setEmail] = useState('admin@localhost')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const s = await api.login(email.trim(), password)
      setSession(s)
      setPassword('')
      navigate(from === '/login' ? '/dashboard' : from, { replace: true })
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sadmin-auth">
      <div className="sadmin-auth__panel">
        <h1 className="sadmin-auth__heading">Sign in</h1>
        <p className="sadmin-auth__lead">Super admin console</p>
        <form className="sadmin-auth__form" onSubmit={(e) => void handleSubmit(e)}>
          {err && <div className="sadmin-auth__error">{err}</div>}
          <label className="sadmin-field">
            <span className="sadmin-field__label">Email</span>
            <input
              className="sadmin-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="sadmin-field">
            <span className="sadmin-field__label">Password</span>
            <input
              className="sadmin-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="sadmin-btn sadmin-btn--primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
