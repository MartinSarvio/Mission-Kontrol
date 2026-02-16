import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from '../components/Icon'
import { invokeToolRaw } from '../api/openclaw'

/* ── Agent Identity Map ─────────────────────────────────────── */
interface AgentIdentity {
  name: string
  icon: string
  color: string
  bg: string
}

function getAgentIdentity(key: string): AgentIdentity {
  const k = key.toLowerCase()
  if (k.includes('elon')) return { name: 'Elon', icon: 'rocket', color: '#FF3B30', bg: 'rgba(255,59,48,0.15)' }
  if (k.includes('gary')) return { name: 'Gary', icon: 'megaphone', color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)' }
  if (k.includes('warren')) return { name: 'Warren', icon: 'chart-bar', color: '#30D158', bg: 'rgba(48,209,88,0.15)' }
  if (k.includes('frontend')) return { name: 'Frontend', icon: 'palette', color: '#FF6B35', bg: 'rgba(255,107,53,0.15)' }
  if (k.includes('backend')) return { name: 'Backend', icon: 'server', color: '#30D158', bg: 'rgba(48,209,88,0.15)' }
  if (k.includes('tester')) return { name: 'Tester', icon: 'magnifying-glass', color: '#AF52DE', bg: 'rgba(175,82,222,0.15)' }
  if (k.includes('main')) return { name: 'Maison', icon: 'zap', color: '#007AFF', bg: 'rgba(0,122,255,0.15)' }
  return { name: 'Agent', icon: 'robot', color: '#8E8E93', bg: 'rgba(142,142,147,0.15)' }
}

/* ── Types ──────────────────────────────────────────────────── */
interface ChatSession {
  key: string
  label?: string
  displayName: string
  updatedAt: number
  model: string
  identity: AgentIdentity
}

interface ChatMessage {
  role: string
  text: string
  timestamp?: number
}

/* ── Component ─────────────────────────────────────────────── */
export default function AgentChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [filter, setFilter] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const data = await invokeToolRaw('sessions_list', { messageLimit: 5, limit: 50 }) as any
      const text = data.result?.content?.[0]?.text
      let raw: any[] = []
      if (text) {
        try {
          const parsed = JSON.parse(text)
          raw = parsed.sessions || []
        } catch { /* */ }
      }
      if (!raw.length && data.result?.details?.sessions) raw = data.result.details.sessions

      const mapped: ChatSession[] = raw
        .filter((s: any) => s.key?.includes('subagent') || s.key?.includes('standup'))
        .map((s: any) => ({
          key: s.key,
          label: s.label,
          displayName: s.displayName || s.label || s.key,
          updatedAt: s.updatedAt,
          model: s.model || '',
          identity: getAgentIdentity(s.key),
        }))
        .sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt)

      setSessions(mapped)
    } catch (e) {
      console.error('Fejl ved hentning af sessioner:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch messages for selected session
  const fetchMessages = useCallback(async (key: string) => {
    setLoadingMessages(true)
    try {
      const data = await invokeToolRaw('sessions_history', { sessionKey: key, limit: 100, includeTools: false }) as any
      const text = data.result?.content?.[0]?.text
      let msgs: any[] = []
      if (text) {
        try {
          const parsed = JSON.parse(text)
          msgs = parsed.messages || parsed || []
        } catch { /* */ }
      }
      if (!msgs.length && data.result?.details?.messages) msgs = data.result.details.messages

      setMessages(msgs.map((m: any) => ({
        role: m.role,
        text: typeof m.content === 'string' ? m.content : m.content?.[0]?.text || m.text || '',
        timestamp: m.timestamp,
      })))

      setTimeout(scrollToBottom, 100)
    } catch (e) {
      console.error('Fejl ved hentning af beskeder:', e)
    } finally {
      setLoadingMessages(false)
    }
  }, [scrollToBottom])

  // Initial load + polling
  useEffect(() => {
    fetchSessions()
    pollRef.current = setInterval(() => {
      fetchSessions()
      if (selectedKey) fetchMessages(selectedKey)
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchSessions, fetchMessages, selectedKey])

  // Select session
  const handleSelect = (key: string) => {
    setSelectedKey(key)
    fetchMessages(key)
  }

  const selectedSession = sessions.find(s => s.key === selectedKey)
  const filteredSessions = filter
    ? sessions.filter(s =>
        s.displayName.toLowerCase().includes(filter.toLowerCase()) ||
        s.identity.name.toLowerCase().includes(filter.toLowerCase()) ||
        (s.label || '').toLowerCase().includes(filter.toLowerCase())
      )
    : sessions

  const formatTime = (ts?: number) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return 'I dag'
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'I gar'
    return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Agent Kommunikation</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Live samtaler mellem agenter
          </p>
        </div>
        <button
          onClick={() => { fetchSessions(); if (selectedKey) fetchMessages(selectedKey) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
        >
          <Icon name="arrow-path" size={14} />
          Opdater
        </button>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Sidebar — Session List */}
        <div
          className="w-72 flex-shrink-0 flex flex-col rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Search */}
          <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Soeg sessioner..."
              className="w-full px-3 py-2 rounded-lg text-xs text-white placeholder-white/30"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
            />
          </div>

          {/* Sessions */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <p className="text-center py-8 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Ingen sessioner fundet
              </p>
            ) : (
              filteredSessions.map(s => (
                <div
                  key={s.key}
                  onClick={() => handleSelect(s.key)}
                  className="px-3 py-3 cursor-pointer transition-all"
                  style={{
                    background: selectedKey === s.key ? 'rgba(0,122,255,0.12)' : 'transparent',
                    borderLeft: selectedKey === s.key ? '2px solid #007AFF' : '2px solid transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={e => { if (selectedKey !== s.key) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (selectedKey !== s.key) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: s.identity.bg }}
                    >
                      <Icon name={s.identity.icon} size={14} style={{ color: s.identity.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-white truncate">{s.identity.name}</p>
                        <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {formatDate(s.updatedAt)}
                        </span>
                      </div>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {s.label || s.displayName}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div
          className="flex-1 flex flex-col rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {!selectedKey ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Icon name="chat-bubble" size={48} style={{ color: 'rgba(255,255,255,0.1)' }} />
                <p className="text-sm mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Vaelg en session for at se samtalen
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: selectedSession?.identity.bg }}
                >
                  <Icon name={selectedSession?.identity.icon || 'robot'} size={16} style={{ color: selectedSession?.identity.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{selectedSession?.identity.name}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {selectedSession?.label || selectedSession?.displayName} · {selectedSession?.model}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(48,209,88,0.15)', color: '#30D158' }}>
                  {messages.length} beskeder
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center py-8 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Ingen beskeder endnu
                  </p>
                ) : (
                  messages.map((msg, i) => {
                    const isUser = msg.role === 'user'
                    const isSystem = msg.role === 'system'
                    const isAssistant = msg.role === 'assistant'

                    return (
                      <div
                        key={i}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        style={{ animation: 'fadeInUp 0.3s ease-out' }}
                      >
                        <div
                          className="max-w-[75%] rounded-2xl px-4 py-3"
                          style={{
                            background: isUser
                              ? 'linear-gradient(135deg, #007AFF, #0A84FF)'
                              : isSystem
                              ? 'rgba(255,159,10,0.12)'
                              : 'rgba(255,255,255,0.06)',
                            border: isSystem
                              ? '1px solid rgba(255,159,10,0.25)'
                              : isAssistant
                              ? '1px solid rgba(255,255,255,0.08)'
                              : 'none',
                            backdropFilter: isAssistant ? 'blur(20px)' : undefined,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-semibold" style={{
                              color: isUser ? 'rgba(255,255,255,0.8)' : isSystem ? '#FF9F0A' : 'rgba(255,255,255,0.5)'
                            }}>
                              {isUser ? 'Bruger' : isSystem ? 'System' : selectedSession?.identity.name || 'Agent'}
                            </span>
                            {msg.timestamp && (
                              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                {formatTime(msg.timestamp)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words" style={{
                            color: isUser ? '#fff' : isSystem ? 'rgba(255,159,10,0.9)' : 'rgba(255,255,255,0.8)'
                          }}>
                            {msg.text.length > 2000 ? msg.text.slice(0, 2000) + '...' : msg.text}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={chatEndRef} />
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
