import { useState, useMemo } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { createAgent, ApiSession } from '../api/openclaw'

interface Task {
  id: string
  title: string
  status: 'queued' | 'active' | 'completed'
  agent: string
  model: string
  created: Date
  updated: Date
  sessionId: string
  channel: string
  contextTokens?: number
  totalTokens?: number
}

const priorityConfig = {
  critical: { label: 'Kritisk', color: 'text-red-400', bg: 'rgba(255,59,48,0.1)', dot: 'bg-red-500' },
  high: { label: 'Høj', color: 'text-orange-400', bg: 'rgba(255,149,0,0.1)', dot: 'bg-orange-500' },
  normal: { label: 'Normal', color: 'text-blue-400', bg: 'rgba(0,122,255,0.1)', dot: 'bg-blue-500' },
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

export default function Tasks() {
  const { sessions, isLoading, isConnected } = useLiveData()
  const [viewMode, setViewMode] = useState<'kanban' | 'livefeed' | 'historik'>('kanban')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', task: '', model: 'anthropic/claude-sonnet-4-5' })
  const [isCreating, setIsCreating] = useState(false)

  // Map sessions to tasks
  const tasks: Task[] = useMemo(() => {
    return sessions
      .filter(s => s.kind === 'subagent')
      .map(s => ({
        id: s.sessionId,
        title: s.label || s.displayName || 'Unavngiven opgave',
        status: 'active' as const, // All subagent sessions are considered active
        agent: s.displayName,
        model: s.model,
        created: new Date(s.updatedAt), // Use updatedAt as created for now
        updated: new Date(s.updatedAt),
        sessionId: s.sessionId,
        channel: s.channel,
        contextTokens: s.contextTokens,
        totalTokens: s.totalTokens,
      }))
  }, [sessions])

  const models = [...new Set(tasks.map(t => t.model))]

  const filtered = tasks.filter(t => {
    if (filterModel && t.model !== filterModel) return false
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const queued = filtered.filter(t => t.status === 'queued')
  const active = filtered.filter(t => t.status === 'active')
  const completed = filtered.filter(t => t.status === 'completed')

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
      console.error('Fejl ved oprettelse af opgave:', error)
      alert('Kunne ikke oprette opgave. Tjek konsollen for detaljer.')
    } finally {
      setIsCreating(false)
    }
  }

  const TaskCard = ({ task }: { task: Task }) => {
    const progress = task.contextTokens && task.totalTokens 
      ? Math.round((task.contextTokens / task.totalTokens) * 100) 
      : undefined

    return (
      <div
        onClick={() => setSelectedTask(task)}
        className="glass-task-card group cursor-pointer"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'active' ? 'bg-blue-500 animate-pulse' : task.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <h4 className="text-sm font-semibold text-white truncate">{task.title}</h4>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.channel}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.model}</span>
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
        <p className="text-[11px] mb-3 line-clamp-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Session ID: {task.sessionId.slice(0, 8)}...
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Icon name="timer" size={12} />
            <span>{timeAgo(task.updated)}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={e => { e.stopPropagation(); setSelectedTask(task) }} 
              className="w-6 h-6 flex items-center justify-center rounded-lg text-white/50" 
              style={{ background: 'rgba(255,255,255,0.06)' }} 
              title="Detaljer"
            >
              <Icon name="chevron-right" size={12} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const Column = ({ title, count, color, tasks: columnTasks, status }: { title: string; count: number; color: string; tasks: Task[]; status: 'queued' | 'active' | 'completed' }) => (
    <div className="flex-1 min-w-[300px]">
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <h3 className="text-sm font-semibold" style={{ color: '#ffffff' }}>{title}</h3>
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
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Icon name="plus" size={14} />
            Opret Opgave
          </button>
          <div className="glass-toggle-group flex items-center">
            {(['kanban', 'livefeed', 'historik'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 text-sm font-medium rounded-xl transition-all ${viewMode === m ? 'glass-toggle-active text-white' : 'text-white/50'}`}>
                {m === 'kanban' ? 'Kanban' : m === 'livefeed' ? 'Live Feed' : 'Historik'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="caption mb-5">Opgavestyring og realtidsoverblik</p>

      {viewMode === 'kanban' && (
        <>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <select value={filterModel} onChange={e => setFilterModel(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle modeller</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"><Icon name="magnifying-glass" size={14} /></span>
              <input type="text" placeholder="Søg efter opgave..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input text-xs py-1.5 w-48 pl-8" />
            </div>
            {isLoading && (
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Opdaterer...</span>
            )}
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4">
            <Column title="Kø" count={queued.length} color="bg-yellow-400" tasks={queued} status="queued" />
            <Column title="Aktiv" count={active.length} color="bg-blue-500" tasks={active} status="active" />
            <Column title="Afsluttet" count={completed.length} color="bg-green-500" tasks={completed} status="completed" />
          </div>
        </>
      )}

      {viewMode === 'livefeed' && (
        <div className="card text-center py-12">
          <Icon name="info-circle" size={48} className="text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Live Feed kommer snart</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Denne funktion er under udvikling
          </p>
        </div>
      )}

      {viewMode === 'historik' && (
        <div className="card text-center py-12">
          <Icon name="info-circle" size={48} className="text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Historik kommer snart</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Denne funktion er under udvikling
          </p>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 glass-overlay z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] glass-panel z-50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#ffffff' }}>Opret Ny Opgave</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                <Icon name="xmark" size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>Opgavenavn</label>
                <input 
                  type="text" 
                  value={createForm.name} 
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="f.eks. Byg landingsside"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>Opgavebeskrivelse</label>
                <textarea 
                  value={createForm.task} 
                  onChange={e => setCreateForm(prev => ({ ...prev, task: e.target.value }))}
                  placeholder="Beskriv opgaven i detaljer..."
                  rows={4}
                  className="input w-full resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>Model</label>
                <select 
                  value={createForm.model} 
                  onChange={e => setCreateForm(prev => ({ ...prev, model: e.target.value }))}
                  className="input w-full"
                >
                  <option value="anthropic/claude-sonnet-4-5">Claude Sonnet 4.5</option>
                  <option value="anthropic/claude-opus-4-6">Claude Opus 4.6</option>
                  <option value="anthropic/claude-haiku-4-3">Claude Haiku 4.3</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl flex-1" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  disabled={isCreating}
                >
                  Annuller
                </button>
                <button 
                  onClick={handleCreateTask}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={isCreating || !createForm.name || !createForm.task}
                >
                  {isCreating ? (
                    <>
                      <Icon name="spinner" size={14} className="animate-spin" />
                      Opretter...
                    </>
                  ) : (
                    <>
                      <Icon name="plus" size={14} />
                      Opret Opgave
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Side Panel */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 glass-overlay z-50" onClick={() => setSelectedTask(null)} />
          <div className="fixed right-0 top-0 h-full w-[480px] glass-panel z-50 overflow-y-auto animate-slide-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{ color: '#ffffff' }}>{selectedTask.title}</h2>
                <button onClick={() => setSelectedTask(null)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                  <Icon name="xmark" size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Status</p>
                  <span className={`badge ${selectedTask.status === 'active' ? 'text-blue-400' : selectedTask.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`} style={{ background: selectedTask.status === 'active' ? 'rgba(0,122,255,0.1)' : selectedTask.status === 'completed' ? 'rgba(52,199,89,0.1)' : 'rgba(255,149,0,0.1)' }}>
                    {selectedTask.status === 'queued' ? 'I kø' : selectedTask.status === 'active' ? 'Aktiv' : 'Afsluttet'}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Model</p>
                  <p className="text-sm font-medium">{selectedTask.model}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Agent</p>
                  <p className="text-sm font-medium">{selectedTask.agent}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Kanal</p>
                  <p className="text-sm font-medium">{selectedTask.channel}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Session ID</p>
                  <p className="text-sm font-mono">{selectedTask.sessionId}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Senest opdateret</p>
                  <p className="text-sm">{formatDate(selectedTask.updated)}</p>
                </div>
                {selectedTask.contextTokens && selectedTask.totalTokens && (
                  <>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Context Tokens</p>
                      <p className="text-sm font-medium">{selectedTask.contextTokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Tokens</p>
                      <p className="text-sm font-medium">{selectedTask.totalTokens.toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>

              {selectedTask.contextTokens && selectedTask.totalTokens && (
                <div className="mb-6">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-blue-400">Token forbrug</span>
                    <span className="text-sm font-bold text-blue-400">
                      {Math.round((selectedTask.contextTokens / selectedTask.totalTokens) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,122,255,0.1)' }}>
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all" 
                      style={{ width: `${Math.round((selectedTask.contextTokens / selectedTask.totalTokens) * 100)}%` }} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
