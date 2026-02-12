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
  const [showMobileList, setShowMobileList] = useState(false)

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
    <div className="flex flex-col lg:flex-row min-h-full">
      {/* Left Sidebar - responsive */}
      <div className={`
        ${showMobileList ? 'fixed inset-0 z-50' : 'hidden'}
        lg:block lg:relative lg:z-auto
        w-full lg:w-80 flex-shrink-0 flex flex-col
        bg-[#0a0a0f] lg:bg-white/[0.02]
        lg:border-r lg:border-white/[0.06]
      `}>
        <div className="p-4 lg:px-4 lg:py-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-white">Intelligens</h1>
            <div className="flex items-center gap-2">
              {!isConnected && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-400/15 text-orange-300">
                  OFFLINE
                </span>
              )}
              <button onClick={() => setShowNewAnalysis(!showNewAnalysis)}
                className="btn-primary text-xs px-3 py-1.5"
                style={{ minHeight: '36px' }}>
                <Icon name="plus" size={12} />
              </button>
              <button onClick={() => setShowMobileList(false)}
                className="lg:hidden p-2"
                style={{ minHeight: '44px', minWidth: '44px' }}>
                <Icon name="xmark" size={16} className="text-white/40" />
              </button>
            </div>
          </div>
          <p className="text-xs text-white/30">
            {isLoading ? 'Indlæser...' : `${researchSessions.length} analyser`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin text-blue-500">
                <Icon name="arrow-path" size={24} />
              </div>
              <p className="text-xs text-white/30 mt-2">
                Indlæser research...
              </p>
            </div>
          )}

          {!isLoading && researchSessions.length === 0 && (
            <div className="text-center py-12 px-4">
              <Icon name="magnifying-glass" size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">
                Ingen research-sessioner fundet
              </p>
              <p className="text-xs text-white/25 mt-1">
                Klik + for at starte ny analyse
              </p>
            </div>
          )}

          {researchSessions.map(item => {
            const isActive = selectedKey === item.sessionKey
            return (
              <div key={item.sessionKey} onClick={() => openSession(item)}
                className={`
                  p-3 mb-0.5 rounded-xl cursor-pointer transition-all
                  border-l-[3px] hover:bg-white/5
                  ${isActive ? 'bg-blue-500/12 border-l-blue-500' : 'bg-transparent border-l-transparent'}
                `}
                style={{ minHeight: '44px' }}
              >
                <h3 className={`text-sm leading-tight mb-1 ${isActive ? 'font-bold text-white' : 'font-medium text-white/70'}`}>
                  {item.label}
                </h3>
                <p className="text-xs text-white/40 truncate leading-tight">
                  {item.preview}
                </p>
                <span className="text-[10px] text-white/25 block mt-1">
                  {new Date(item.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile header - only show on mobile when list is hidden */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b border-white/[0.06] bg-white/[0.02]">
          <button onClick={() => setShowMobileList(true)}
            className="flex items-center gap-2 text-blue-500 text-sm font-medium"
            style={{ minHeight: '44px' }}>
            <Icon name="list" size={18} /> Analyser ({researchSessions.length})
          </button>
          <button onClick={() => setShowNewAnalysis(!showNewAnalysis)}
            className="text-blue-500"
            style={{ minHeight: '44px', minWidth: '44px' }}>
            <Icon name="plus" size={18} />
          </button>
        </div>

        {showNewAnalysis && (
          <div className="m-4 lg:m-6 p-6 rounded-2xl bg-white/5 border border-white/[0.08]">
            <h3 className="text-base font-bold text-white mb-3">Ny Analyse</h3>
            <textarea
              value={newAnalysisQuery}
              onChange={e => setNewAnalysisQuery(e.target.value)}
              placeholder="Beskriv hvad du vil researche..."
              className="w-full min-h-[120px] bg-white/[0.08] border border-white/10 rounded-lg p-3 text-white text-sm resize-vertical mb-3"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={runNewAnalysis} disabled={isRunning || !newAnalysisQuery.trim()}
                className="btn-primary"
                style={{ minHeight: '44px', opacity: (!newAnalysisQuery.trim() || isRunning) ? 0.5 : 1 }}>
                {isRunning ? 'Starter...' : 'Start Analyse'}
              </button>
              <button onClick={() => setShowNewAnalysis(false)}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-white/[0.08] border border-white/10 text-white/60"
                style={{ minHeight: '44px' }}>
                Annuller
              </button>
            </div>
          </div>
        )}

        {selectedSession && !showNewAnalysis ? (
          <div className="p-6 lg:p-14 max-w-3xl mx-auto">
            <span className="inline-block text-[11px] font-bold tracking-wider px-3 py-1 rounded-md bg-purple-500/20 text-purple-300 mb-4">
              RESEARCH
            </span>

            <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3">
              {selectedSession.label}
            </h1>

            <p className="text-base text-white/50 leading-relaxed mb-5">
              {selectedSession.preview}
            </p>

            <div className="flex items-center gap-3 flex-wrap mb-8">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide px-3 py-1.5 rounded-md bg-white/[0.06] text-white/50 border border-white/[0.08]">
                <Icon name="clock" size={12} />
                {new Date(selectedSession.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-xs text-white/30">
                Session: {selectedSession.sessionKey.slice(0, 12)}...
              </span>
            </div>

            <div className="h-px bg-white/[0.06] mb-8" />

            <div className="space-y-6">
              {selectedSession.messages.map((msg, i) => (
                <div key={i} className={`
                  p-4 lg:p-5 rounded-xl border
                  ${msg.role === 'user' 
                    ? 'bg-blue-500/[0.08] border-blue-500/15' 
                    : 'bg-white/[0.03] border-white/[0.06]'}
                `}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name={msg.role === 'user' ? 'person' : 'sparkle'} size={14} />
                    <span className={`text-[11px] font-bold tracking-wider ${msg.role === 'user' ? 'text-blue-500' : 'text-white/40'}`}>
                      {msg.role === 'user' ? 'BRUGER' : 'ASSISTENT'}
                    </span>
                  </div>
                  <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
                    {msg.text || msg.content || ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : !showNewAnalysis && !selectedSession && !isLoading && (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center">
              <Icon name="magnifying-glass" size={48} className="text-white/20 mx-auto mb-4" />
              <p className="text-base font-medium text-white/50">
                Ingen analyse valgt
              </p>
              <p className="text-sm text-white/30 mt-2">
                Vælg en analyse fra listen eller opret en ny
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} 
            className="animate-slide-in rounded-2xl px-5 py-3 text-sm font-medium bg-[#1e1e23]/95 backdrop-blur-xl border border-white/10 text-white shadow-2xl">
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
