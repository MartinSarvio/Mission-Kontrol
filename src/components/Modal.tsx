import { ReactNode, useEffect, useRef, useId } from 'react'
import Icon from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  description?: string
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), details > summary'
    )
  )
}

export default function Modal({ open, onClose, title, children, description }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const titleId = useId()
  const descId = useId()

  // Gem trigger-elementet når modal åbner
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement
    }
  }, [open])

  // Returnér focus til trigger-elementet ved lukning
  useEffect(() => {
    if (!open && triggerRef.current) {
      ;(triggerRef.current as HTMLElement).focus?.()
      triggerRef.current = null
    }
  }, [open])

  // Sæt fokus på første fokuserbare element når modal åbner
  useEffect(() => {
    if (!open || !dialogRef.current) return
    const raf = requestAnimationFrame(() => {
      if (!dialogRef.current) return
      const focusable = getFocusableElements(dialogRef.current)
      if (focusable.length > 0) focusable[0].focus()
      else dialogRef.current.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  // Escape-tast + Tab focus trap
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = getFocusableElements(dialogRef.current)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Lyt på programmatisk modal-close event
  useEffect(() => {
    if (!open) return
    const handler = () => onClose()
    window.addEventListener('modal-close', handler)
    return () => window.removeEventListener('modal-close', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          background: 'rgba(0,0,0,0.85)',
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="relative max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto rounded-xl modal-panel"
        style={{
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          background: 'rgba(10,10,15,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2 id={titleId} className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Luk"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <Icon name="xmark" size={14} className="text-white/50" />
          </button>
        </div>
        {description && (
          <p id={descId} className="sr-only">
            {description}
          </p>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
