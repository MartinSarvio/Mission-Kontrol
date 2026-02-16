import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import Icon from './Icon'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  createdAt: number
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

const MAX_TOASTS = 3
const TOAST_DURATION = 4000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`
    const newToast: Toast = { id, type, message, createdAt: Date.now() }
    
    setToasts(prev => {
      const updated = [...prev, newToast]
      // Keep only last MAX_TOASTS
      return updated.slice(-MAX_TOASTS)
    })

    // Auto-dismiss after TOAST_DURATION
    setTimeout(() => removeToast(id), TOAST_DURATION)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [progress, setProgress] = useState(100)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-in animation
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  useEffect(() => {
    // Progress bar animation
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100)
      setProgress(remaining)
    }, 16)

    return () => clearInterval(interval)
  }, [])

  const config = getToastConfig(toast.type)

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: '#0a0a0f',
        border: `1px solid ${config.borderColor}`,
        borderRadius: '12px',
        padding: '16px',
        minWidth: '300px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)',
        transform: isVisible ? 'translateX(0)' : 'translateX(120%)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ color: config.iconColor, flexShrink: 0, marginTop: '2px' }}>
          <Icon name={config.icon} size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', lineHeight: '1.4', margin: 0 }}>
            {toast.message}
          </p>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        >
          <Icon name="xmark" size={16} />
        </button>
      </div>
      
      {/* Progress bar */}
      <div
        style={{
          marginTop: '12px',
          height: '2px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: config.progressColor,
            width: `${progress}%`,
            transition: 'width 0.016s linear',
          }}
        />
      </div>
    </div>
  )
}

function getToastConfig(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        icon: 'checkmark-circle' as const,
        iconColor: '#34C759',
        borderColor: 'rgba(52,199,89,0.3)',
        progressColor: '#34C759',
      }
    case 'error':
      return {
        icon: 'exclamation-triangle' as const,
        iconColor: '#FF453A',
        borderColor: 'rgba(255,69,58,0.3)',
        progressColor: '#FF453A',
      }
    case 'warning':
      return {
        icon: 'exclamation-triangle' as const,
        iconColor: '#FF9F0A',
        borderColor: 'rgba(255,159,10,0.3)',
        progressColor: '#FF9F0A',
      }
    case 'info':
      return {
        icon: 'info-circle' as const,
        iconColor: '#007AFF',
        borderColor: 'rgba(0,122,255,0.3)',
        progressColor: '#007AFF',
      }
  }
}
