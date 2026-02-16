import { useState, useEffect, useRef } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import { invokeToolRaw, ApiSession } from '../api/openclaw'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  sessionKey: string
  sessionName: string
  channel: string
}

export default function Communication() {
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch sessions on mount and every 5 seconds
  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch messages when session is selected
  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession)
    }
  }, [selectedSession])

  async function fetchSessions() {
    try {
      const data = await invokeToolRaw('sessions_list', { messageLimit: 10 }) as any
      const text = data.result?.content?.[0]?.text
      if (text) {
        const parsed = JSON.parse(text)
        setSessions(parsed.sessions || [])
        // Auto-select first session if none selected
        if (!selectedSession && parsed.sessions?.length > 0) {
          setSelectedSession(parsed.sessions[0].key)
        }
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      setLoading(false)
    }
  }

  async function fetchMessages(sessionKey: string) {
    try {
      const data = await invokeToolRaw('sessions_history', { sessionKey, limit: 50 }) as any
      const text = data.result?.content?.[0]?.text
      if (text) {
        const parsed = JSON.parse(text)
        const msgs = parsed.messages || []
        
        const session = sessions.find(s => s.key === sessionKey)
        const sessionName = session?.displayName || session?.label || sessionKey
        const channel = session?.channel || 'unknown'
        
        setMessages(msgs.map((m: any) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : m.content?.[0]?.text || m.text || '',
          timestamp: m.timestamp || Date.now(),
          sessionKey,
          sessionName,
          channel,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  async function sendMessage() {
    if (!messageInput.trim() || !selectedSession) return
    
    setSending(true)
    try {
      const session = sessions.find(s => s.key === selectedSession)
      const channel = session?.channel || 'telegram'
      
      // Send message into the selected session (agent turn)
      await invokeToolRaw('sessions_send', {
        sessionKey: selectedSession,
        message: messageInput,
      })
      
      setMessageInput('')
      // Refresh messages after sending
      setTimeout(() => fetchMessages(selectedSession), 1000)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-white/50">Henter sessioner...</p>
      </div>
    )
  }

  const selectedSessionData = sessions.find(s => s.key === selectedSession)

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Kommunikation</h1>
      </div>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Live beskeder fra Telegram og andre kanaler
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-240px)]">
        {/* Sessions sidebar */}
        <Card className="lg:col-span-1 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-3">Aktive Sessioner</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-8">Ingen sessioner</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => {
                const isActive = Date.now() - session.updatedAt < 120000
                const isSelected = session.key === selectedSession
                return (
                  <button
                    key={session.key}
                    onClick={() => setSelectedSession(session.key)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all"
                    style={{
                      background: isSelected ? 'rgba(0, 122, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelected ? 'rgba(0, 122, 255, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: isActive ? '#34C759' : '#8E8E93' }}
                      />
                      <span className="text-sm font-medium text-white truncate">
                        {session.displayName || session.label || session.key}
                      </span>
                    </div>
                    <p className="caption text-xs truncate">{session.channel || 'ingen kanal'}</p>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* Messages area */}
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
                  <p className="caption text-xs">
                    {selectedSessionData?.channel} · {selectedSessionData?.model}
                  </p>
                </div>
                <button
                  onClick={() => fetchMessages(selectedSession)}
                  className="p-2 rounded-lg transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <Icon name="arrow-path" size={16} className="text-white/70" />
                </button>
              </div>

              {/* Messages */}
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
                        <p className="text-sm text-white whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
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
                  }}
                >
                  {sending ? 'Sender...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
