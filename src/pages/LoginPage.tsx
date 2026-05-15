import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import type { AdminSession } from '../lib/session'
import { useAdminSession } from '../contexts/AdminSessionContext'

type Phase = 'password' | 'totp'

export function LoginPage() {
  const { setSession } = useAdminSession()
  const navigate = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from || '/dashboard'

  const [phase, setPhase] = useState<Phase>('password')
  const [email, setEmail] = useState('admin@localhost')
  const [password, setPassword] = useState('')
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [totp, setTotp] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setRetryAfter(null)
    setBusy(true)
    try {
      const r = await api.loginStep1(email.trim(), password)
      if ('mfa_required' in r && r.mfa_required) {
        setMfaToken(r.mfa_token)
        setPassword('')
        setPhase('totp')
      } else {
        setSession(r as AdminSession)
        setPassword('')
        navigate(from === '/login' ? '/dashboard' : from, { replace: true })
      }
    } catch (ex) {
      const ae = ex as ApiError
      setErr(ae.message || 'Login failed')
      if ((ae.code === 'ACCOUNT_LOCKED' || ae.status === 423) && typeof ae.data.retry_after === 'number') {
        setRetryAfter(ae.data.retry_after as number)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleTotpSubmit(e: FormEvent) {
    e.preventDefault()
    if (!mfaToken) return
    setErr(null)
    setRetryAfter(null)
    setBusy(true)
    try {
      const s = await api.loginStep2Totp(mfaToken, totp.trim())
      setSession(s)
      setTotp('')
      navigate(from === '/login' ? '/dashboard' : from, { replace: true })
    } catch (ex) {
      const ae = ex as ApiError
      setErr(ae.message || 'Verification failed')
      if ((ae.code === 'ACCOUNT_LOCKED' || ae.status === 423) && typeof ae.data.retry_after === 'number') {
        setRetryAfter(ae.data.retry_after as number)
      }
    } finally {
      setBusy(false)
    }
  }

  function backToPassword() {
    setPhase('password')
    setMfaToken(null)
    setTotp('')
    setErr(null)
    setRetryAfter(null)
  }

  return (
    <div className="sadmin-auth">
      <div className="sadmin-auth__panel">
        <h1 className="sadmin-auth__heading">Sign in</h1>
        <p className="sadmin-auth__lead">
          {phase === 'password' ? 'Super admin console' : 'Enter the 6-digit code from Google Authenticator or Authy.'}
        </p>
        {err && <div className="sadmin-auth__error">{err}</div>}
        {retryAfter != null && (
          <p className="sadmin-muted" style={{ marginBottom: 10 }}>
            Retry after {retryAfter} seconds.
          </p>
        )}

        {phase === 'password' && (
          <form className="sadmin-auth__form" onSubmit={(ev) => void handlePasswordSubmit(ev)}>
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
        )}

        {phase === 'totp' && (
          <form className="sadmin-auth__form" onSubmit={(ev) => void handleTotpSubmit(ev)}>
            <label className="sadmin-field">
              <span className="sadmin-field__label">Authenticator code</span>
              <input
                className="sadmin-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </label>
            <button type="submit" className="sadmin-btn sadmin-btn--primary" disabled={busy || totp.length !== 6}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" className="sadmin-btn sadmin-btn--secondary" onClick={backToPassword} disabled={busy}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
