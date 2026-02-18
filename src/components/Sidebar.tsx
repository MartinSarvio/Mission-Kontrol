import { useState, useEffect, useCallback, memo } from 'react'
import Icon from './Icon'
import { useLiveData } from '../api/LiveDataContext'
import ConnectionStatus from './ConnectionStatus'
import { useKeyboardShortcutsContext } from './KeyboardShortcuts'

interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
  isOpen: boolean
  onClose: () => void
  onMaisonClick: () => void
}

interface NavItem {
  id: string
  label: string
  icon: string
}

interface NavGroup {
  heading: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    heading: 'Overblik',
    items: [
      { id: 'dashboard', label: 'Oversigt', icon: 'grid' },
      { id: 'communication', label: 'Kommunikation', icon: 'chat-bubble' },
      { id: 'journal', label: 'Journal', icon: 'list' },
    ],
  },
  {
    heading: 'Arbejde',
    items: [
      { id: 'tasks', label: 'Opgaver', icon: 'checklist' },
      { id: 'documents', label: 'Dokumenter', icon: 'doc' },
      { id: 'agents', label: 'Agenter', icon: 'person-circle' },
      { id: 'skills', label: 'Færdigheder', icon: 'sparkle' },
    ],
  },
  {
    heading: 'Analyse',
    items: [
      { id: 'intelligence', label: 'Intelligens', icon: 'lightbulb' },
      { id: 'weekly', label: 'Ugerapport', icon: 'calendar-week' },
      { id: 'clients', label: 'Projekter', icon: 'folder' },
      { id: 'api', label: 'API Forbrug', icon: 'chart-bar' },
    ],
  },
  {
    heading: 'Drift',
    items: [
      { id: 'cron', label: 'Planlagte Jobs', icon: 'clock' },
      { id: 'upload', label: 'Fil Upload', icon: 'upload' },
      { id: 'workshop', label: 'Værksted', icon: 'wrench' },
      { id: 'index', label: 'Søgning', icon: 'magnifying-glass' },
      { id: 'evals', label: 'Evalueringer', icon: 'gauge' },
    ],
  },
  {
    heading: 'System',
    items: [
      { id: 'notifications', label: 'Notifikationer', icon: 'bell' },
      { id: 'settings', label: 'Indstillinger', icon: 'gear' },
    ],
  },
]

// Extract Badge outside Sidebar to avoid re-creation on every render
const Badge = memo(function Badge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 6px',
        borderRadius: 9,
        background: '#007AFF',
        color: 'white',
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1,
        animation: 'badgeFadeIn 200ms ease-out',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
})

const Sidebar = memo(function Sidebar({ active, onNavigate, isOpen, onClose, onMaisonClick }: SidebarProps) {
  const { isConnected, lastUpdated, isRefreshing, sessions, cronJobs } = useLiveData()
  const { openCmd } = useKeyboardShortcutsContext()
  const [pulse, setPulse] = useState(true)

  // Calculate badge counts
  const agentCount = sessions.filter(s => s.kind !== 'main').length
  const cronCount = cronJobs.filter(c => c.enabled).length
  const notificationCount = 0 // Placeholder - no notification data yet

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1500)
    return () => clearInterval(interval)
  }, [])

  const now = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })

  // Badge counts per nav item — memoized to avoid creating new functions per render
  const getBadgeCount = useCallback((id: string): number => {
    switch (id) {
      case 'agents': return agentCount
      case 'cron': return cronCount
      case 'notifications': return notificationCount
      default: return 0
    }
  }, [agentCount, cronCount, notificationCount])

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
            role="button"
            aria-label="Åbn Maison kontrolpanel"
            tabIndex={0}
            className="flex items-center gap-3 flex-1 cursor-pointer rounded-xl px-3 py-3 transition-all duration-200 hover:bg-white/[0.04]"
            style={{ background: 'rgba(255,255,255,0.02)' }}
            onClick={onMaisonClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onMaisonClick()
              }
            }}
          >
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ 
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
              </svg>
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
            aria-label="Luk menu"
            className="lg:hidden ml-2"
            style={{ padding: 8 }}
          >
            <Icon name="xmark" size={18} className="text-white/50" />
          </button>
        </div>
      </div>

      <nav role="navigation" aria-label="Hovednavigation" className="flex-1 px-2 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.heading}>
            <p className="text-[10px] uppercase tracking-wider text-white/25 px-3 pt-4 pb-1" aria-hidden="true">
              {group.heading}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const badgeCount = getBadgeCount(item.id)
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      onNavigate(item.id)
                    }}
                    aria-current={active === item.id ? 'page' : undefined}
                    className={`sidebar-item ${active === item.id ? 'active' : ''}`}
                    style={{ position: 'relative', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                  >
                    {active === item.id && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '20%',
                          bottom: '20%',
                          width: 3,
                          borderRadius: 2,
                          background: '#007AFF',
                          boxShadow: '0 0 8px rgba(0,122,255,0.6)',
                          animation: 'slideIn 200ms ease-out',
                        }}
                      />
                    )}
                    <Icon name={item.icon} size={20} className={active === item.id ? 'text-blue-400' : 'text-white/50'} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <Badge count={badgeCount} />
                  </a>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        {/* ⌘K kommandopalet-genvej */}
        <button
          onClick={openCmd}
          aria-label="Åbn kommandopalet (⌘K)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '7px 8px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        >
          <Icon name="command" size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'left' }}>
            Kommandopalet
          </span>
          <kbd style={{
            padding: '1px 5px',
            borderRadius: 5,
            fontSize: 10,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            letterSpacing: '-0.02em',
          }}>⌘K</kbd>
        </button>

        <div className="flex items-center gap-2">
          <ConnectionStatus />
          <span className="text-[11px] text-white/50">
            {isRefreshing ? (
              <span style={{ color: 'rgba(0,122,255,0.7)' }}>Opdaterer...</span>
            ) : isConnected ? 'Live' : 'Offline'}
            {lastUpdated && isConnected && !isRefreshing && (
              <span className="text-white/30"> · {lastUpdated.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            )}
          </span>
        </div>
        <p className="text-[10px] text-white/25">Mission Kontrol v2026.2.9</p>
      </div>
    </aside>
  )
})

export default Sidebar
