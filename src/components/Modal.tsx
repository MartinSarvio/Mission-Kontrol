import { ReactNode } from 'react'
import Icon from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', background: 'rgba(0,0,0,0.85)' }} />
      <div className="relative max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto rounded-xl" style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', background: 'rgba(10,10,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full transition-colors" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Icon name="xmark" size={14} className="text-white/50" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
