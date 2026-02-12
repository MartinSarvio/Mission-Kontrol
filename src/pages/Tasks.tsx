import { useState, useMemo, useEffect, useRef } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { createAgent, ApiSession, fetchSessionHistory, SessionMessage } from '../api/openclaw'

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

interface AgentActivity {
  agentName: string
  sessionKey: string
  status: 'working' | 'idle' | 'done'
  currentTask: string
  lastAction: string
  model: string
  progress: number
  plan: string[]
  channel: string
  updatedAt: Date
  tokens: number
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

function timeSince(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}t ${mins % 60}m`
}

function extractLastMessage(session: any): string {
  if (session.lastMessages && session.lastMessages.length > 0) {
    const msg = session.lastMessages[session.lastMessages.length - 1]
    const text = msg.text || msg.content || ''
    if (typeof text === 'string') return text.slice(0, 200)
    if (Array.isArray(text)) {
      const t = text.find((c: any) => c.type === 'text')
      return t?.text?.slice(0, 200) || ''
    }
  }
  return ''
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

/* ── Sub-components ──────────────────────────── */
function StatusDot({ status, size = 8 }: { status: string; size?: number }) {
  const color = status === 'active' || status === 'working' ? 'bg-blue-500' : status === 'completed' || status === 'done' ? 'bg-green-500' : status === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'
  return <span className={`rounded-full flex-shrink-0 ${color} ${status === 'active' || status === 'working' ? 'animate-pulse' : ''}`} style={{ width: size, height: size }} />
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

/* ── Main Component ──────────────────────────── */
export default function Tasks() {
  const { sessions, isLoading, isConnected } = useLiveData()
  const [viewMode, setViewMode] = useState<'kanban' | 'livefeed' | 'historik' | 'visuel'>('kanban')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKind, setFilterKind] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', task: '', model: 'anthropic/claude-sonnet-4-5' })
  const [isCreating, setIsCreating] = useState(false)
  const [sessionDetails, setSessionDetails] = useState<Record<string, SessionMessage[]>>({})
  const [tick, setTick] = useState(0)

  // Live tick for animations
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(interval)
  }, [])

  // Fetch detailed history for active sub-agents
  useEffect(() => {
    const subagents = sessions.filter(s => s.kind === 'subagent')
    subagents.forEach(async (s) => {
      try {
        const msgs = await fetchSessionHistory(s.key, 3)
        setSessionDetails(prev => ({ ...prev, [s.key]: msgs }))
      } catch { /* ignore */ }
    })
  }, [sessions, tick])

  const tasks: Task[] = useMemo(() => {
    return sessions.map(sessionToTask).sort((a, b) => b.updated.getTime() - a.updated.getTime())
  }, [sessions])

  const kinds = [...new Set(tasks.map(t => t.kind))]
  const filtered = tasks.filter(t => {
    if (filterKind && t.kind !== filterKind) return false
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const queued = filtered.filter(t => t.status === 'queued')
  const active = filtered.filter(t => t.status === 'active')
  const completed = filtered.filter(t => t.status === 'completed')

  // Build agent activities for visual view
  const agentActivities: AgentActivity[] = useMemo(() => {
    return sessions.map(s => {
      const updatedAt = new Date(s.updatedAt)
      const isRecent = updatedAt > new Date(Date.now() - 5 * 60 * 1000)
      const lastMsg = extractLastMessage(s)
      const details = sessionDetails[s.key] || []
      const lastDetail = details.length > 0 ? details[details.length - 1] : null
      
      let currentTask = s.label || s.displayName || 'Ukendt opgave'
      if (s.kind === 'main') currentTask = 'Telegram samtale med Martin'
      
      let lastAction = lastMsg || 'Venter...'
      if (lastDetail) {
        const detailText = lastDetail.text || lastDetail.content || ''
        if (typeof detailText === 'string' && detailText.length > 0) lastAction = detailText.slice(0, 150)
      }
      
      // Generate a simulated plan based on session kind
      let plan: string[] = []
      if (s.kind === 'subagent') {
        plan = ['Analysér opgave', 'Læs relevante filer', 'Implementér ændringer', 'Test og verificér', 'Commit og push']
      } else if (s.kind === 'main') {
        plan = ['Modtag besked', 'Analysér forespørgsel', 'Udfør handling', 'Svar til Martin']
      }

      const progress = s.contextTokens && s.totalTokens 
        ? Math.min(Math.round((s.contextTokens / s.totalTokens) * 100), 100)
        : isRecent ? 50 : 100

      return {
        agentName: s.kind === 'main' ? 'Maison (Hoved)' : s.label || s.displayName || 'Sub-agent',
        sessionKey: s.key,
        status: s.kind === 'main' ? 'working' : isRecent ? 'working' : 'done',
        currentTask,
        lastAction,
        model: s.model,
        progress,
        plan,
        channel: s.lastChannel || s.channel,
        updatedAt,
        tokens: s.contextTokens || 0,
      } as AgentActivity
    }).sort((a, b) => {
      if (a.status === 'working' && b.status !== 'working') return -1
      if (b.status === 'working' && a.status !== 'working') return 1
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    })
  }, [sessions, sessionDetails, tick])

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

  /* ── Task Card ─────────── */
  const TaskCard = ({ task }: { task: Task }) => {
    const progress = task.contextTokens && task.totalTokens 
      ? Math.min(Math.round((task.contextTokens / task.totalTokens) * 100), 100) : undefined
    const lastMsg = extractLastMessage(task)

    return (
      <div onClick={() => setSelectedTask(task)} className="rounded-2xl p-4 cursor-pointer transition-all duration-200 group"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(0,122,255,0.3)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <StatusDot status={task.status} />
            <h4 className="text-sm font-semibold text-white truncate">{task.title}</h4>
          </div>
          <KindBadge kind={task.kind} />
        </div>
        {lastMsg && (
          <p className="text-[11px] mb-2 line-clamp-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {lastMsg}
          </p>
        )}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{task.channel}</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{task.model.split('/').pop()}</span>
        </div>
        {task.status === 'active' && progress !== undefined && (
          <div className="mb-1">
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,122,255,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #007AFF, #5AC8FA)' }} />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(task.updated)}</span>
          {task.contextTokens && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{(task.contextTokens / 1000).toFixed(0)}K tok</span>}
        </div>
      </div>
    )
  }

  /* ── Column ─────────── */
  const Column = ({ title, count, color, tasks: items }: { title: string; count: number; color: string; tasks: Task[] }) => (
    <div className="flex-1 min-w-[280px] sm:min-w-[300px]">
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>{count}</span>
      </div>
      <div className="space-y-3 min-h-[200px] p-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        {items.map(t => <TaskCard key={t.id} task={t} />)}
        {items.length === 0 && <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>Ingen opgaver</div>}
      </div>
    </div>
  )

  /* ── Visual Agent Card ─────────── */
  const AgentVisualCard = ({ agent }: { agent: AgentActivity }) => {
    const isWorking = agent.status === 'working'
    const planStep = isWorking ? Math.floor((agent.progress / 100) * agent.plan.length) : agent.plan.length

    return (
      <div className="rounded-2xl p-5 transition-all duration-300"
        style={{ 
          background: isWorking ? 'rgba(0,122,255,0.04)' : 'rgba(255,255,255,0.02)',
          border: isWorking ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
          boxShadow: isWorking ? '0 0 30px rgba(0,122,255,0.05)' : 'none'
        }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
              style={{ background: isWorking ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.06)' }}>
              <Icon name="person" size={20} className={isWorking ? 'text-blue-400' : 'text-white/40'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{agent.agentName}</h3>
                <StatusDot status={agent.status} size={6} />
              </div>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.model.split('/').pop()} · {agent.channel}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium" style={{ color: isWorking ? '#007AFF' : 'rgba(52,199,89,0.8)' }}>
              {isWorking ? 'Arbejder' : 'Færdig'}
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeSince(agent.updatedAt)}</p>
          </div>
        </div>

        {/* Current Task */}
        <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Nuværende opgave</p>
          <p className="text-sm text-white font-medium">{agent.currentTask}</p>
        </div>

        {/* Last Action */}
        <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Seneste handling</p>
          <p className="text-xs line-clamp-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{agent.lastAction}</p>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Fremskridt</span>
            <span className="text-[10px] font-bold" style={{ color: '#007AFF' }}>{agent.progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,122,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-1000" 
              style={{ width: `${agent.progress}%`, background: 'linear-gradient(90deg, #007AFF, #5AC8FA)' }} />
          </div>
        </div>

        {/* Plan Steps */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Plan</p>
          <div className="space-y-1.5">
            {agent.plan.map((step, i) => {
              const isDone = i < planStep
              const isCurrent = i === planStep && isWorking
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: isDone ? 'rgba(52,199,89,0.15)' : isCurrent ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: isCurrent ? '1px solid rgba(0,122,255,0.4)' : '1px solid transparent'
                    }}>
                    {isDone && <Icon name="checkmark" size={8} className="text-green-400" />}
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                  </div>
                  <span className={`text-xs ${isDone ? 'text-green-400/70 line-through' : isCurrent ? 'text-blue-400 font-medium' : 'text-white/30'}`}>
                    {step}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tokens */}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Token forbrug</span>
            <span className="text-[10px] font-medium text-white/50">{(agent.tokens / 1000).toFixed(1)}K</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Tab Button ─────────── */
  const TabBtn = ({ id, label }: { id: typeof viewMode; label: string }) => (
    <button onClick={() => setViewMode(id)}
      className="px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap"
      style={{
        background: viewMode === id ? '#007AFF' : 'transparent',
        color: viewMode === id ? '#fff' : 'rgba(255,255,255,0.5)',
        border: viewMode === id ? 'none' : '1px solid transparent',
        minHeight: '44px'
      }}>
      {label}
    </button>
  )

  /* ── Not connected ─────────── */
  if (!isConnected) {
    return (
      <div className="relative">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Opgaver</h1>
        <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>Opgavestyring og realtidsoverblik</p>
        <div className="card text-center py-12">
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
              <TabBtn id="kanban" label="Kanban" />
              <TabBtn id="livefeed" label="Live Feed" />
              <TabBtn id="historik" label="Historik" />
              <TabBtn id="visuel" label="Visuel" />
            </div>
          </div>
        </div>
      </div>
      <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {tasks.length} sessions · {active.length} aktive · opdateres hvert 3. sekund
        {isLoading && <span className="ml-2 text-blue-400">synkroniserer...</span>}
      </p>

      {/* ── Kanban View ─────────── */}
      {viewMode === 'kanban' && (
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
          <div className="flex gap-5 overflow-x-auto pb-4">
            <Column title="Kø" count={queued.length} color="bg-yellow-400" tasks={queued} />
            <Column title="Aktiv" count={active.length} color="bg-blue-500" tasks={active} />
            <Column title="Afsluttet" count={completed.length} color="bg-green-500" tasks={completed} />
          </div>
        </>
      )}

      {/* ── Live Feed ─────────── */}
      {viewMode === 'livefeed' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-white/60">Live — opdateres automatisk</span>
          </div>
          {tasks.map(task => {
            const lastMsg = extractLastMessage(task)
            return (
              <div key={task.id} onClick={() => setSelectedTask(task)}
                className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.02)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                <StatusDot status={task.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{task.title}</span>
                    <KindBadge kind={task.kind} />
                  </div>
                  {lastMsg && <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{lastMsg}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] font-medium" style={{ color: task.status === 'active' ? '#007AFF' : 'rgba(52,199,89,0.8)' }}>
                    {task.status === 'active' ? 'Aktiv' : 'Afsluttet'}
                  </p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(task.updated)}</p>
                </div>
              </div>
            )
          })}
          {tasks.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen sessions</div>
          )}
        </div>
      )}

      {/* ── Historik ─────────── */}
      {viewMode === 'historik' && (
        <div className="space-y-2">
          {completed.length > 0 ? completed.map(task => (
            <div key={task.id} onClick={() => setSelectedTask(task)}
              className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.02)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
              <StatusDot status="completed" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white truncate">{task.title}</span>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{task.model.split('/').pop()}</p>
              </div>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(task.updated)}</span>
            </div>
          )) : (
            <div className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen afsluttede opgaver</div>
          )}
        </div>
      )}

      {/* ── Visuel View ─────────── */}
      {viewMode === 'visuel' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-white/60">
              {agentActivities.filter(a => a.status === 'working').length} agenter arbejder — live visning
            </span>
          </div>
          
          {/* Working agents first, large cards */}
          {agentActivities.filter(a => a.status === 'working').length > 0 && (
            <>
              <h3 className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgba(0,122,255,0.7)' }}>Arbejder nu</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentActivities.filter(a => a.status === 'working').map(agent => (
                  <AgentVisualCard key={agent.sessionKey} agent={agent} />
                ))}
              </div>
            </>
          )}

          {/* Completed agents, smaller */}
          {agentActivities.filter(a => a.status === 'done').length > 0 && (
            <>
              <h3 className="text-xs uppercase tracking-wider font-semibold mt-6" style={{ color: 'rgba(52,199,89,0.7)' }}>Afsluttet</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {agentActivities.filter(a => a.status === 'done').map(agent => (
                  <AgentVisualCard key={agent.sessionKey} agent={agent} />
                ))}
              </div>
            </>
          )}

          {agentActivities.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen agent-aktivitet</div>
          )}
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

      {/* ── Detail Panel ─────────── */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setSelectedTask(null)} />
          <div className="fixed bottom-0 left-0 right-0 sm:right-0 sm:top-0 sm:left-auto sm:bottom-auto h-[85vh] sm:h-full w-full sm:w-[480px] z-50 overflow-y-auto rounded-t-2xl sm:rounded-none"
            style={{ background: 'rgba(20,20,24,0.98)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base sm:text-lg font-bold text-white truncate pr-2">{selectedTask.title}</h2>
                <button onClick={() => setSelectedTask(null)} className="w-11 h-11 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                  <Icon name="xmark" size={14} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Status</p>
                    <div className="flex items-center gap-2"><StatusDot status={selectedTask.status} size={6} /><span className="text-sm text-white">{selectedTask.status === 'active' ? 'Aktiv' : selectedTask.status === 'completed' ? 'Afsluttet' : 'I kø'}</span></div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Type</p>
                    <KindBadge kind={selectedTask.kind} />
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Model</p>
                    <p className="text-sm text-white">{selectedTask.model.split('/').pop()}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Kanal</p>
                    <p className="text-sm text-white">{selectedTask.channel}</p>
                  </div>
                </div>
                {selectedTask.contextTokens && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Token Forbrug</p>
                    <p className="text-2xl font-bold text-white">{(selectedTask.contextTokens / 1000).toFixed(1)}K</p>
                  </div>
                )}
                {extractLastMessage(selectedTask) && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Seneste aktivitet</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{extractLastMessage(selectedTask)}</p>
                  </div>
                )}
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Session</p>
                  <p className="text-xs font-mono text-white/50">{selectedTask.sessionId}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
