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
  const { isConnected, lastUpdated, isLoading, sessions } = useLiveData()
  const [pulse, setPulse] = useState(true)
  const [lastBeat, setLastBeat] = useState(new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }))
  const [showHeartbeat, setShowHeartbeat] = useState(false)

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
        transition: 'transform 200ms ease-in-out',
      }}
      className={`glass-sidebar text-white/70 flex flex-col lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="px-5 py-6">
        <div 
          className="flex items-center justify-between p-3 -mx-2 mb-2 rounded-2xl"
          style={{ 
            background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.05) 0%, rgba(175, 82, 222, 0.05) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
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
        <p className="text-[11px] text-white/40 mt-1 px-1">OpenClaw Operationscenter</p>
      </div>

      <div className="px-5 pb-4">
        <div 
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/[0.04]"
          style={{ background: 'rgba(255,255,255,0.02)' }}
          onClick={() => setShowHeartbeat(!showHeartbeat)}
        >
          <span className={`w-2 h-2 rounded-full transition-opacity duration-700 ${pulse ? 'opacity-100' : 'opacity-40'}`} 
                style={{ background: '#30D158' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white/70 font-medium tracking-wide">Maison</p>
            <p className="text-[10px] text-white/30">{lastBeat} · aktiv</p>
          </div>
          <Icon name="chevron-down" size={10} className="text-white/15" />
        </div>
        
        {showHeartbeat && (
          <div className="mt-2 glass-heartbeat p-3 space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center" 
                style={{ 
                  background: 'linear-gradient(135deg, #007AFF, #AF52DE)',
                  boxShadow: '0 4px 16px rgba(0, 122, 255, 0.3)'
                }}
              >
                <Icon name="brain" size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Maison</p>
                <p className="text-[10px] text-white/40">System Orkestrering</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-white/40">Model</span>
                <span className="font-mono text-white/70">Claude Opus 4.6</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-white/40">Status</span>
                <span className="text-[#30D158] font-semibold">Online</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-white/40">Sessions</span>
                <span className="font-mono text-white/70">{sessions.length}</span>
              </div>
              {sessions[0]?.contextTokens && (
                <>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40">Context</span>
                    <span className="font-mono text-white/70">{Math.round(sessions[0].contextTokens / 1000)}K / 200K</span>
                  </div>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ 
                      width: `${Math.min(100, Math.round((sessions[0].contextTokens / 200000) * 100))}%`,
                      background: sessions[0].contextTokens > 160000 ? '#FF453A' : sessions[0].contextTokens > 100000 ? '#FF9F0A' : '#30D158',
                      boxShadow: `0 0 8px ${sessions[0].contextTokens > 160000 ? 'rgba(255, 69, 58, 0.5)' : sessions[0].contextTokens > 100000 ? 'rgba(255, 159, 10, 0.5)' : 'rgba(48, 209, 88, 0.5)'}`
                    }} />
                  </div>
                </>
              )}
              <div className="flex justify-between text-[10px]">
                <span className="text-white/40">Kanal</span>
                <span className="font-mono text-white/70">Telegram</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-white/40">Hjerterytme</span>
                <span className="font-mono text-white/70">Hvert 60 min</span>
              </div>
            </div>
          </div>
        )}
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
        <p className="text-[11px] text-white/30">v2026.2.9 — Bygget med OpenClaw</p>
      </div>
    </aside>
  )
}
