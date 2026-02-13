import { useState, useMemo, useEffect } from 'react'
import Icon from '../components/Icon'
import LiveFeed from '../components/LiveFeed'
import { useLiveData } from '../api/LiveDataContext'
import { createAgent, ApiSession, getSessionHistory, DetailedSessionMessage, ToolCall } from '../api/openclaw'

/* ── Types ───────────────────────────────────── */
interface Task {
  id: string
  title: string
  status: 'queued' | 'active' | 'completed'
  kind: string
  model: string
  updated: Date
  sessionKey: string
  sessionId: string
  channel: string
  contextTokens?: number
  totalTokens?: number
  lastMessages?: any[]
  label?: string
}

/* ── Helpers ─────────────────────────────────── */
function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return 'lige nu'
  if (mins < 60) return `${mins}m siden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}t siden`
  return `${Math.floor(hours / 24)}d siden`
}

function sessionToTask(s: any): Task {
  const updatedAt = new Date(s.updatedAt)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  
  let status: 'queued' | 'active' | 'completed' = 'active'
  if (s.kind === 'subagent') {
    status = updatedAt > fiveMinAgo ? 'active' : 'completed'
  }

  let title = s.label || s.displayName || 'Unavngiven'
  if (s.kind === 'main') title = 'Hovedsession'

  return {
    id: s.sessionId,
    title,
    status,
    kind: s.kind,
    model: s.model,
    updated: updatedAt,
    sessionKey: s.key,
    sessionId: s.sessionId,
    channel: s.lastChannel || s.channel,
    contextTokens: s.contextTokens,
    totalTokens: s.totalTokens,
    lastMessages: s.lastMessages,
    label: s.label,
  }
}

function getAgentIcon(kind: string): string {
  if (kind === 'main') return 'robot'
  if (kind === 'subagent') return 'person'
  return 'sparkle'
}

/* ── Sub-components ──────────────────────────── */
function StatusDot({ status, size = 8 }: { status: string; size?: number }) {
  const color = status === 'active' ? 'bg-blue-500 animate-pulse' : status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
  return <span className={`rounded-full flex-shrink-0 ${color}`} style={{ width: size, height: size }} />
}

function KindBadge({ kind }: { kind: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    main: { label: 'Hoved', color: '#007AFF', bg: 'rgba(0,122,255,0.1)' },
    subagent: { label: 'Sub-agent', color: '#AF52DE', bg: 'rgba(175,82,222,0.1)' },
    isolated: { label: 'Isoleret', color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  }
  const c = config[kind] || { label: kind, color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.05)' }
  return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>{c.label}</span>
}

/* ── Tool Call Card ──────────────────────────── */
function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,149,0,0.05)', border: '1px solid rgba(255,149,0,0.15)' }}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Icon name="wrench" size={14} className="text-orange-400" />
          <span className="text-sm font-medium text-orange-300">{toolCall.tool}</span>
        </div>
        <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={14} className="text-white/30" />
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Arguments */}
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Argumenter
            </p>
            <pre className="text-[11px] p-2 rounded overflow-x-auto" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.6)' }}>
              {String(JSON.stringify(toolCall.args || {}, null, 2))}
            </pre>
          </div>
          
          {/* Result */}
          {toolCall.result && (
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Resultat
              </p>
              <pre className="text-[11px] p-2 rounded overflow-x-auto max-h-40" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.6)' }}>
                {typeof toolCall.result === 'string' ? toolCall.result : String(JSON.stringify((toolCall.result as any) || {}, null, 2))}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Message Bubble ──────────────────────────── */
function MessageBubble({ message }: { message: DetailedSessionMessage }) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  
  let text = ''
  const msgText = message.text as any
  const msgContent = message.content as any
  
  if (typeof msgText === 'string') {
    text = msgText
  } else if (typeof msgContent === 'string') {
    text = msgContent
  } else if (Array.isArray(msgText)) {
    const textBlock = msgText.find((c: any) => c.type === 'text')
    text = textBlock?.text || ''
  } else if (Array.isArray(msgContent)) {
    const textBlock = msgContent.find((c: any) => c.type === 'text')
    text = textBlock?.text || ''
  }
  
  if (!text && !message.toolCalls) return null
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Role label */}
        <div className={`text-[10px] mb-1 ${isUser ? 'text-right' : 'text-left'}`} style={{ color: 'rgba(255,255,255,0.3)' }}>
          {isUser ? 'Bruger' : isAssistant ? 'Agent' : message.role}
        </div>
        
        {/* Message content */}
        {text && (
          <div 
            className="rounded-2xl px-4 py-2.5"
            style={{ 
              background: isUser ? '#007AFF' : 'rgba(255,255,255,0.06)',
              color: isUser ? '#fff' : 'rgba(255,255,255,0.85)',
            }}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
          </div>
        )}
        
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2 mt-2">
            {message.toolCalls.map((tc, idx) => (
              <ToolCallCard key={idx} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Component ──────────────────────────── */
export default function Tasks() {
  const { sessions, isLoading, isConnected, pollingSpeed } = useLiveData()
  const [viewMode, setViewMode] = useState<'sessions' | 'livefeed'>('sessions')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [sessionHistory, setSessionHistory] = useState<DetailedSessionMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKind, setFilterKind] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', task: '', model: 'anthropic/claude-sonnet-4-5' })
  const [isCreating, setIsCreating] = useState(false)

  const tasks: Task[] = useMemo(() => {
    return sessions.map(sessionToTask).sort((a, b) => b.updated.getTime() - a.updated.getTime())
  }, [sessions])

  const kinds = [...new Set(tasks.map(t => t.kind))]
  const filtered = tasks.filter(t => {
    if (filterKind && t.kind !== filterKind) return false
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const active = filtered.filter(t => t.status === 'active')
  const completed = filtered.filter(t => t.status === 'completed')

  // Load session history when task is selected
  useEffect(() => {
    if (!selectedTask) {
      setSessionHistory([])
      return
    }
    
    setLoadingHistory(true)
    getSessionHistory(selectedTask.sessionKey)
      .then(msgs => setSessionHistory(msgs))
      .catch(err => {
        console.error('Failed to load history:', err)
        setSessionHistory([])
      })
      .finally(() => setLoadingHistory(false))
  }, [selectedTask])

  async function handleCreateTask() {
    if (!createForm.name || !createForm.task) return
    setIsCreating(true)
    try {
      await createAgent({ name: createForm.name, task: createForm.task, model: createForm.model, label: createForm.name })
      setShowCreateModal(false)
      setCreateForm({ name: '', task: '', model: 'anthropic/claude-sonnet-4-5' })
    } catch (error) {
      console.error('Fejl:', error)
    } finally {
      setIsCreating(false)
    }
  }

  /* ── Session Card ─────────── */
  const SessionCard = ({ task }: { task: Task }) => {
    const progress = task.contextTokens && task.totalTokens 
      ? Math.min(Math.round((task.contextTokens / task.totalTokens) * 100), 100) : undefined

    return (
      <div 
        onClick={() => setSelectedTask(task)} 
        className="rounded-2xl p-4 cursor-pointer transition-all duration-200"
        style={{ 
          background: task.status === 'active' ? 'rgba(0,122,255,0.04)' : 'rgba(255,255,255,0.02)', 
          border: task.status === 'active' ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = task.status === 'active' ? 'rgba(0,122,255,0.08)' : 'rgba(255,255,255,0.04)'
          e.currentTarget.style.borderColor = 'rgba(0,122,255,0.3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = task.status === 'active' ? 'rgba(0,122,255,0.04)' : 'rgba(255,255,255,0.02)'
          e.currentTarget.style.borderColor = task.status === 'active' ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.06)'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: task.status === 'active' ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.06)' }}>
              <Icon name={getAgentIcon(task.kind)} size={18} className={task.status === 'active' ? 'text-blue-400' : 'text-white/40'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusDot status={task.status} size={6} />
                <h4 className="text-sm font-semibold text-white truncate">{task.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <KindBadge kind={task.kind} />
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{task.channel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        {task.status === 'active' && progress !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Fremskridt</span>
              <span className="text-[10px] font-bold" style={{ color: '#007AFF' }}>{progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,122,255,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #007AFF, #5AC8FA)' }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(task.updated)}</span>
          <div className="flex items-center gap-3">
            {task.contextTokens && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{(task.contextTokens / 1000).toFixed(0)}K tok</span>}
            <span className="text-[11px] font-medium" style={{ color: task.status === 'active' ? '#007AFF' : 'rgba(52,199,89,0.8)' }}>
              {task.status === 'active' ? 'Aktiv' : 'Afsluttet'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Tab Button ─────────── */
  const TabBtn = ({ id, label, icon }: { id: typeof viewMode; label: string; icon: string }) => (
    <button onClick={() => setViewMode(id)}
      className="px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-2"
      style={{
        background: viewMode === id ? '#007AFF' : 'transparent',
        color: viewMode === id ? '#fff' : 'rgba(255,255,255,0.5)',
        minHeight: '44px'
      }}>
      <Icon name={icon} size={14} />
      {label}
    </button>
  )

  /* ── Not connected ─────────── */
  if (!isConnected) {
    return (
      <div className="relative">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Opgaver</h1>
        <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>Session historik og live aktivitet</p>
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Icon name="exclamation-triangle" size={48} className="text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen forbindelse til Gateway</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Gå til Indstillinger for at konfigurere</p>
        </div>
      </div>
    )
  }

  /* ── Main Render ─────────── */
  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Opgaver</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button onClick={() => setShowCreateModal(true)} className="text-sm flex items-center justify-center gap-2" style={{ minHeight: '44px', background: '#007AFF', color: '#fff', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
            <Icon name="plus" size={14} /> Opret Opgave
          </button>
          <div className="overflow-x-auto">
            <div className="flex items-center gap-1 p-1 rounded-xl min-w-max" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <TabBtn id="sessions" label="Sessions" icon="list" />
              <TabBtn id="livefeed" label="Live Feed" icon="zap" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-5">
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {tasks.length} sessions · {active.length} aktive
        </p>
        {/* Polling speed indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: 'rgba(0,122,255,0.08)' }}>
          <span className={`w-1.5 h-1.5 rounded-full ${pollingSpeed === 'fast' ? 'bg-green-400 animate-pulse' : pollingSpeed === 'normal' ? 'bg-blue-400' : 'bg-yellow-400'}`} />
          <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {pollingSpeed === 'fast' ? 'Hurtig opdatering' : pollingSpeed === 'normal' ? 'Normal opdatering' : 'Langsom opdatering'}
          </span>
        </div>
        {isLoading && <span className="text-xs text-blue-400">synkroniserer...</span>}
      </div>

      {/* ── Sessions View ─────────── */}
      {viewMode === 'sessions' && (
        <>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <select value={filterKind} onChange={e => setFilterKind(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle typer</option>
              {kinds.map(k => <option key={k} value={k}>{k === 'main' ? 'Hoved' : k === 'subagent' ? 'Sub-agent' : k}</option>)}
            </select>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"><Icon name="magnifying-glass" size={14} /></span>
              <input type="text" placeholder="Søg..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input text-xs py-1.5 w-48 pl-8" />
            </div>
          </div>
          
          {/* Active sessions */}
          {active.length > 0 && (
            <>
              <h3 className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: 'rgba(0,122,255,0.7)' }}>
                Aktive ({active.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {active.map(t => <SessionCard key={t.id} task={t} />)}
              </div>
            </>
          )}
          
          {/* Completed sessions */}
          {completed.length > 0 && (
            <>
              <h3 className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: 'rgba(52,199,89,0.7)' }}>
                Afsluttet ({completed.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map(t => <SessionCard key={t.id} task={t} />)}
              </div>
            </>
          )}
          
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen sessions matchede filtrene</div>
          )}
        </>
      )}

      {/* ── Live Feed View ─────────── */}
      {viewMode === 'livefeed' && (
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Icon name="zap" size={18} className="text-blue-400" />
              <h2 className="text-lg font-bold text-white">Live Aktivitet</h2>
            </div>
            <LiveFeed maxEntries={100} />
          </div>
        </div>
      )}

      {/* ── Create Modal ─────────── */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowCreateModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:bottom-auto sm:right-auto w-full sm:w-[500px] z-50 p-6 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(28,28,30,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-white">Opret Ny Opgave</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                <Icon name="xmark" size={14} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Opgavenavn</label>
                <input type="text" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="f.eks. Byg ny feature" className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Opgavebeskrivelse</label>
                <textarea value={createForm.task} onChange={e => setCreateForm(p => ({ ...p, task: e.target.value }))}
                  placeholder="Beskriv opgaven i detaljer..." rows={4} className="input w-full resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Model</label>
                <select value={createForm.model} onChange={e => setCreateForm(p => ({ ...p, model: e.target.value }))} className="input w-full">
                  <option value="anthropic/claude-sonnet-4-5">Claude Sonnet 4.5</option>
                  <option value="anthropic/claude-opus-4-6">Claude Opus 4.6</option>
                  <option value="anthropic/claude-haiku-4-5">Claude Haiku 4.5</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowCreateModal(false)} disabled={isCreating}
                  className="flex-1" style={{ minHeight: '44px', background: 'rgba(0,122,255,0.1)', color: '#007AFF', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(0,122,255,0.2)', cursor: 'pointer' }}>
                  Annuller
                </button>
                <button onClick={handleCreateTask} disabled={isCreating || !createForm.name || !createForm.task}
                  className="flex-1" style={{ minHeight: '44px', background: '#007AFF', color: '#fff', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', opacity: (isCreating || !createForm.name || !createForm.task) ? 0.5 : 1 }}>
                  {isCreating ? 'Opretter...' : 'Opret Opgave'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Detail Panel (Session History) ─────────── */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setSelectedTask(null)} />
          <div className="fixed bottom-0 left-0 right-0 sm:right-0 sm:top-0 sm:left-auto sm:bottom-auto h-[85vh] sm:h-full w-full sm:w-[600px] z-50 overflow-y-auto rounded-t-2xl sm:rounded-none flex flex-col"
            style={{ background: 'rgba(20,20,24,0.98)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
            
            {/* Header */}
            <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: selectedTask.status === 'active' ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.06)' }}>
                    <Icon name={getAgentIcon(selectedTask.kind)} size={20} className={selectedTask.status === 'active' ? 'text-blue-400' : 'text-white/40'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-white truncate mb-1">{selectedTask.title}</h2>
                    <div className="flex items-center gap-2">
                      <StatusDot status={selectedTask.status} size={6} />
                      <span className="text-xs" style={{ color: selectedTask.status === 'active' ? '#007AFF' : 'rgba(52,199,89,0.8)' }}>
                        {selectedTask.status === 'active' ? 'Aktiv' : 'Afsluttet'}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="w-11 h-11 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                  <Icon name="xmark" size={14} />
                </button>
              </div>
              
              {/* Meta info */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Type</p>
                  <KindBadge kind={selectedTask.kind} />
                </div>
                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Kanal</p>
                  <p className="text-xs text-white">{selectedTask.channel}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Model</p>
                  <p className="text-xs text-white">{selectedTask.model.split('/').pop()}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Tokens</p>
                  <p className="text-xs text-white">{selectedTask.contextTokens ? `${(selectedTask.contextTokens / 1000).toFixed(1)}K` : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Indlæser historik...</p>
                </div>
              ) : sessionHistory.length > 0 ? (
                <div className="space-y-1">
                  {sessionHistory.map((msg, idx) => (
                    <MessageBubble key={idx} message={msg} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Icon name="doc-text" size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen beskeder i denne session</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
