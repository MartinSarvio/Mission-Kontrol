import { useState, useEffect } from 'react'
import Icon from './Icon'
import { useLiveData } from '../api/LiveDataContext'

interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
  isOpen: boolean
  onClose: () => void
  onMaisonClick: () => void
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

export default function Sidebar({ active, onNavigate, isOpen, onClose, onMaisonClick }: SidebarProps) {
  const { isConnected, lastUpdated, isLoading, sessions } = useLiveData()
  const [pulse, setPulse] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1500)
    return () => clearInterval(interval)
  }, [])

  const now = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: 240,
        zIndex: 50,
        transition: 'transform 200ms ease-in-out',
      }}
      className={`glass-sidebar text-white/70 flex flex-col lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Maison — top of sidebar */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer rounded-xl px-3 py-3 transition-all duration-200 hover:bg-white/[0.04]"
            style={{ background: 'rgba(255,255,255,0.02)' }}
            onClick={onMaisonClick}
          >
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, #007AFF, #AF52DE)',
                boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)'
              }}
            >
              <Icon name="brain" size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">Maison</p>
                <span className={`w-2 h-2 rounded-full transition-opacity duration-700 ${pulse ? 'opacity-100' : 'opacity-40'}`} 
                      style={{ background: '#30D158' }} />
              </div>
              <p className="text-[10px] text-white/30">{now} · aktiv</p>
            </div>
            <Icon name="chevron-right" size={10} className="text-white/15" />
          </div>

          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden ml-2"
            style={{ padding: 8 }}
          >
            <Icon name="xmark" size={18} className="text-white/50" />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <div
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`sidebar-item ${active === item.id ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={20} className={active === item.id ? 'text-blue-400' : 'text-white/50'} />
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
        <p className="text-[10px] text-white/25">Mission Kontrol v2026.2.9</p>
      </div>
    </aside>
  )
}
