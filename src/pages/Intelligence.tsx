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

      // Vis alle sub-agent sessions (de er research/analyse resultater)
      // Filtrer main session fra — vis kun subagents
      const candidates = sessions.filter(s => {
        const key = (s.key || '').toLowerCase()
        return key.includes('subagent')
      })

      const loaded: ResearchSession[] = []
      for (const s of candidates.slice(0, 20)) {
        try {
          const msgs = await fetchSessionHistory(s.key, 20)
          if (msgs.length === 0) continue

          // Udpak preview fra sidste assistant message
          const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant')
          const rawPreview = lastAssistant?.text || lastAssistant?.content || ''
          const previewText = typeof rawPreview === 'string' ? rawPreview : JSON.stringify(rawPreview)
          const preview = previewText.length > 200 
            ? previewText.slice(0, 200) + '...'
            : previewText || 'Ingen indhold tilgængeligt'

          loaded.push({
            sessionKey: s.key,
            label: s.label || s.displayName || s.key,
            displayName: s.displayName || s.label || s.key,
            date: new Date(s.updatedAt || Date.now()).toISOString(),
            messages: msgs,
            preview,
          })
        } catch (err) {
          console.error('Kunne ikke indlæse session', s.key, err)
        }
      }

      // Sorter efter dato (nyeste først)
      loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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
      // Kør prompt med eksplicit web_search instruktion
      const prompt = `Brug web_search tool til at researche følgende emne grundigt og giv en detaljeret analyse med kilder:

${newAnalysisQuery}

Sørg for at:
1. Søge efter aktuelle nyheder og artikler
2. Inkludere kilder og links
3. Give en samlet analyse af resultaterne
4. Fremhæve vigtige trends eller insights`

      const result = await runPrompt(prompt, 'opus')
      showToast('Analyse startet — se sessioner for resultat')
      setNewAnalysisQuery('')
      setShowNewAnalysis(false)
      
      // Genindlæs sessions efter kort delay for at vise den nye
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      showToast('Fejl: ' + (err.message || 'Kunne ikke starte analyse'))
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
              <button 
                onClick={() => setShowNewAnalysis(!showNewAnalysis)}
                style={{ 
                  minHeight: '44px',
                  minWidth: '44px',
                  backgroundColor: '#007AFF',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}>
                <Icon name="plus" size={14} />
              </button>
              <button 
                onClick={() => setShowMobileList(false)}
                className="lg:hidden"
                style={{ minHeight: '44px', minWidth: '44px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
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
                Indlæser research-sessioner...
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
              <div 
                key={item.sessionKey} 
                onClick={() => openSession(item)}
                className={`
                  p-3 mb-0.5 rounded-xl cursor-pointer transition-all
                  border-l-[3px] hover:bg-white/5
                  ${isActive ? 'bg-blue-500/12 border-l-blue-500' : 'bg-transparent border-l-transparent'}
                `}
                style={{ minHeight: '44px' }}
              >
                <h3 className={`text-sm leading-tight mb-1 ${isActive ? 'font-bold text-white' : 'font-medium text-white/70'}`}>
                  {item.displayName}
                </h3>
                <p className="text-xs text-white/40 truncate leading-tight">
                  {item.preview}
                </p>
                <span className="text-[10px] text-white/25 block mt-1">
                  {new Date(item.date).toLocaleDateString('da-DK', { 
                    day: 'numeric', 
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
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
          <button 
            onClick={() => setShowMobileList(true)}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ 
              minHeight: '44px',
              color: '#007AFF',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}>
            <Icon name="list" size={18} /> Analyser ({researchSessions.length})
          </button>
          <button 
            onClick={() => setShowNewAnalysis(!showNewAnalysis)}
            style={{ 
              minHeight: '44px', 
              minWidth: '44px',
              color: '#007AFF',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}>
            <Icon name="plus" size={18} />
          </button>
        </div>

        {showNewAnalysis && (
          <div className="m-4 lg:m-6 p-6 rounded-2xl bg-white/5 border border-white/[0.08]">
            <h3 className="text-base font-bold text-white mb-3">Ny Analyse</h3>
            <p className="text-sm text-white/50 mb-4">
              Beskriv hvad du vil researche. Systemet vil automatisk bruge web-søgning til at finde aktuelle kilder og data.
            </p>
            <textarea
              value={newAnalysisQuery}
              onChange={e => setNewAnalysisQuery(e.target.value)}
              placeholder="Eksempel: Analyser de seneste trends inden for AI og maskinlæring..."
              className="w-full min-h-[120px] bg-white/[0.08] border border-white/10 rounded-lg p-3 text-white text-sm resize-vertical mb-3"
              style={{ minHeight: '120px' }}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={runNewAnalysis} 
                disabled={isRunning || !newAnalysisQuery.trim()}
                style={{ 
                  minHeight: '44px',
                  backgroundColor: '#007AFF',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: (!newAnalysisQuery.trim() || isRunning) ? 'not-allowed' : 'pointer',
                  opacity: (!newAnalysisQuery.trim() || isRunning) ? 0.5 : 1,
                  flex: '1'
                }}>
                {isRunning ? 'Starter analyse...' : 'Start Analyse'}
              </button>
              <button 
                onClick={() => setShowNewAnalysis(false)}
                style={{ 
                  minHeight: '44px',
                  backgroundColor: 'rgba(0,122,255,0.1)',
                  color: '#007AFF',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: '1px solid rgba(0,122,255,0.2)',
                  cursor: 'pointer'
                }}>
                Annuller
              </button>
            </div>
          </div>
        )}

        {selectedSession && !showNewAnalysis ? (
          <div className="p-4 sm:p-6 lg:p-14 max-w-3xl mx-auto">
            <span className="inline-block text-[11px] font-bold tracking-wider px-3 py-1 rounded-md bg-purple-500/20 text-purple-300 mb-4">
              RESEARCH
            </span>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3">
              {selectedSession.displayName}
            </h1>

            <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-5">
              {selectedSession.preview}
            </p>

            <div className="flex items-center gap-3 flex-wrap mb-8">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide px-3 py-1.5 rounded-md bg-white/[0.06] text-white/50 border border-white/[0.08]">
                <Icon name="clock" size={12} />
                {new Date(selectedSession.date).toLocaleDateString('da-DK', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span className="text-xs text-white/30">
                {selectedSession.messages.length} beskeder
              </span>
            </div>

            <div className="h-px bg-white/[0.06] mb-8" />

            <div className="space-y-4 sm:space-y-6">
              {selectedSession.messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`
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
                    {msg.timestamp && (
                      <span className="text-[10px] text-white/25 ml-auto">
                        {new Date(msg.timestamp).toLocaleTimeString('da-DK', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
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
          <div 
            key={toast.id} 
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
