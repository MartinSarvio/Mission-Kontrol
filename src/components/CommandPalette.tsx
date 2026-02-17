import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from './Icon'
import { useToast } from './Toast'
import { useLiveData } from '../api/LiveDataContext'
import { NUMBER_SHORTCUTS } from '../hooks/useKeyboardShortcuts'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (page: string) => void
}

const navItems = [
  { id: 'dashboard', label: 'Oversigt', icon: 'grid' },
  { id: 'communication', label: 'Kommunikation', icon: 'chat-bubble' },
  { id: 'journal', label: 'Journal', icon: 'list' },
  { id: 'tasks', label: 'Opgaver', icon: 'checklist' },
  { id: 'documents', label: 'Dokumenter', icon: 'doc' },
  { id: 'agents', label: 'Agenter', icon: 'person-circle' },
  { id: 'skills', label: 'Færdigheder', icon: 'sparkle' },
  { id: 'intelligence', label: 'Intelligens', icon: 'lightbulb' },
  { id: 'weekly', label: 'Ugerapport', icon: 'calendar-week' },
  { id: 'clients', label: 'Projekter', icon: 'folder' },
  { id: 'cron', label: 'Planlagte Jobs', icon: 'clock' },
  { id: 'api', label: 'API Forbrug', icon: 'chart-bar' },
  { id: 'workshop', label: 'Værksted', icon: 'wrench' },
  { id: 'index', label: 'Søgning', icon: 'magnifying-glass' },
  { id: 'evals', label: 'Evalueringer', icon: 'gauge' },
  { id: 'notifications', label: 'Notifikationer', icon: 'bell' },
  { id: 'settings', label: 'Indstillinger', icon: 'gear' },
]

// Reverse lookup: page id → shortcut number
const PAGE_TO_SHORTCUT = Object.entries(NUMBER_SHORTCUTS).reduce((acc, [key, pageId]) => {
  acc[pageId] = key
  return acc
}, {} as Record<string, string>)

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

type ActionItem = {
  id: string
  label: string
  icon: string
  execute: (ctx: ActionContext) => void | Promise<void>
}

type ActionContext = {
  showToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void
  refresh: () => Promise<void>
  onClose: () => void
}

const actions: ActionItem[] = [
  {
    id: 'copy-gateway-url',
    label: 'Kopier Gateway URL',
    icon: 'clipboard',
    execute: async ({ showToast, onClose }) => {
      await navigator.clipboard.writeText('srv1356942.tail9aaaf1.ts.net')
      showToast('success', 'Kopieret!')
      onClose()
    },
  },
  {
    id: 'open-github',
    label: 'Åbn GitHub',
    icon: 'code',
    execute: ({ onClose }) => {
      window.open('https://github.com/MartinSarvio/Mission-Kontrol', '_blank', 'noopener,noreferrer')
      onClose()
    },
  },
  {
    id: 'open-vercel',
    label: 'Åbn Vercel',
    icon: 'rocket',
    execute: ({ onClose }) => {
      window.open('https://mission-kontrol.vercel.app', '_blank', 'noopener,noreferrer')
      onClose()
    },
  },
  {
    id: 'refresh-data',
    label: 'Genindlæs data',
    icon: 'arrow-path',
    execute: async ({ refresh, showToast, onClose }) => {
      onClose()
      await refresh()
      showToast('success', 'Data genindlæst')
    },
  },
  {
    id: 'toggle-theme',
    label: 'Skift tema',
    icon: 'moon',
    execute: ({ showToast, onClose }) => {
      showToast('info', 'Tema skiftet')
      onClose()
    },
  },
]

export default function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()
  const { refresh } = useLiveData()

  const filteredNav = query
    ? navItems.filter(i => fuzzyMatch(query, i.label) || fuzzyMatch(query, i.id))
    : navItems

  const filteredActions = query
    ? actions.filter(a => fuzzyMatch(query, a.label) || fuzzyMatch(query, a.id))
    : actions

  // Flat list for keyboard navigation: nav items first, then actions
  const totalCount = filteredNav.length + filteredActions.length

  const goNav = useCallback((id: string) => {
    const item = navItems.find(i => i.id === id)
    onNavigate(id)
    onClose()
    setQuery('')
    if (item) {
      showToast('info', `Navigeret til ${item.label}`)
    }
  }, [onNavigate, onClose, showToast])

  const runAction = useCallback((action: ActionItem) => {
    setQuery('')
    action.execute({ showToast, refresh, onClose })
  }, [showToast, refresh, onClose])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  useEffect(() => {
    setSelected(0)
  }, [query])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, totalCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selected < filteredNav.length) {
        const item = filteredNav[selected]
        if (item) goNav(item.id)
      } else {
        const action = filteredActions[selected - filteredNav.length]
        if (action) runAction(action)
      }
    }
  }, [filteredNav, filteredActions, selected, totalCount, goNav, runAction])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kommandopalet"
        style={{
          width: '100%', maxWidth: 520,
          background: 'rgba(20,20,30,0.85)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Icon name="command" size={18} style={{ color: 'rgba(255,255,255,0.35)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Søg efter side eller handling..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: 16, fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            padding: '2px 8px', borderRadius: 6, fontSize: 11,
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div role="listbox" style={{ maxHeight: 420, overflowY: 'auto', padding: '6px 0' }}>
          {totalCount === 0 && (
            <div style={{ padding: '24px 18px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
              Ingen resultater
            </div>
          )}

          {/* Navigation section */}
          {filteredNav.length > 0 && (
            <>
              <div style={{
                padding: '4px 18px 2px',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
              }}>
                Sider
              </div>
              {filteredNav.map((item, i) => {
                const globalIndex = i
                const isSelected = globalIndex === selected
                const shortcut = PAGE_TO_SHORTCUT[item.id]
                return (
                  <div
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => goNav(item.id)}
                    onMouseEnter={() => setSelected(globalIndex)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 18px', cursor: 'pointer',
                      background: isSelected ? 'rgba(59,130,246,0.15)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <Icon name={item.icon} size={18} style={{ color: isSelected ? '#60a5fa' : 'rgba(255,255,255,0.4)' }} />
                    <span style={{ flex: 1, color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                      {item.label}
                    </span>
                    {shortcut && (
                      <kbd style={{
                        padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                        {shortcut}
                      </kbd>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Actions section */}
          {filteredActions.length > 0 && (
            <>
              <div style={{
                padding: filteredNav.length > 0 ? '8px 18px 2px' : '4px 18px 2px',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                borderTop: filteredNav.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                marginTop: filteredNav.length > 0 ? 4 : 0,
              }}>
                Handlinger
              </div>
              {filteredActions.map((action, i) => {
                const globalIndex = filteredNav.length + i
                const isSelected = globalIndex === selected
                return (
                  <div
                    key={action.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => runAction(action)}
                    onMouseEnter={() => setSelected(globalIndex)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 18px', cursor: 'pointer',
                      background: isSelected ? 'rgba(139,92,246,0.15)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <Icon
                      name={action.icon}
                      size={18}
                      style={{ color: isSelected ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}
                    />
                    <span style={{ flex: 1, color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                      {action.label}
                    </span>
                    <Icon
                      name="zap"
                      size={13}
                      style={{ color: isSelected ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.15)' }}
                    />
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
