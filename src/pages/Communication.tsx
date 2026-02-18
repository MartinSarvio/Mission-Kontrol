import { useState, useEffect, useRef, useCallback } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import { invokeToolRaw, ApiSession } from '../api/openclaw'
import { CommunicationSkeleton } from '../components/SkeletonLoader'
import DataFreshness from '../components/DataFreshness'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  sessionKey: string
  hasToolCalls?: boolean
  toolCalls?: string[]
}

type FilterType = 'alle' | 'aktive' | 'sub-agenter'

const ACTIVE_THRESHOLD_MS = 60 * 60 * 1000 // 1 time
const POLL_INTERVAL_MS = 3000              // Auto-refresh beskeder hvert 3s

export default function Communication() {
  usePageTitle('Kommunikation')

  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [allExpanded, setAllExpanded] = useState(false)
  const [filter, setFilter] = useState<FilterType>('alle')
  const [unreadSessions, setUnreadSessions] = useState<Set<string>>(new Set())

  // Ref til "sidst set" tidspunkt pr. session
  const lastSeenRef = useRef<Record<string, number>>({})
  // Ref til seneste kendte besked-tidspunkt pr. session (til unread-detektion)
  const latestMsgTimestampRef = useRef<Record<string, number>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedSessionRef = useRef<string | null>(null)
  const sendingRef = useRef(false)

  // Hold refs synkrone med state
  useEffect(() => { selectedSessionRef.current = selectedSession }, [selectedSession])
  useEffect(() => { sendingRef.current = sending }, [sending])

  // Scroll ned når beskeder ændres
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // --- Hent sessioner hvert 5s (og brug lastMessages til unread-detektion) ---
  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [])

  // --- Auto-refresh beskeder hvert 3s for valgte session ---
  useEffect(() => {
    if (!selectedSession) return
    const interval = setInterval(() => {
      // Spring over hvis vi sender en besked
      if (sendingRef.current) return
      fetchMessages(selectedSession, /* silent */ true)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [selectedSession])

  // Hent beskeder første gang session vælges
  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession)
      // Marker som "set" nu
      markAsSeen(selectedSession)
    }
  }, [selectedSession])

  // --- Filtrer sessions ---
  const filteredSessions = sessions.filter(s => {
    if (filter === 'aktive') return Date.now() - s.updatedAt < ACTIVE_THRESHOLD_MS
    if (filter === 'sub-agenter') return s.kind !== 'main'
    return true
  })

  function markAsSeen(sessionKey: string) {
    lastSeenRef.current[sessionKey] = Date.now()
    setUnreadSessions(prev => {
      if (!prev.has(sessionKey)) return prev
      const next = new Set(prev)
      next.delete(sessionKey)
      return next
    })
  }

  function handleSelectSession(sessionKey: string) {
    setSelectedSession(sessionKey)
    markAsSeen(sessionKey)
    setMessages([])
  }

  async function fetchSessions() {
    try {
      const data = await invokeToolRaw('sessions_list', { messageLimit: 10 }) as any
      const text = data.result?.content?.[0]?.text
      if (text) {
        const parsed = JSON.parse(text)
        const incoming: ApiSession[] = parsed.sessions || []
        setSessions(incoming)

        // Auto-vælg første session
        if (!selectedSessionRef.current && incoming.length > 0) {
          setSelectedSession(incoming[0].key)
          markAsSeen(incoming[0].key)
        }

        // Opdater unread-indikatorer baseret på lastMessages
        incoming.forEach(session => {
          const lastMsgs = session.lastMessages
          if (!lastMsgs || lastMsgs.length === 0) return
          // Seneste besked-timestamp
          const latestTs = lastMsgs.reduce((max: number, m: any) => {
            const ts = m.timestamp || 0
            return ts > max ? ts : max
          }, 0)
          if (latestTs === 0) return

          const prevLatest = latestMsgTimestampRef.current[session.key] || 0
          latestMsgTimestampRef.current[session.key] = Math.max(prevLatest, latestTs)

          // Ny besked siden sidst set? Og ikke den valgte session?
          const lastSeen = lastSeenRef.current[session.key] || 0
          if (latestTs > lastSeen && session.key !== selectedSessionRef.current) {
            setUnreadSessions(prev => {
              if (prev.has(session.key)) return prev
              const next = new Set(prev)
              next.add(session.key)
              return next
            })
          }
        })
      }
      setLoading(false)
    } catch (error) {
      console.error('Fejl ved hentning af sessioner:', error)
      setLoading(false)
    }
  }

  const fetchMessages = useCallback(async (sessionKey: string, silent = false) => {
    try {
      const data = await invokeToolRaw('sessions_history', { sessionKey, limit: 50 }) as any
      const text = data.result?.content?.[0]?.text
      if (text) {
        const parsed = JSON.parse(text)
        const msgs = parsed.messages || []

        const parsedMsgs = msgs.map((m: any) => {
          let content = ''
          const toolCalls: string[] = []

          if (typeof m.content === 'string') {
            content = m.content
          } else if (Array.isArray(m.content)) {
            const textParts: string[] = []
            for (const block of m.content) {
              if (block.type === 'text' && block.text) {
                textParts.push(block.text)
              } else if (block.type === 'tool_use' || block.type === 'toolCall') {
                const name = block.name || block.toolName || 'tool'
                const argsPreview = block.input || block.args
                const argStr = argsPreview
                  ? JSON.stringify(argsPreview).slice(0, 60)
                  : '...'
                toolCalls.push(`${name}(${argStr})`)
              }
              // Spring 'thinking'-blokke over
            }
            content = textParts.join('\n')
          } else {
            content = m.text || ''
          }

          if (toolCalls.length > 0) {
            const toolLine = toolCalls.map((t: string) => `[${t}]`).join(' ')
            content = content ? `${content}\n${toolLine}` : toolLine
          }

          return {
            role: m.role as Message['role'],
            content,
            timestamp: m.timestamp || Date.now(),
            sessionKey,
            hasToolCalls: toolCalls.length > 0,
            toolCalls,
          }
        }).filter((m: any) => {
          if (!m.content || !m.content.trim()) return false
          const t = m.content.trim()
          if (t === 'NO_REPLY' || t === 'HEARTBEAT_OK') return false
          return true
        })

        // Kun opdater state hvis det er den stadig valgte session
        if (sessionKey === selectedSessionRef.current) {
          setMessages(parsedMsgs)
        }

        // Opdater sidst-set ved auto-refresh (session er aktiv og set)
        if (silent && sessionKey === selectedSessionRef.current) {
          lastSeenRef.current[sessionKey] = Date.now()
        }
      }
    } catch (error) {
      if (!silent) console.error('Fejl ved hentning af beskeder:', error)
    }
  }, [])

  async function sendMessage() {
    if (!messageInput.trim() || !selectedSession) return

    setSending(true)
    try {
      await invokeToolRaw('sessions_send', {
        sessionKey: selectedSession,
        message: messageInput,
      })
      setMessageInput('')
      setTimeout(() => fetchMessages(selectedSession), 1000)
    } catch (error) {
      console.error('Fejl ved afsendelse:', error)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <CommunicationSkeleton />
  }

  const selectedSessionData = sessions.find(s => s.key === selectedSession)

  // Filterknapstyle helper
  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(0,122,255,0.18)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? 'rgba(0,122,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
    color: active ? '#5AC8FA' : 'rgba(255,255,255,0.55)',
    padding: '5px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Kommunikation</h1>
        <DataFreshness />
        <button
          onClick={() => setAllExpanded(!allExpanded)}
          style={{
            background: allExpanded ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${allExpanded ? 'rgba(0,122,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
            backdropFilter: 'blur(20px)',
            color: allExpanded ? '#5AC8FA' : 'rgba(255,255,255,0.7)',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Icon name={allExpanded ? 'chevron-down' : 'chevron-right'} size={14} />
          {allExpanded ? 'Fold sammen' : 'Udvid alle'}
        </button>
      </div>
      <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Live beskeder fra Telegram og andre kanaler
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-240px)]">
        {/* Sessions sidebar */}
        <Card className="lg:col-span-1 overflow-y-auto flex flex-col gap-0">
          {/* Filter-bar */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <Icon name="filter" size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '0.03em' }}>
                FILTER
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button style={filterBtnStyle(filter === 'alle')} onClick={() => setFilter('alle')}>
                Alle
              </button>
              <button style={filterBtnStyle(filter === 'aktive')} onClick={() => setFilter('aktive')}>
                Aktive
              </button>
              <button style={filterBtnStyle(filter === 'sub-agenter')} onClick={() => setFilter('sub-agenter')}>
                Sub-agenter
              </button>
            </div>
            <div style={{
              marginTop: '8px',
              height: '1px',
              background: 'rgba(255,255,255,0.06)',
            }} />
          </div>

          <h3 className="text-sm font-semibold text-white mb-3">
            Sessioner
            {filteredSessions.length !== sessions.length && (
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: '6px' }}>
                ({filteredSessions.length}/{sessions.length})
              </span>
            )}
          </h3>

          {filteredSessions.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-8">Ingen sessioner</p>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map(session => {
                const isActive = Date.now() - session.updatedAt < 120000
                const isSelected = session.key === selectedSession
                const hasUnread = unreadSessions.has(session.key)
                return (
                  <button
                    key={session.key}
                    onClick={() => handleSelectSession(session.key)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all"
                    style={{
                      background: isSelected ? 'rgba(0, 122, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelected ? 'rgba(0, 122, 255, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {/* Status-prik (online/offline) */}
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: isActive ? '#34C759' : '#8E8E93' }}
                      />
                      <span className="text-sm font-medium text-white truncate flex-1">
                        {session.displayName || session.label || session.key}
                      </span>
                      {/* Unread indikator */}
                      {hasUnread && !isSelected && (
                        <span
                          title="Nye beskeder"
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#007AFF',
                            flexShrink: 0,
                            boxShadow: '0 0 6px rgba(0,122,255,0.6)',
                          }}
                        />
                      )}
                    </div>
                    <p className="caption text-xs truncate">{session.channel || 'ingen kanal'}</p>
                    {allExpanded && (
                      <div style={{ marginTop: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                        <p>Model: {session.model || 'ukendt'}</p>
                        <p>Opdateret: {new Date(session.updatedAt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* Besked-område */}
        <Card className="lg:col-span-3 flex flex-col">
          {!selectedSession ? (
            <div className="flex-1 flex items-center justify-center text-white/50">
              Vælg en session for at se beskeder
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {selectedSessionData?.displayName || selectedSessionData?.label || selectedSession}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <p className="caption text-xs">
                      {selectedSessionData?.channel} · {selectedSessionData?.model}
                    </p>
                    {/* Auto-refresh indikator */}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'rgba(52,199,89,0.7)',
                    }}>
                      <span style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: '#34C759',
                        display: 'inline-block',
                        animation: 'pulse 2s infinite',
                      }} />
                      Live
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => fetchMessages(selectedSession)}
                  className="p-2 rounded-lg transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                  title="Genindlæs beskeder"
                >
                  <Icon name="arrow-path" size={16} className="text-white/70" />
                </button>
              </div>

              {/* Beskeder */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-white/50 text-center py-8">Ingen beskeder</p>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className="max-w-[80%] px-4 py-2 rounded-lg"
                        style={{
                          background:
                            msg.role === 'user'
                              ? 'rgba(0, 122, 255, 0.2)'
                              : msg.role === 'assistant'
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(255, 159, 10, 0.15)',
                          border: `1px solid ${
                            msg.role === 'user'
                              ? 'rgba(0, 122, 255, 0.3)'
                              : msg.role === 'assistant'
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(255, 159, 10, 0.3)'
                          }`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-white/70">
                            {msg.role === 'user' ? 'Bruger' : msg.role === 'assistant' ? 'AI' : 'System'}
                          </span>
                          <span className="caption text-xs">
                            {new Date(msg.timestamp).toLocaleTimeString('da-DK', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {msg.hasToolCalls && msg.toolCalls && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: msg.content.replace(/\[.*?\]/g, '').trim() ? '6px' : '0' }}>
                            {msg.toolCalls.map((tc, ti) => (
                              <span
                                key={ti}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'rgba(255,255,255,0.08)',
                                  border: '1px solid rgba(255,255,255,0.12)',
                                  borderRadius: '6px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  color: 'rgba(255,255,255,0.5)',
                                  fontFamily: 'monospace',
                                }}
                              >
                                <Icon name="wrench" size={10} />
                                {tc}
                              </span>
                            ))}
                          </div>
                        )}
                        {msg.content.replace(/\[.*?\]/g, '').trim() && (
                          <p className="text-sm text-white whitespace-pre-wrap break-words">
                            {msg.content.replace(/\[.*?\(.*?\)\]/g, '').trim()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Skriv en besked..."
                  disabled={sending}
                  className="flex-1 px-4 py-2 rounded-lg text-sm text-white placeholder-white/30"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !messageInput.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{
                    background: 'rgba(0, 122, 255, 0.2)',
                    border: '1px solid rgba(0, 122, 255, 0.3)',
                    color: '#007AFF',
                    cursor: sending || !messageInput.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sending ? 'Sender...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* CSS animation til Live-prik */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
