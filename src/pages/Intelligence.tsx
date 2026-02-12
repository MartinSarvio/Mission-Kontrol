import { useState, useEffect, useCallback } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { fetchSessionHistory, runPrompt } from '../api/openclaw'

interface SessionMessage {
  role: string
  text?: string
  content?: string
  timestamp?: number
}

interface ResearchSession {
  sessionKey: string
  label: string
  displayName: string
  date: string
  messages: SessionMessage[]
  preview: string
}

interface Toast {
  id: string
  message: string
}

export default function Intelligence() {
  const { isConnected, isLoading, sessions } = useLiveData()
  const [researchSessions, setResearchSessions] = useState<ResearchSession[]>([])
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [showNewAnalysis, setShowNewAnalysis] = useState(false)
  const [newAnalysisQuery, setNewAnalysisQuery] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileList, setShowMobileList] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const showToast = useCallback((message: string) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  // Load research sessions from live data
  useEffect(() => {
    async function loadResearch() {
      if (!sessions.length) {
        setResearchSessions([])
        return
      }

      // Filter sessions that look like research/intelligence
      const researchKeys = ['research', 'intel', 'analysis', 'web_search', 'søgning']
      const candidates = sessions.filter(s => {
        const label = (s.label || '').toLowerCase()
        const display = (s.displayName || '').toLowerCase()
        return researchKeys.some(k => label.includes(k) || display.includes(k))
      })

      const loaded: ResearchSession[] = []
      for (const s of candidates.slice(0, 20)) {
        try {
          const msgs = await fetchSessionHistory(s.key, 10)
          if (msgs.length === 0) continue

          // Extract preview from last assistant message
          const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant')
          const preview = (lastAssistant?.text || lastAssistant?.content || '').slice(0, 200)

          loaded.push({
            sessionKey: s.key,
            label: s.label || s.displayName || s.key,
            displayName: s.displayName || s.label || s.key,
            date: new Date(s.updatedAt || Date.now()).toISOString().split('T')[0],
            messages: msgs,
            preview: preview || 'Ingen forhåndsvisning tilgængelig',
          })
        } catch (err) {
          console.error('Failed to load session', s.key, err)
        }
      }

      setResearchSessions(loaded)
      if (loaded.length > 0 && !selectedKey) {
        setSelectedKey(loaded[0].sessionKey)
      }
    }

    loadResearch()
  }, [sessions, selectedKey])

  const selectedSession = researchSessions.find(r => r.sessionKey === selectedKey)

  async function runNewAnalysis() {
    if (!newAnalysisQuery.trim()) return
    setIsRunning(true)
    try {
      const result = await runPrompt(`Udfør en research-analyse: ${newAnalysisQuery}`, 'opus')
      showToast('Analyse startet — se sessioner for resultat')
      setNewAnalysisQuery('')
      setShowNewAnalysis(false)
    } catch (err: any) {
      showToast('Fejl: ' + err.message)
    } finally {
      setIsRunning(false)
    }
  }

  function openSession(session: ResearchSession) {
    setSelectedKey(session.sessionKey)
    setShowMobileList(false)
  }

  return (
    <div className="relative h-full" style={{
      background: '#0a0a0f',
      margin: '-24px',
      padding: '0',
      minHeight: 'calc(100vh - 60px)',
    }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: -1,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Left Sidebar */}
        {(!isMobile || showMobileList) && (
          <div style={{
            width: isMobile ? '100%' : '280px',
            flexShrink: 0,
            borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255,255,255,0.02)',
            ...(isMobile ? { position: 'fixed', inset: 0, zIndex: 50, background: '#0a0a0f' } : {}),
          }}>
            <div style={{
              padding: '20px 16px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div className="flex items-center justify-between mb-2">
                <h1 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>Intelligens</h1>
                <div className="flex items-center gap-2">
                  {!isConnected && (
                    <span style={{
                      background: 'rgba(255,159,10,0.15)',
                      color: '#FFB340',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}>OFFLINE</span>
                  )}
                  <button onClick={() => setShowNewAnalysis(!showNewAnalysis)}
                    style={{
                      background: '#007AFF',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}>
                    <Icon name="plus" size={12} />
                  </button>
                  {isMobile && (
                    <button onClick={() => setShowMobileList(false)}
                      style={{ color: 'rgba(255,255,255,0.4)', padding: '4px' }}>
                      <Icon name="xmark" size={16} />
                    </button>
                  )}
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                {isLoading ? 'Indlæser...' : `${researchSessions.length} analyser`}
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {isLoading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin" style={{ color: '#007AFF' }}>
                    <Icon name="arrow-path" size={24} />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '8px' }}>
                    Indlæser research...
                  </p>
                </div>
              )}

              {!isLoading && researchSessions.length === 0 && (
                <div className="text-center py-12 px-4">
                  <Icon name="magnifying-glass" size={32} className="text-white/20 mx-auto mb-3" />
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    Ingen research-sessioner fundet
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '4px' }}>
                    Klik + for at starte ny analyse
                  </p>
                </div>
              )}

              {researchSessions.map(item => {
                const isActive = selectedKey === item.sessionKey
                return (
                  <div key={item.sessionKey} onClick={() => openSession(item)}
                    style={{
                      padding: '12px',
                      marginBottom: '2px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isActive ? 'rgba(0,122,255,0.12)' : 'transparent',
                      borderLeft: isActive ? '3px solid #007AFF' : '3px solid transparent',
                    }}
                    className="hover:bg-white/5"
                  >
                    <h3 style={{
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                      lineHeight: 1.3,
                      marginBottom: '4px',
                    }}>{item.label}</h3>
                    <p style={{
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.4)',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{item.preview}</p>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '4px', display: 'block' }}>
                      {new Date(item.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {isMobile && !showMobileList && (
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <button onClick={() => setShowMobileList(true)}
                className="flex items-center gap-2"
                style={{ color: '#007AFF', fontSize: '14px', fontWeight: 500 }}>
                <Icon name="list" size={18} /> Analyser ({researchSessions.length})
              </button>
              <button onClick={() => setShowNewAnalysis(!showNewAnalysis)}
                style={{ color: '#007AFF' }}>
                <Icon name="plus" size={18} />
              </button>
            </div>
          )}

          {showNewAnalysis && (
            <div style={{
              margin: '20px',
              padding: '24px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <h3 style={{ color: '#ffffff', fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Ny Analyse</h3>
              <textarea
                value={newAnalysisQuery}
                onChange={e => setNewAnalysisQuery(e.target.value)}
                placeholder="Beskriv hvad du vil researche..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#fff',
                  fontSize: '13px',
                  resize: 'vertical',
                  marginBottom: '12px',
                }}
              />
              <div className="flex gap-2">
                <button onClick={runNewAnalysis} disabled={isRunning || !newAnalysisQuery.trim()}
                  style={{
                    background: '#007AFF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isRunning ? 'wait' : 'pointer',
                    opacity: (!newAnalysisQuery.trim() || isRunning) ? 0.5 : 1,
                    minHeight: '44px',
                  }}>
                  {isRunning ? 'Starter...' : 'Start Analyse'}
                </button>
                <button onClick={() => setShowNewAnalysis(false)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}>
                  Annuller
                </button>
              </div>
            </div>
          )}

          {selectedSession && !showNewAnalysis ? (
            <div style={{ padding: isMobile ? '24px 20px' : '40px 56px', maxWidth: '800px' }}>
              <span style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                padding: '4px 12px',
                borderRadius: '6px',
                background: 'rgba(88,86,214,0.2)',
                color: '#8B8AFF',
                marginBottom: '16px',
              }}>RESEARCH</span>

              <h1 style={{
                color: '#ffffff',
                fontSize: isMobile ? '28px' : '34px',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '12px',
              }}>{selectedSession.label}</h1>

              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '16px',
                lineHeight: 1.5,
                marginBottom: '20px',
              }}>{selectedSession.preview}</p>

              <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: '32px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <Icon name="clock" size={12} />
                  {new Date(selectedSession.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.3)',
                }}>Session: {selectedSession.sessionKey.slice(0, 12)}...</span>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '32px' }} />

              <div className="space-y-6">
                {selectedSession.messages.map((msg, i) => (
                  <div key={i} style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: msg.role === 'user' 
                      ? 'rgba(0,122,255,0.08)' 
                      : 'rgba(255,255,255,0.03)',
                    border: '1px solid ' + (msg.role === 'user' 
                      ? 'rgba(0,122,255,0.15)' 
                      : 'rgba(255,255,255,0.06)'),
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name={msg.role === 'user' ? 'person' : 'sparkle'} size={14} />
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: msg.role === 'user' ? '#007AFF' : 'rgba(255,255,255,0.4)',
                      }}>{msg.role === 'user' ? 'BRUGER' : 'ASSISTENT'}</span>
                    </div>
                    <p style={{
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}>{msg.text || msg.content || ''}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : !showNewAnalysis && !selectedSession && !isLoading && (
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center">
                <Icon name="magnifying-glass" size={48} className="text-white/20 mx-auto mb-4" />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontWeight: 500 }}>
                  Ingen analyse valgt
                </p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '8px' }}>
                  Vælg en analyse fra listen eller opret en ny
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className="animate-slide-in" style={{
            borderRadius: '14px',
            padding: '12px 20px',
            fontSize: '13px',
            fontWeight: 500,
            background: 'rgba(30,30,35,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <div className="flex items-center gap-2">
              <Icon name="checkmark-circle" size={18} className="text-green-400" />
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
