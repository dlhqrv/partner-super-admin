import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

const PARTNER_ADMIN_LOGIN =
  import.meta.env.VITE_PARTNER_ADMIN_LOGIN_URL ?? 'http://localhost:5173/partner-admin/auth/login'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

type Step = 'loading' | 'bad' | 'password' | 'totp' | 'backups' | 'done'

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const msg = (data.message as string) || (data.error as string) || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

export function InviteSetupPage() {
  const [params] = useSearchParams()
  const rawInviteToken = params.get('token')

  const [step, setStep] = useState<Step>('loading')
  const [error, setError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [setupTokenPw, setSetupTokenPw] = useState<string | null>(null)
  const [setupTokenConfirm, setSetupTokenConfirm] = useState<string | null>(null)
  const [setupTokenAck, setSetupTokenAck] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [backupsSaved, setBackupsSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const runVerify = useCallback(async (token: string) => {
    setError(null)
    setStep('loading')
    try {
      const r = await postJson<{ full_name: string; email: string; setup_token: string }>('/admin/invite/verify', {
        token,
      })
      setFullName(r.full_name)
      setEmail(r.email)
      setSetupTokenPw(r.setup_token)
      setStep('password')
    } catch (e) {
      setError((e as Error).message)
      setStep('bad')
    }
  }, [])

  useEffect(() => {
    if (!rawInviteToken) {
      setError('This page needs an invite link with ?token=…')
      setStep('bad')
      return
    }
    void runVerify(rawInviteToken)
  }, [rawInviteToken, runVerify])

  async function submitPassword(ev: FormEvent) {
    ev.preventDefault()
    if (!setupTokenPw) return
    if (password !== password2) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const r = await postJson<{ setup_token: string }>('/admin/invite/password', {
        setup_token: setupTokenPw,
        password,
      })
      const ti = await postJson<{ qr_data_url: string; setup_token_confirm: string }>('/admin/invite/totp/init', {
        setup_token: r.setup_token,
      })
      setQrDataUrl(ti.qr_data_url)
      setSetupTokenConfirm(ti.setup_token_confirm)
      setPassword('')
      setPassword2('')
      setStep('totp')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function submitTotp(ev: FormEvent) {
    ev.preventDefault()
    if (!setupTokenConfirm) return
    setBusy(true)
    setError(null)
    try {
      const r = await postJson<{ backup_codes: string[]; setup_token_ack: string }>('/admin/invite/totp/confirm', {
        setup_token_confirm: setupTokenConfirm,
        code: totpCode.trim(),
      })
      setBackupCodes(r.backup_codes)
      setSetupTokenAck(r.setup_token_ack)
      setTotpCode('')
      setStep('backups')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function submitComplete(ev: FormEvent) {
    ev.preventDefault()
    if (!setupTokenAck || !backupsSaved) return
    setBusy(true)
    setError(null)
    try {
      await postJson('/admin/invite/complete', {
        setup_token_ack: setupTokenAck,
        backups_saved: true,
      })
      setStep('done')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sadmin-auth">
      <div className="sadmin-auth__panel sadmin-auth__panel--wide">
        <h1 className="sadmin-auth__heading">Admin invite setup</h1>
        <p className="sadmin-auth__lead">
          {fullName ? (
            <>
              Hi {fullName} · <span className="sadmin-auth__email">{email}</span>
            </>
          ) : (
            'Validating your invite…'
          )}
        </p>

        {error && <div className="sadmin-auth__error">{error}</div>}

        {step === 'loading' && <p className="sadmin-auth__lead">Checking invite link…</p>}

        {step === 'bad' && (
          <p className="sadmin-auth__lead">
            <a href={PARTNER_ADMIN_LOGIN} className="sadmin-auth__lead" style={{ display: 'block' }}>
              Go to partner admin sign in
            </a>
          </p>
        )}

        {step === 'password' && setupTokenPw && (
          <form className="sadmin-auth__form" onSubmit={(e) => void submitPassword(e)}>
            <p className="sadmin-muted">Choose a password (min 10 characters with upper, lower, and a digit).</p>
            <label className="sadmin-field">
              <span className="sadmin-field__label">Password</span>
              <input
                className="sadmin-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
              />
            </label>
            <label className="sadmin-field">
              <span className="sadmin-field__label">Confirm password</span>
              <input
                className="sadmin-input"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                minLength={10}
              />
            </label>
            <button type="submit" className="sadmin-btn sadmin-btn--primary" disabled={busy}>
              {busy ? 'Saving…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'totp' && (
          <form className="sadmin-auth__form" onSubmit={(e) => void submitTotp(e)}>
            <p className="sadmin-muted">Scan this QR in Google Authenticator or Authy, then enter the 6-digit code.</p>
            {qrDataUrl && (
              <div className="sadmin-qr-wrap">
                <img src={qrDataUrl} width={200} height={200} alt="Authenticator QR code" />
              </div>
            )}
            {!qrDataUrl && !error && <p className="sadmin-auth__lead">Preparing QR code…</p>}
            <label className="sadmin-field">
              <span className="sadmin-field__label">6-digit code</span>
              <input
                className="sadmin-input"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </label>
            <button type="submit" className="sadmin-btn sadmin-btn--primary" disabled={busy || !setupTokenConfirm}>
              {busy ? 'Checking…' : 'Confirm authenticator'}
            </button>
          </form>
        )}

        {step === 'backups' && (
          <form className="sadmin-auth__form" onSubmit={(e) => void submitComplete(e)}>
            <p className="sadmin-muted">
              Save these backup codes once — they will not be shown again. Each code works a single time.
            </p>
            <ul className="sadmin-backup-list">
              {backupCodes.map((c) => (
                <li key={c}>
                  <code>{c}</code>
                </li>
              ))}
            </ul>
            <label className="sadmin-field sadmin-field--row">
              <input type="checkbox" checked={backupsSaved} onChange={(e) => setBackupsSaved(e.target.checked)} />
              <span className="sadmin-field__label">I have saved my backup codes</span>
            </label>
            <button type="submit" className="sadmin-btn sadmin-btn--primary" disabled={busy || !backupsSaved}>
              {busy ? 'Finishing…' : 'Activate account'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="sadmin-auth__form">
            <p className="sadmin-muted">Your account is active. You can sign in on the partner app.</p>
            <a
              href={PARTNER_ADMIN_LOGIN}
              className="sadmin-btn sadmin-btn--primary"
              style={{ textAlign: 'center', textDecoration: 'none', display: 'inline-block' }}
              rel="noopener noreferrer"
            >
              Go to partner admin sign in
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
