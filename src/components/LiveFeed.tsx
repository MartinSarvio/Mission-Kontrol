import { useState, useEffect, useRef } from 'react'
import { useLiveData } from '../api/LiveDataContext'
import Icon from './Icon'

interface FeedEntry {
  id: string
  timestamp: Date
  agentName: string
  sessionKey: string
  action: 'message' | 'tool' | 'status'
  content: string
  status?: 'active' | 'idle' | 'completed'
}

function timeFormat(date: Date): string {
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getAgentIcon(kind: string): string {
  if (kind === 'main') return 'robot'
  if (kind === 'subagent') return 'person'
  return 'sparkle'
}

function getAgentName(session: any): string {
  if (session.kind === 'main') return 'Maison (Hoved)'
  return session.label || session.displayName || 'Sub-agent'
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'rgba(0,122,255,0.8)'
    case 'completed': return 'rgba(52,199,89,0.8)'
    case 'idle': return 'rgba(255,204,0,0.8)'
    default: return 'rgba(255,255,255,0.5)'
  }
}

export default function LiveFeed({ maxEntries = 100 }: { maxEntries?: number }) {
  const { sessions } = useLiveData()
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevSessionsRef = useRef<typeof sessions>([])

  // Generer feed entries baseret på session opdateringer
  useEffect(() => {
    const prev = prevSessionsRef.current as typeof sessions
    const newEntries: FeedEntry[] = []
    const now = new Date()

    for (const session of sessions) {
      const oldSession = prev.find(s => s.key === session.key)
      const agentName = getAgentName(session)
      
      // Ny session
      if (!oldSession) {
        newEntries.push({
          id: `${session.key}-new-${now.getTime()}`,
          timestamp: now,
          agentName,
          sessionKey: session.key,
          action: 'status',
          content: 'Session startet',
          status: 'active',
        })
      }
      // Session opdateret
      else if (session.updatedAt > oldSession.updatedAt) {
        const timeSinceUpdate = Date.now() - session.updatedAt
        const isActive = timeSinceUpdate < 5 * 60 * 1000 // 5 minutter
        const isRecent = timeSinceUpdate < 30 * 1000 // 30 sekunder
        
        if (isRecent) {
          // Forsøg at detektere typen af aktivitet
          let action: 'message' | 'tool' | 'status' = 'message'
          let content = 'Aktivitet registreret'
          
          // Hvis der er lastMessages, brug seneste besked
          if (session.lastMessages && session.lastMessages.length > 0) {
            const lastMsg = session.lastMessages[session.lastMessages.length - 1]
            const msgText = lastMsg.text || lastMsg.content || ''
            if (typeof msgText === 'string') {
              content = msgText.slice(0, 100)
              action = 'message'
            } else if (Array.isArray(msgText)) {
              const textBlock = (msgText as any[]).find((c: any) => c.type === 'text')
              if (textBlock?.text) {
                content = textBlock.text.slice(0, 100)
                action = 'message'
              }
            }
          }
          
          newEntries.push({
            id: `${session.key}-update-${session.updatedAt}`,
            timestamp: new Date(session.updatedAt),
            agentName,
            sessionKey: session.key,
            action,
            content,
            status: isActive ? 'active' : 'idle',
          })
        }
      }
    }

    if (newEntries.length > 0) {
      setEntries(prev => {
        const combined = [...prev, ...newEntries]
        // Fjern duplikater baseret på id
        const unique = combined.filter((entry, index, self) => 
          index === self.findIndex(e => e.id === entry.id)
        )
        // Sorter efter timestamp (nyeste først)
        unique.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        // Behold kun maxEntries
        return unique.slice(0, maxEntries)
      })
    }

    prevSessionsRef.current = sessions
  }, [sessions, maxEntries])

  // Auto-scroll til bunden når nye entries tilføjes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <Icon name="info-circle" size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">Ingen aktivitet endnu</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
      {entries.slice().reverse().map(entry => (
        <div
          key={entry.id}
          className="flex items-start gap-3 px-3 py-2 rounded-lg transition-all"
          style={{ 
            background: 'rgba(255,255,255,0.02)',
            borderLeft: `2px solid ${getStatusColor(entry.status || 'idle')}`,
          }}
        >
          {/* Timestamp */}
          <div className="text-[10px] font-mono pt-0.5" style={{ color: 'rgba(255,255,255,0.3)', minWidth: '60px' }}>
            {timeFormat(entry.timestamp)}
          </div>
          
          {/* Icon */}
          <div className="pt-0.5">
            <Icon 
              name={entry.action === 'tool' ? 'wrench' : entry.action === 'status' ? 'info-circle' : 'doc-text'} 
              size={14} 
              style={{ color: getStatusColor(entry.status || 'idle') }}
            />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-white truncate">{entry.agentName}</span>
              {entry.action === 'tool' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,149,0,0.1)', color: '#FF9500' }}>
                  Tool
                </span>
              )}
            </div>
            <p className="text-[11px] line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {entry.content}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
