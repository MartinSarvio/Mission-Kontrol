import { useState, useEffect } from 'react'
import Icon from './Icon'
import { useLiveData } from '../api/LiveDataContext'

interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
  isOpen: boolean
  onClose: () => void
}

const nav = [
  { id: 'dashboard', label: 'Oversigt', icon: 'grid' },
  { id: 'journal', label: 'Journal', icon: 'list' },
  { id: 'tasks', label: 'Opgaver', icon: 'checklist' },
  { id: 'documents', label: 'Dokumenter', icon: 'doc' },
  { id: 'agents', label: 'Agenter', icon: 'person-circle' },
  { id: 'skills', label: 'Færdigheder', icon: 'sparkle' },
  { id: 'intelligence', label: 'Intelligens', icon: 'lightbulb' },
  { id: 'weekly', label: 'Ugerapport', icon: 'calendar-week' },
  { id: 'clients', label: 'Klienter', icon: 'people' },
  { id: 'cron', label: 'Planlagte Jobs', icon: 'clock' },
  { id: 'api', label: 'API Forbrug', icon: 'chart-bar' },
  { id: 'workshop', label: 'Værksted', icon: 'wrench' },
  { id: 'index', label: 'Søgning', icon: 'magnifying-glass' },
  { id: 'evals', label: 'Evalueringer', icon: 'gauge' },
  { id: 'settings', label: 'Indstillinger', icon: 'gear' },
]

export default function Sidebar({ active, onNavigate, isOpen, onClose }: SidebarProps) {
  const { isConnected, lastUpdated, isLoading } = useLiveData()
  const [pulse, setPulse] = useState(true)
  const [lastBeat, setLastBeat] = useState(new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }))

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setLastBeat(new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }))
    }, 3600000)
    return () => clearInterval(interval)
  }, [])

  // On desktop (lg+), sidebar is always visible. On mobile, controlled by isOpen.
  // We use fixed positioning on all screens, with transform to slide on mobile.
  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: 240,
        zIndex: 50,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 200ms ease-in-out',
      }}
      className="glass-sidebar text-white/70 flex flex-col lg:!transform-none"
    >
      <div className="px-5 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2.5">
            <Icon name="control-panel" size={20} className="text-white/80" /> Mission Kontrol
          </h1>
          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden"
            style={{ padding: 8 }}
          >
            <Icon name="xmark" size={18} className="text-white/50" />
          </button>
        </div>
        <p className="text-[11px] text-white/40 mt-1">OpenClaw Operationscenter</p>
      </div>

      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 px-3 py-2 glass-heartbeat">
          <span className={`w-2.5 h-2.5 rounded-full bg-[#34C759] transition-opacity duration-700 ${pulse ? 'opacity-100' : 'opacity-30'}`} />
          <div className="flex-1">
            <p className="text-[11px] text-white/60 font-medium">Hjerterytme</p>
            <p className="text-[10px] text-white/30">Sidst: {lastBeat} · Interval: 1t · <span className="text-[#34C759]">aktiv</span></p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <div
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`sidebar-item ${active === item.id ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={20} className={active === item.id ? 'text-white' : 'text-white/50'} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#34C759]' : 'bg-[#FF3B30]'} ${isLoading ? 'animate-pulse' : ''}`} />
          <span className="text-[11px] text-white/50">
            {isConnected ? 'Live' : 'Offline'}
            {lastUpdated && isConnected && (
              <span className="text-white/30"> · {lastUpdated.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            )}
          </span>
        </div>
        <p className="text-[11px] text-white/30">v2026.2.9 — Bygget med OpenClaw</p>
      </div>
    </aside>
  )
}
