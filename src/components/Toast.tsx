import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import Icon from './Icon'

// ── Types ──────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  createdAt: number
}

export interface ToastContextValue {
  /** Lav-niveau API — brug useToast hook for convenience metoder */
  showToast: (type: ToastType, message: string) => void
}

// ── Konstanter ─────────────────────────────────────────────────────────────────
const MAX_VISIBLE = 5
const TOAST_DURATION = 4000

// ── Context ────────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast skal bruges inden i ToastProvider')
  return context
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState<ToastItem[]>([])
  const queueRef = useRef<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    // Ryd timer
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setVisible(prev => {
      const next = prev.filter(t => t.id !== id)
      // Træk fra kø hvis der er plads
      if (queueRef.current.length > 0 && next.length < MAX_VISIBLE) {
        const toAdd = queueRef.current.splice(0, MAX_VISIBLE - next.length)
        toAdd.forEach(t => scheduleRemoval(t.id))
        return [...next, ...toAdd]
      }
      return next
    })
  }, [])

  const scheduleRemoval = useCallback((id: string) => {
    const timer = setTimeout(() => removeToast(id), TOAST_DURATION)
    timersRef.current.set(id, timer)
  }, [removeToast])

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const item: ToastItem = { id, type, message, createdAt: Date.now() }

    setVisible(prev => {
      if (prev.length < MAX_VISIBLE) {
        scheduleRemoval(id)
        return [...prev, item]
      } else {
        // Læg i kø
        queueRef.current = [...queueRef.current, item]
        return prev
      }
    })
  }, [scheduleRemoval])

  // Ryd timers ved unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={visible} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// ── Container ──────────────────────────────────────────────────────────────────
function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '400px',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <ToastItemView key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// ── Enkelt toast ───────────────────────────────────────────────────────────────
function ToastItemView({
  toast,
  onRemove,
}: {
  toast: ToastItem
  onRemove: (id: string) => void
}) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter')
  const [progress, setProgress] = useState(100)

  // Slide-in
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('visible'))
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  // Fade-out 300ms før dismiss
  useEffect(() => {
    const exitTimer = setTimeout(() => setPhase('exit'), TOAST_DURATION - 300)
    return () => clearTimeout(exitTimer)
  }, [])

  // Progress bar
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100))
    }, 16)
    return () => clearInterval(id)
  }, [])

  const cfg = getConfig(toast.type)

  const transform =
    phase === 'enter'
      ? 'translateX(calc(100% + 24px))'
      : phase === 'exit'
      ? 'translateX(calc(100% + 24px))'
      : 'translateX(0)'

  const opacity = phase === 'visible' ? 1 : 0

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: 'rgba(12, 12, 20, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${cfg.borderColor}`,
        borderLeft: `3px solid ${cfg.accentColor}`,
        borderRadius: '12px',
        padding: '14px 16px 10px',
        minWidth: '300px',
        maxWidth: '400px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
        transform,
        opacity,
        transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease',
      }}
    >
      {/* Ikon + besked + luk */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
        <div style={{ color: cfg.accentColor, flexShrink: 0, marginTop: '1px' }}>
          <Icon name={cfg.icon} size={18} />
        </div>
        <p
          style={{
            flex: 1,
            color: 'rgba(255,255,255,0.88)',
            fontSize: '13.5px',
            lineHeight: '1.45',
            margin: 0,
            fontWeight: 400,
          }}
        >
          {toast.message}
        </p>
        <button
          onClick={() => onRemove(toast.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          aria-label="Luk notifikation"
        >
          <Icon name="xmark" size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          marginTop: '10px',
          height: '2px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: cfg.accentColor,
            opacity: 0.7,
            width: `${progress}%`,
            transition: 'width 0.016s linear',
          }}
        />
      </div>
    </div>
  )
}

// ── Konfiguration per type ─────────────────────────────────────────────────────
function getConfig(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        icon: 'checkmark-circle' as const,
        accentColor: '#30D158',
        borderColor: 'rgba(48,209,88,0.25)',
      }
    case 'error':
      return {
        icon: 'exclamation-triangle' as const,
        accentColor: '#FF453A',
        borderColor: 'rgba(255,69,58,0.25)',
      }
    case 'warning':
      return {
        icon: 'exclamation-triangle' as const,
        accentColor: '#FFD60A',
        borderColor: 'rgba(255,214,10,0.25)',
      }
    case 'info':
      return {
        icon: 'info-circle' as const,
        accentColor: '#0A84FF',
        borderColor: 'rgba(10,132,255,0.25)',
      }
  }
}
