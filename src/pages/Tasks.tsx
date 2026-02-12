import { useState, useMemo } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { createAgent, ApiSession } from '../api/openclaw'

interface Task {
  id: string
  title: string
  status: 'queued' | 'active' | 'completed'
  kind: string
  agent: string
  model: string
  created: Date
  updated: Date
  sessionId: string
  channel: string
  contextTokens?: number
  totalTokens?: number
  label?: string
}

function timeAgo(date: Date): string {
  const now = new Date()
  const mins = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (mins < 1) return 'lige nu'
  if (mins < 60) return `${mins}m siden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}t siden`
  const days = Math.floor(hours / 24)
  return `${days}d siden`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function sessionToTask(s: ApiSession): Task {
  // Determine status based on session properties
  let status: 'queued' | 'active' | 'completed' = 'active'
  
  // Sessions with recent activity (last 5 min) are active, older ones are completed
  const updatedAt = new Date(s.updatedAt)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  
  if (s.kind === 'subagent') {
    // Sub-agents that haven't been updated recently are likely completed
    status = updatedAt > fiveMinAgo ? 'active' : 'completed'
  } else {
    // Main session is always "active"
    status = 'active'
  }

  // Build a readable title
  let title = s.label || s.displayName || 'Unavngiven'
  if (s.kind === 'main') title = 'Hovedsession — Telegram'

  return {
    id: s.sessionId,
    title,
    status,
    kind: s.kind,
    agent: s.displayName,
    model: s.model,
    created: updatedAt,
    updated: updatedAt,
    sessionId: s.sessionId,
    channel: s.lastChannel || s.channel,
    contextTokens: s.contextTokens,
    totalTokens: s.totalTokens,
    label: s.label,
  }
}

export default function Tasks() {
  const { sessions, isLoading, isConnected } = useLiveData()
  const [viewMode, setViewMode] = useState<'kanban' | 'livefeed' | 'historik'>('kanban')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKind, setFilterKind] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', task: '', model: 'anthropic/claude-sonnet-4-5' })
  const [isCreating, setIsCreating] = useState(false)

  // Map ALL sessions to tasks
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

  // For Live Feed: show all sessions sorted by most recent
  const liveFeedItems = useMemo(() => {
    return tasks.sort((a, b) => b.updated.getTime() - a.updated.getTime())
  }, [tasks])

  // For Historik: show completed tasks
  const historikItems = useMemo(() => {
    return tasks.filter(t => t.status === 'completed' || t.kind === 'subagent')
      .sort((a, b) => b.updated.getTime() - a.updated.getTime())
  }, [tasks])

  async function handleCreateTask() {
    if (!createForm.name || !createForm.task) return
    setIsCreating(true)
    try {
      await createAgent({
        name: createForm.name,
        task: createForm.task,
        model: createForm.model,
        label: createForm.name,
      })
      setShowCreateModal(false)
      setCreateForm({ name: '', task: '', model: 'anthropic/claude-sonnet-4-5' })
    } catch (error) {
      console.error('Fejl ved oprettelse:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const KindBadge = ({ kind }: { kind: string }) => {
    const config: Record<string, { label: string; color: string; bg: string }> = {
      main: { label: 'Hoved', color: 'text-blue-400', bg: 'rgba(0,122,255,0.1)' },
      subagent: { label: 'Sub-agent', color: 'text-purple-400', bg: 'rgba(175,82,222,0.1)' },
      isolated: { label: 'Isoleret', color: 'text-orange-400', bg: 'rgba(255,149,0,0.1)' },
    }
    const c = config[kind] || { label: kind, color: 'text-white/50', bg: 'rgba(255,255,255,0.05)' }
    return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.color}`} style={{ background: c.bg }}>{c.label}</span>
  }

  const StatusDot = ({ status }: { status: string }) => (
    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
      status === 'active' ? 'bg-blue-500 animate-pulse' : 
      status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
    }`} />
  )

  const TaskCard = ({ task }: { task: Task }) => {
    const progress = task.contextTokens && task.totalTokens 
      ? Math.min(Math.round((task.contextTokens / task.totalTokens) * 100), 100) 
      : undefined

    return (
      <div onClick={() => setSelectedTask(task)} className="glass-task-card group cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <StatusDot status={task.status} />
            <h4 className="text-sm font-semibold text-white truncate">{task.title}</h4>
          </div>
          <KindBadge kind={task.kind} />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.channel}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.model.split('/').pop()}</span>
        </div>
        {task.status === 'active' && progress !== undefined && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-blue-400 font-medium">Behandler...</span>
              <span className="text-[11px] font-semibold text-blue-400">{progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,122,255,0.1)' }}>
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Icon name="timer" size={12} />
            <span>{timeAgo(task.updated)}</span>
          </div>
          {task.contextTokens && (
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {(task.contextTokens / 1000).toFixed(0)}K tokens
            </span>
          )}
        </div>
      </div>
    )
  }

  const Column = ({ title, count, color, tasks: columnTasks }: { title: string; count: number; color: string; tasks: Task[] }) => (
    <div className="flex-1 min-w-[300px]">
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>{count}</span>
      </div>
      <div className="space-y-3 min-h-[200px] p-2 glass-column">
        {columnTasks.map(task => <TaskCard key={task.id} task={task} />)}
        {columnTasks.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen opgaver</div>
        )}
      </div>
    </div>
  )

  const LiveFeedRow = ({ task }: { task: Task }) => (
    <div onClick={() => setSelectedTask(task)} className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.02)' }} 
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}>
      <StatusDot status={task.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{task.title}</span>
          <KindBadge kind={task.kind} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.model.split('/').pop()}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.channel}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[11px] font-medium" style={{ color: task.status === 'active' ? '#007AFF' : 'rgba(52,199,89,0.8)' }}>
          {task.status === 'active' ? 'Aktiv' : 'Afsluttet'}
        </div>
        <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(task.updated)}</div>
      </div>
    </div>
  )

  if (!isConnected) {
    return (
      <div className="relative">
        <h1 className="page-title">Opgaver</h1>
        <p className="caption mb-5">Opgavestyring og realtidsoverblik</p>
        <div className="card text-center py-12">
          <Icon name="exclamation-triangle" size={48} className="text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen forbindelse til Gateway</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Gå til Indstillinger for at konfigurere Gateway forbindelse
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <h1 className="page-title">Opgaver</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm flex items-center gap-2">
            <Icon name="plus" size={14} />
            Opret Opgave
          </button>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['kanban', 'livefeed', 'historik'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} 
                className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
                style={{ 
                  background: viewMode === m ? 'rgba(0,122,255,0.2)' : 'transparent',
                  color: viewMode === m ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: viewMode === m ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent'
                }}>
                {m === 'kanban' ? 'Kanban' : m === 'livefeed' ? 'Live Feed' : 'Historik'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="caption mb-5">Opgavestyring og realtidsoverblik — {tasks.length} sessions i alt</p>

      {viewMode === 'kanban' && (
        <>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <select value={filterKind} onChange={e => setFilterKind(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle typer</option>
              {kinds.map(k => <option key={k} value={k}>{k === 'main' ? 'Hoved' : k === 'subagent' ? 'Sub-agent' : k}</option>)}
            </select>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"><Icon name="magnifying-glass" size={14} /></span>
              <input type="text" placeholder="Søg efter opgave..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input text-xs py-1.5 w-48 pl-8" />
            </div>
            {isLoading && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Opdaterer...</span>}
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4">
            <Column title="Kø" count={queued.length} color="bg-yellow-400" tasks={queued} />
            <Column title="Aktiv" count={active.length} color="bg-blue-500" tasks={active} />
            <Column title="Afsluttet" count={completed.length} color="bg-green-500" tasks={completed} />
          </div>
        </>
      )}

      {viewMode === 'livefeed' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-white">Live Sessions</h3>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Opdateres hvert 10. sekund</span>
          </div>
          <div className="space-y-1">
            {liveFeedItems.length > 0 ? (
              liveFeedItems.map(task => <LiveFeedRow key={task.id} task={task} />)
            ) : (
              <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Ingen aktive sessions
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'historik' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="timer" size={16} className="text-white/40" />
            <h3 className="text-sm font-semibold text-white">Opgavehistorik</h3>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{historikItems.length} opgaver</span>
          </div>
          <div className="space-y-1">
            {historikItems.length > 0 ? (
              historikItems.map(task => <LiveFeedRow key={task.id} task={task} />)
            ) : (
              <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Ingen afsluttede opgaver endnu
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowCreateModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] z-50 p-6 rounded-2xl" 
            style={{ background: 'rgba(28,28,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Opret Ny Opgave</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full" 
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                <Icon name="xmark" size={14} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Opgavenavn</label>
                <input type="text" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="f.eks. Fix CSS dark mode" className="input w-full" />
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
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                  Annuller
                </button>
                <button onClick={handleCreateTask} disabled={isCreating || !createForm.name || !createForm.task}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {isCreating ? 'Opretter...' : 'Opret Opgave'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Side Panel */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setSelectedTask(null)} />
          <div className="fixed right-0 top-0 h-full w-[480px] z-50 overflow-y-auto"
            style={{ background: 'rgba(20,20,24,0.98)', borderLeft: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{selectedTask.title}</h2>
                <button onClick={() => setSelectedTask(null)} className="w-8 h-8 flex items-center justify-center rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                  <Icon name="xmark" size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Status</p>
                  <div className="flex items-center gap-2">
                    <StatusDot status={selectedTask.status} />
                    <span className="text-sm font-medium text-white">
                      {selectedTask.status === 'queued' ? 'I kø' : selectedTask.status === 'active' ? 'Aktiv' : 'Afsluttet'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Type</p>
                  <KindBadge kind={selectedTask.kind} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Model</p>
                  <p className="text-sm font-medium text-white">{selectedTask.model}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Kanal</p>
                  <p className="text-sm font-medium text-white">{selectedTask.channel}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Session ID</p>
                  <p className="text-xs font-mono text-white/70">{selectedTask.sessionId}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Opdateret</p>
                  <p className="text-sm text-white">{formatDate(selectedTask.updated)}</p>
                </div>
              </div>
              {selectedTask.contextTokens && (
                <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Token Forbrug</p>
                  <p className="text-2xl font-bold text-white">{(selectedTask.contextTokens / 1000).toFixed(1)}K</p>
                  {selectedTask.totalTokens && (
                    <div className="mt-2">
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,122,255,0.1)' }}>
                        <div className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${Math.min(Math.round((selectedTask.contextTokens / selectedTask.totalTokens) * 100), 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
