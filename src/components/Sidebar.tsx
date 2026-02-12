import { useState, useEffect } from 'react'

interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
}

const nav = [
  { id: 'dashboard', label: 'Oversigt', icon: '⬡' },
  { id: 'journal', label: 'Journal', icon: '◔' },
  { id: 'tasks', label: 'Opgaver', icon: '▦' },
  { id: 'documents', label: 'Dokumenter', icon: '◱' },
  { id: 'agents', label: 'Agenter', icon: '⬢' },
  { id: 'intelligence', label: 'Intelligens', icon: '◉' },
  { id: 'weekly', label: 'Ugerapport', icon: '◧' },
  { id: 'clients', label: 'Klienter', icon: '◎' },
  { id: 'cron', label: 'Planlagte Jobs', icon: '⟳' },
  { id: 'api', label: 'API Forbrug', icon: '◈' },
  { id: 'workshop', label: 'Værksted', icon: '⬡' },
  { id: 'index', label: 'Søgning', icon: '⊞' },
  { id: 'evals', label: 'Evalueringer', icon: '◑' },
  { id: 'settings', label: 'Indstillinger', icon: '⚙' },
]

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  const [pulse, setPulse] = useState(true)
  const [lastBeat, setLastBeat] = useState(new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }))

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setLastBeat(new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }))
    }, 3600000) // 1 hour
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="w-60 h-screen bg-[#1c1c1e] text-white/70 flex flex-col fixed left-0 top-0 z-40">
      <div className="px-5 py-6">
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span className="text-xl">🎛️</span> Mission Kontrol
        </h1>
        <p className="text-[11px] text-white/40 mt-1">OpenClaw Operationscenter</p>
      </div>

      {/* Heartbeat indicator */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
          <span className={`w-2.5 h-2.5 rounded-full bg-[#34C759] transition-opacity duration-700 ${pulse ? 'opacity-100' : 'opacity-30'}`} />
          <div className="flex-1">
            <p className="text-[11px] text-white/60 font-medium">Hjerterytme</p>
            <p className="text-[10px] text-white/30">Sidst: {lastBeat} · Interval: 1t · <span className="text-[#34C759]">aktiv</span></p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <div
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`sidebar-item ${active === item.id ? 'active' : ''}`}
          >
            <span className="text-base w-5 text-center opacity-60">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[11px] text-white/30">v2026.2.9 — Bygget med OpenClaw</p>
      </div>
    </aside>
  )
}
