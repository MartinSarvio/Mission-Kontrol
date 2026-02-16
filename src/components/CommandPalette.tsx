import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from './Icon'
import { useToast } from './Toast'
import { NUMBER_SHORTCUTS } from '../hooks/useKeyboardShortcuts'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (page: string) => void
}

const items = [
  { id: 'dashboard', label: 'Oversigt', icon: 'grid' },
  { id: 'communication', label: 'Kommunikation', icon: 'chat' },
  { id: 'journal', label: 'Journal', icon: 'list' },
  { id: 'tasks', label: 'Opgaver', icon: 'checklist' },
  { id: 'documents', label: 'Dokumenter', icon: 'doc' },
  { id: 'agents', label: 'Agenter', icon: 'person' },
  { id: 'skills', label: 'Færdigheder', icon: 'sparkle' },
  { id: 'intelligence', label: 'Intelligens', icon: 'lightbulb' },
  { id: 'weekly', label: 'Ugerapport', icon: 'clock' },
  { id: 'clients', label: 'Projekter', icon: 'folder' },
  { id: 'cron', label: 'Planlagte Jobs', icon: 'clock' },
  { id: 'api', label: 'API Forbrug', icon: 'gauge' },
  { id: 'workshop', label: 'Værksted', icon: 'wrench' },
  { id: 'index', label: 'Søgning', icon: 'globe' },
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

export default function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const filtered = query
    ? items.filter(i => fuzzyMatch(query, i.label) || fuzzyMatch(query, i.id))
    : items

  const go = useCallback((id: string) => {
    const item = items.find(i => i.id === id)
    onNavigate(id)
    onClose()
    setQuery('')
    
    // Show info toast with navigation confirmation
    if (item) {
      showToast('info', `Navigeret til ${item.label}`)
    }
  }, [onNavigate, onClose, showToast])

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
      setSelected(s => Math.min(s + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && filtered[selected]) {
      e.preventDefault()
      go(filtered[selected].id)
    }
  }, [filtered, selected, go])

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
            placeholder="Søg efter side..."
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
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px 18px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
              Ingen resultater
            </div>
          )}
          {filtered.map((item, i) => {
            const shortcut = PAGE_TO_SHORTCUT[item.id]
            return (
              <div
                key={item.id}
                onClick={() => go(item.id)}
                onMouseEnter={() => setSelected(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 18px', cursor: 'pointer',
                  background: i === selected ? 'rgba(59,130,246,0.15)' : 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                <Icon name={item.icon} size={18} style={{ color: i === selected ? '#60a5fa' : 'rgba(255,255,255,0.4)' }} />
                <span style={{ flex: 1, color: i === selected ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 14 }}>
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
        </div>
      </div>
    </div>
  )
}
