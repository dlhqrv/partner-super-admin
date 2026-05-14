import { useEffect } from 'react'

type Props = {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="sadmin-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="sadmin-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sadmin-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="sadmin-dialog-title" className="sadmin-dialog__title">
          {title}
        </h2>
        <p className="sadmin-dialog__body">{body}</p>
        <div className="sadmin-dialog__actions">
          <button type="button" className="sadmin-btn sadmin-btn--secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className="sadmin-btn sadmin-btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
