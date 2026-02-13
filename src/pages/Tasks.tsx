import { useState, useMemo, useEffect } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { 
  createAgent, 
  ApiSession, 
  fetchAllSessions, 
  readTranscriptMessages, 
  TranscriptSession,
  DetailedSessionMessage, 
  ToolCall 
} from '../api/openclaw'

/* ── Types ───────────────────────────────────── */
interface Task {
  id: string
  title: string
  status: 'queued' | 'active' | 'completed'
  kind: string
  agent: string
  model: string
  updated: Date
  sessionKey?: string
  sessionId: string
  channel: string
  contextTokens?: number
  totalTokens?: number
  messageCount: number
  firstMessage?: string
  label?: string
  spawnedBy?: string
}

/* ── Helpers ─────────────────────────────────── */
const CACHE_KEY_SESSIONS = 'openclaw-all-sessions'

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return 'lige nu'
  if (mins < 60) return `${mins}m siden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}t siden`
  return `${Math.floor(hours / 24)}d siden`
}

function timeUntil(date: Date): string {
  const mins = Math.floor((date.getTime() - Date.now()) / 60000)
  if (mins < 0) return 'Nu'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}t`
  return `${Math.floor(hours / 24)}d`
}

function transcriptToTask(s: TranscriptSession): Task {
  const updatedAt = s.updatedAt ? new Date(s.updatedAt) : new Date()
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  
  let status: 'queued' | 'active' | 'completed' = 'completed'
  
  if (s.messageCount === 0) {
    status = 'queued'
  } else if (updatedAt > fiveMinAgo || s.status === 'active') {
    status = 'active'
  }

  let title = s.label || `${s.agent}/${s.sessionId.substring(0, 8)}`

  return {
    id: s.sessionId,
    title,
    status,
    kind: s.agent === 'main' ? 'main' : 'subagent',
    agent: s.agent,
    model: s.model || 'unknown',
    updated: updatedAt,
    sessionId: s.sessionId,
    channel: 'transcript',
    messageCount: s.messageCount,
    firstMessage: s.firstMessage,
    label: s.label,
    spawnedBy: s.spawnedBy,
  }
}

function liveSessionToTask(s: ApiSession): Task {
  const updatedAt = new Date(s.updatedAt)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  
  let status: 'queued' | 'active' | 'completed' = 'completed'
  
  if (s.kind === 'subagent') {
    const hasActivity = s.lastMessages && s.lastMessages.length > 0
    if (!hasActivity) {
      status = 'queued'
    } else if (updatedAt > fiveMinAgo) {
      status = 'active'
    }
  } else if (updatedAt > fiveMinAgo) {
    status = 'active'
  }

  let title = s.label || s.displayName || 'Unavngiven'
  if (s.kind === 'main') title = 'Hovedsession'

  const msgCount = s.lastMessages?.length || 0
  const firstMsg = s.lastMessages?.[0]?.text || s.lastMessages?.[0]?.content || ''

  return {
    id: s.sessionId,
    title,
    status,
    kind: s.kind,
    agent: s.kind,
    model: s.model,
    updated: updatedAt,
    sessionKey: s.key,
    sessionId: s.sessionId,
    channel: s.lastChannel || s.channel,
    contextTokens: s.contextTokens,
    totalTokens: s.totalTokens,
    messageCount: msgCount,
    firstMessage: typeof firstMsg === 'string' ? firstMsg : '',
    label: s.label,
  }
}

function getAgentIcon(kind: string): string {
  if (kind === 'main') return 'brain'
  if (kind === 'subagent') return 'robot'
  return 'sparkle'
}

function getKindColor(kind: string): string {
  if (kind === 'main') return '#007AFF'
  if (kind === 'subagent') return '#AF52DE'
  return '#FF9F0A'
}

/* ── Stats Card ──────────────────────────────── */
function StatsCard({ 
  title, 
  value, 
  color, 
  icon, 
  onClick 
}: { 
  title: string
  value: number | string
  color: string
  icon: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-6 ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${color}20`,
      }}
      onMouseEnter={onClick ? e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 24px ${color}30`
      } : undefined}
      onMouseLeave={onClick ? e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      } : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon name={icon} size={20} style={{ color }} />
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white mb-1">{value}</div>
          <div className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {title}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Task Modal ──────────────────────────────── */
function TaskModal({ task, onClose, onStart }: { task: Task | null; onClose: () => void; onStart?: (task: Task, workType: string) => void }) {
  const [sessionHistory, setSessionHistory] = useState<DetailedSessionMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedWorkType, setSelectedWorkType] = useState<string>('')

  useEffect(() => {
    if (!task) return
    
    setLoadingHistory(true)
    readTranscriptMessages(task.agent, task.sessionId, 100)
      .then(msgs => setSessionHistory(msgs))
      .catch(err => {
        console.error('Failed to load history:', err)
        setSessionHistory([])
      })
      .finally(() => setLoadingHistory(false))
  }, [task?.agent, task?.sessionId])

  if (!task) return null

  const statusColors = {
    queued: '#FF9F0A',
    active: '#007AFF',
    completed: '#30D158',
  }

  const color = statusColors[task.status]

  const workTypes = ['Building', 'Deep Work', 'Research', 'Review', 'Planning']

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose} />
      <div 
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] z-50 overflow-y-auto rounded-2xl"
        style={{
          background: 'rgba(10,10,15,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${getKindColor(task.kind)}20` }}
              >
                <Icon name={getAgentIcon(task.kind)} size={20} style={{ color: getKindColor(task.kind) }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate mb-1">{task.title}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs font-semibold" style={{ color }}>
                    {task.status === 'queued' ? 'I Kø' : task.status === 'active' ? 'Aktiv' : 'Afsluttet'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <Icon name="xmark" size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* I Kø Section */}
          {task.status === 'queued' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-white mb-2">Hvilken type arbejde?</p>
                <div className="grid grid-cols-2 gap-2">
                  {workTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedWorkType(type)}
                      className="px-4 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: selectedWorkType === type ? '#007AFF' : 'rgba(255,255,255,0.03)',
                        color: selectedWorkType === type ? '#fff' : 'rgba(255,255,255,0.7)',
                        border: `1px solid ${selectedWorkType === type ? '#007AFF' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => onStart?.(task, selectedWorkType)}
                disabled={!selectedWorkType}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ 
                  background: selectedWorkType ? 'linear-gradient(135deg, #007AFF, #AF52DE)' : 'rgba(255,255,255,0.1)',
                  opacity: selectedWorkType ? 1 : 0.5,
                  cursor: selectedWorkType ? 'pointer' : 'not-allowed',
                }}
              >
                Start Opgave
              </button>
            </div>
          )}

          {/* Afsluttet Section */}
          {task.status === 'completed' && (
            <div>
              <p className="text-sm font-semibold text-white mb-3">Opgave Detaljer</p>
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Agent</span>
                  <span className="text-white/70">{task.agent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Beskeder</span>
                  <span className="text-white/70">{task.messageCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Model</span>
                  <span className="text-white/70">{task.model.split('/').pop()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Afsluttet</span>
                  <span className="text-white/70">{timeAgo(task.updated)}</span>
                </div>
              </div>

              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-2" style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} />
                  <p className="text-xs text-white/40">Indlæser historik...</p>
                </div>
              ) : sessionHistory.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-white mb-2">Ændringer</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {sessionHistory.filter(msg => msg.role === 'assistant' && msg.text).map((msg, idx) => (
                      <div key={idx} className="rounded-lg p-3 text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-white/70 whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aktiv Section */}
          {task.status === 'active' && (
            <div>
              <p className="text-sm font-semibold text-white mb-3">Aktiv Opgave</p>
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#007AFF' }} />
                  <span className="text-sm text-white/70">Opgaven kører...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Beskeder</span>
                  <span className="text-white/70">{task.messageCount}</span>
                </div>
                {task.contextTokens && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Context</span>
                    <span className="text-white/70">{(task.contextTokens / 1000).toFixed(0)}K tokens</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Sidst opdateret</span>
                  <span className="text-white/70">{timeAgo(task.updated)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Create Modal ────────────────────────────── */
function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [task, setTask] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || !task.trim()) return
    setCreating(true)
    try {
      await createAgent({ 
        name: name.trim(), 
        task: task.trim(), 
        model: 'sonnet', 
        label: name.trim().toLowerCase().replace(/\s+/g, '-') 
      })
      onClose()
      setName('')
      setTask('')
    } catch (e) {
      console.error('Fejl ved oprettelse:', e)
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose} />
      <div 
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-6 rounded-2xl"
        style={{ background: 'rgba(20,20,24,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Opret Opgave</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Icon name="xmark" size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Navn</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="f.eks. Byg ny feature"
              className="w-full px-4 py-2 rounded-xl text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Opgavebeskrivelse</label>
            <textarea 
              value={task} 
              onChange={e => setTask(e.target.value)}
              placeholder="Beskriv opgaven i detaljer..."
              rows={4}
              className="w-full px-4 py-2 rounded-xl text-sm text-white resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
            />
          </div>
          
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !task.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{ 
              background: creating || !name.trim() || !task.trim() ? 'rgba(0,122,255,0.3)' : 'linear-gradient(135deg, #007AFF, #AF52DE)',
              opacity: creating || !name.trim() || !task.trim() ? 0.6 : 1 
            }}
          >
            {creating ? 'Opretter...' : 'Opret Opgave'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Main Page ──────────────────────────────── */
export default function Tasks() {
  const { sessions } = useLiveData()
  const [allSessions, setAllSessions] = useState<TranscriptSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY_SESSIONS)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setAllSessions(parsed)
      } catch (e) {
        console.error('Failed to parse cached sessions:', e)
      }
    }

    setLoading(true)
    fetchAllSessions()
      .then(sessions => {
        setAllSessions(sessions)
        localStorage.setItem(CACHE_KEY_SESSIONS, JSON.stringify(sessions))
      })
      .catch(err => {
        console.error('Failed to fetch all sessions:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  const tasks: Task[] = useMemo(() => {
    const transcriptTasks = allSessions.map(transcriptToTask)
    const liveTasks = sessions.map(liveSessionToTask)
    
    const mergedMap = new Map<string, Task>()
    
    for (const t of transcriptTasks) {
      mergedMap.set(t.sessionId, t)
    }
    
    for (const t of liveTasks) {
      const existing = mergedMap.get(t.sessionId)
      if (existing) {
        mergedMap.set(t.sessionId, { ...existing, ...t, sessionKey: t.sessionKey })
      } else {
        mergedMap.set(t.sessionId, t)
      }
    }
    
    return Array.from(mergedMap.values()).sort((a, b) => b.updated.getTime() - a.updated.getTime())
  }, [sessions, allSessions])

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks
    const query = searchQuery.toLowerCase()
    return tasks.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.agent.toLowerCase().includes(query) ||
      t.firstMessage?.toLowerCase().includes(query)
    )
  }, [tasks, searchQuery])

  const queued = filteredTasks.filter(t => t.status === 'queued')
  const active = filteredTasks.filter(t => t.status === 'active')
  const completed = filteredTasks.filter(t => t.status === 'completed')

  // Bandwidth calculation (mock for now)
  const bandwidth = Math.round((sessions.reduce((sum, s) => sum + (s.contextTokens || 0), 0) / 200000) * 100)

  // Next task time (mock - find next queued task)
  const nextTask = queued[0]
  const nextTaskTime = nextTask ? `${timeUntil(nextTask.updated)}` : 'Ingen'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">Opgaver</h1>
        
        {/* Search & Actions */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Icon name="magnifying-glass" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Søg opgaver..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white"
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.06)',
                outline: 'none',
              }}
            />
          </div>
          
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #007AFF, #AF52DE)' }}
          >
            <Icon name="plus" size={16} />
            Opret
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="I Kø" value={queued.length} color="#FF9F0A" icon="clock" />
          <StatsCard title="Aktive" value={active.length} color="#007AFF" icon="bolt" />
          <StatsCard title="Afsluttet" value={completed.length} color="#30D158" icon="checkmark-circle" />
          <StatsCard title="Bandwidth" value={`${bandwidth}%`} color="#AF52DE" icon="chart-bar" />
        </div>

        {/* Activity Status */}
        <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#30D158' }} />
            <span className="text-sm text-white/70">System aktiv</span>
          </div>
          <div className="text-xs text-white/40">
            Næste opgave: <span className="text-white/70 font-semibold">{nextTaskTime}</span>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-2" style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} />
            <p className="text-sm text-white/40">Indlæser opgaver...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="doc" size={32} className="mx-auto mb-2 text-white/10" />
            <p className="text-sm text-white/40">Ingen opgaver fundet</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const statusColors = {
              queued: '#FF9F0A',
              active: '#007AFF',
              completed: '#30D158',
            }
            const color = statusColors[task.status]
            
            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="rounded-2xl p-4 cursor-pointer transition-all"
                style={{ background: 'rgba(255,255,255,0.03)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${getKindColor(task.kind)}20` }}
                  >
                    <Icon name={getAgentIcon(task.kind)} size={18} style={{ color: getKindColor(task.kind) }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white mb-1 truncate">{task.title}</h3>
                    <p className="text-xs text-white/40 truncate">{task.firstMessage || 'Ingen beskrivelse'}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-white/30">{timeAgo(task.updated)}</span>
                    <div 
                      className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{ background: `${color}20`, color }}
                    >
                      {task.status === 'queued' ? 'Kø' : task.status === 'active' ? 'Aktiv' : 'Afsluttet'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <TaskModal 
        task={selectedTask} 
        onClose={() => setSelectedTask(null)}
        onStart={(task, workType) => {
          console.log('Starting task:', task.title, 'with type:', workType)
          setSelectedTask(null)
        }}
      />
      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
