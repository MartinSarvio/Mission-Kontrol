import { useState, useMemo, useEffect } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { 
  createAgent, 
  invokeToolRaw,
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
  category?: string
  scheduledAt?: string
}

type TaskCategory = 'building' | 'deep-work' | 'research' | 'maintenance' | 'review' | 'other'

const CATEGORIES: { id: TaskCategory; label: string; color: string; icon: string }[] = [
  { id: 'building', label: 'Building', color: '#007AFF', icon: 'wrench' },
  { id: 'deep-work', label: 'Deep Work', color: '#AF52DE', icon: 'brain' },
  { id: 'research', label: 'Research', color: '#30D158', icon: 'magnifying-glass' },
  { id: 'maintenance', label: 'Vedligehold', color: '#FF9F0A', icon: 'gear' },
  { id: 'review', label: 'Review', color: '#FF375F', icon: 'doc-text' },
  { id: 'other', label: 'Andet', color: '#8E8E93', icon: 'sparkle' },
]

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

function transcriptToTask(s: TranscriptSession): Task {
  const updatedAt = s.updatedAt ? new Date(s.updatedAt) : new Date()
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  
  let status: 'queued' | 'active' | 'completed' = 'completed'
  if (s.messageCount === 0) {
    status = 'queued'
  } else if (updatedAt > fiveMinAgo || s.status === 'active') {
    status = 'active'
  }

  return {
    id: s.sessionId,
    title: s.label || `${s.agent}/${s.sessionId.substring(0, 8)}`,
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
    if (!hasActivity) status = 'queued'
    else if (updatedAt > fiveMinAgo) status = 'active'
  } else if (updatedAt > fiveMinAgo) {
    status = 'active'
  }

  return {
    id: s.sessionId,
    title: s.label || s.displayName || (s.kind === 'main' ? 'Hovedsession' : 'Unavngiven'),
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
    messageCount: s.lastMessages?.length || 0,
    firstMessage: typeof (s.lastMessages?.[0]?.text || s.lastMessages?.[0]?.content) === 'string' 
      ? (s.lastMessages?.[0]?.text || s.lastMessages?.[0]?.content) as string : '',
    label: s.label,
  }
}

function getKindColor(kind: string): string {
  if (kind === 'main') return '#007AFF'
  if (kind === 'subagent') return '#AF52DE'
  return '#FF9F0A'
}

function getAgentIcon(kind: string): string {
  if (kind === 'main') return 'brain'
  if (kind === 'subagent') return 'robot'
  return 'sparkle'
}

/* ── Stat Box ────────────────────────────────── */
function StatBox({ label, value, color, icon, onClick }: { 
  label: string; value: number; color: string; icon: string; onClick?: () => void 
}) {
  return (
    <div 
      className="rounded-xl p-5 cursor-pointer transition-all duration-200"
      style={{ background: 'rgba(255,255,255,0.03)' }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 24px ${color}15`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon name={icon} size={18} style={{ color }} />
        </div>
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
    </div>
  )
}

/* ── Task Mini Card (in popup list) ──────────── */
function TaskMiniCard({ task, onSelect, onStart }: { task: Task; onSelect: () => void; onStart?: () => void }) {
  const catInfo = CATEGORIES.find(c => c.id === task.category) || CATEGORIES[5]
  
  return (
    <div 
      className="rounded-xl p-4 cursor-pointer transition-all duration-200"
      style={{ background: 'rgba(255,255,255,0.03)' }}
      onClick={onSelect}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" 
             style={{ background: `${getKindColor(task.kind)}15` }}>
          <Icon name={getAgentIcon(task.kind)} size={14} style={{ color: getKindColor(task.kind) }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{task.agent}</span>
            {task.firstMessage && (
              <>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{task.firstMessage.slice(0, 60)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(task.updated)}</span>
          {task.status === 'queued' && onStart && (
            <button
              onClick={e => { e.stopPropagation(); onStart() }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: '#007AFF' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0066DD' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#007AFF' }}
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Tool Call Card ──────────────────────────── */
function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [isExpanded, setIsExpanded] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,149,0,0.05)' }}>
      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <Icon name="wrench" size={14} style={{ color: '#FF9F0A' }} />
          <span className="text-sm font-medium" style={{ color: '#FF9F0A' }}>{toolCall.tool}</span>
        </div>
        <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          <pre className="text-xs p-2 rounded overflow-x-auto" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.6)' }}>
            {JSON.stringify(toolCall.args || {}, null, 2)}
          </pre>
          {toolCall.result && (
            <pre className="text-xs p-2 rounded overflow-x-auto max-h-40" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.6)' }}>
              {typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result || {}, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Status List Popup ───────────────────────── */
function StatusListPopup({ 
  title, tasks, color, onClose, onSelectTask, onStartTask 
}: { 
  title: string; tasks: Task[]; color: string; onClose: () => void; onSelectTask: (t: Task) => void; onStartTask?: (t: Task) => void 
}) {
  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose} />
      <div 
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 rounded-xl overflow-hidden"
        style={{ background: 'rgba(15,15,20,0.98)', maxHeight: '80vh' }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{tasks.length}</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <Icon name="xmark" size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto space-y-2" style={{ maxHeight: 'calc(80vh - 80px)' }}>
          {tasks.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen opgaver</p>
          ) : (
            tasks.map(t => (
              <TaskMiniCard 
                key={t.id} 
                task={t} 
                onSelect={() => { onClose(); onSelectTask(t) }} 
                onStart={onStartTask ? () => { onStartTask(t) } : undefined}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}

/* ── Detail Panel (completed tasks show changelog) ── */
function DetailPanel({ task, onClose }: { task: Task; onClose: () => void }) {
  const [sessionHistory, setSessionHistory] = useState<DetailedSessionMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    setLoadingHistory(true)
    readTranscriptMessages(task.agent, task.sessionId, 100)
      .then(msgs => setSessionHistory(msgs))
      .catch(() => setSessionHistory([]))
      .finally(() => setLoadingHistory(false))
  }, [task.agent, task.sessionId])

  const statusColors: Record<string, string> = { queued: '#FF9F0A', active: '#007AFF', completed: '#30D158' }
  const statusLabels: Record<string, string> = { queued: 'I Kø', active: 'Aktiv', completed: 'Afsluttet' }
  const color = statusColors[task.status] || '#8E8E93'

  // Extract changes from completed tasks (look for tool calls with file edits)
  const changes = useMemo(() => {
    if (task.status !== 'completed') return []
    const edits: { file: string; action: string }[] = []
    for (const msg of sessionHistory) {
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          if (tc.tool === 'Edit' || tc.tool === 'edit') {
            const file = (tc.args as any)?.file_path || (tc.args as any)?.path || 'ukendt fil'
            edits.push({ file: String(file), action: 'Redigeret' })
          } else if (tc.tool === 'Write' || tc.tool === 'write') {
            const file = (tc.args as any)?.file_path || (tc.args as any)?.path || 'ukendt fil'
            edits.push({ file: String(file), action: 'Oprettet/overskrevet' })
          } else if (tc.tool === 'exec') {
            const cmd = String((tc.args as any)?.command || '')
            if (cmd.includes('git commit')) {
              const match = cmd.match(/-m\s+"([^"]+)"/)
              if (match) edits.push({ file: match[1], action: 'Git commit' })
            }
          }
        }
      }
    }
    return edits
  }, [sessionHistory, task.status])

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose} />
      <div 
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] z-50 overflow-y-auto flex flex-col"
        style={{ background: 'rgba(10,10,15,0.98)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `${getKindColor(task.kind)}15` }}>
                <Icon name={getAgentIcon(task.kind)} size={20} style={{ color: getKindColor(task.kind) }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate mb-1">{task.title}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs font-semibold" style={{ color }}>{statusLabels[task.status]}</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>· {task.agent} · {timeAgo(task.updated)}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
              <Icon name="xmark" size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Agent', value: task.agent },
              { label: 'Model', value: task.model.split('/').pop() || task.model },
              { label: 'Beskeder', value: String(task.messageCount) },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.label}</p>
                <p className="text-xs text-white mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Changelog for completed tasks */}
        {task.status === 'completed' && changes.length > 0 && (
          <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-bold text-white mb-3">Ændringer</h3>
            <div className="space-y-2">
              {changes.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(48,209,88,0.1)' }}>
                    <Icon name="doc-text" size={12} style={{ color: '#30D158' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-white/70 truncate block">{c.file}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{c.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingHistory ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Indlæser historik...</p>
            </div>
          ) : sessionHistory.length > 0 ? (
            <div className="space-y-3">
              {sessionHistory.map((msg, idx) => {
                const text = msg.text || ''
                if (!text && !msg.toolCalls) return null
                const isUser = msg.role === 'user'
                return (
                  <div key={idx}>
                    {text && (
                      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
                        <div className="max-w-[85%]">
                          <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.25)', textAlign: isUser ? 'right' : 'left' }}>
                            {isUser ? 'Bruger' : 'Agent'}
                          </p>
                          <div className="rounded-xl px-4 py-2.5" style={{ 
                            background: isUser ? '#007AFF' : 'rgba(255,255,255,0.06)',
                            color: isUser ? '#fff' : 'rgba(255,255,255,0.85)',
                          }}>
                            <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {msg.toolCalls.map((tc, tcIdx) => <ToolCallCard key={tcIdx} toolCall={tc} />)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Icon name="doc-text" size={32} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen beskeder i denne session</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Create Task Modal ───────────────────────── */
function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [task, setTask] = useState('')
  const [category, setCategory] = useState<TaskCategory>('building')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [creating, setCreating] = useState(false)
  const [useSchedule, setUseSchedule] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || !task.trim()) return
    setCreating(true)
    try {
      if (useSchedule && scheduledDate && scheduledTime) {
        // Create as scheduled cron job — fires once at the given time
        const isoTime = `${scheduledDate}T${scheduledTime}:00`
        await invokeToolRaw('cron', {
          action: 'add',
          job: {
            name: name.trim(),
            schedule: { kind: 'at', at: new Date(isoTime).toISOString() },
            payload: { kind: 'agentTurn', message: `[Opgave: ${name.trim()}]\n\n${task.trim()}` },
            sessionTarget: 'isolated',
          }
        })
      } else {
        // Run immediately as sub-agent
        await createAgent({ 
          name: name.trim(), 
          task: task.trim(), 
          model: 'sonnet', 
          label: name.trim().toLowerCase().replace(/\s+/g, '-') 
        })
      }
      onClose()
      setName('')
      setTask('')
      setScheduledDate('')
      setScheduledTime('')
      setUseSchedule(false)
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
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-6 rounded-xl"
        style={{ background: 'rgba(15,15,20,0.98)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Opret Opgave</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Icon name="xmark" size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Navn</label>
            <input 
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="f.eks. Byg ny feature"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20"
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', outline: 'none' }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Beskrivelse</label>
            <textarea 
              value={task} onChange={e => setTask(e.target.value)}
              placeholder="Beskriv opgaven i detaljer..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white resize-none placeholder-white/20"
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', outline: 'none' }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ 
                    background: category === cat.id ? `${cat.color}20` : 'rgba(255,255,255,0.04)',
                    color: category === cat.id ? cat.color : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <Icon name={cat.icon} size={12} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div 
                className="w-10 h-6 rounded-full relative transition-all"
                style={{ background: useSchedule ? '#007AFF' : 'rgba(255,255,255,0.1)' }}
                onClick={() => setUseSchedule(!useSchedule)}
              >
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                     style={{ left: useSchedule ? 22 : 4 }} />
              </div>
              <span className="text-sm text-white/70">Planlæg tidspunkt</span>
            </label>
          </div>

          {useSchedule && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">Dato</label>
                <input 
                  type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', outline: 'none', colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Tidspunkt</label>
                <input 
                  type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', outline: 'none', colorScheme: 'dark' }}
                />
              </div>
            </div>
          )}
          
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !task.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all"
            style={{ 
              background: creating || !name.trim() || !task.trim() ? 'rgba(0,122,255,0.2)' : '#007AFF',
              opacity: creating || !name.trim() || !task.trim() ? 0.5 : 1 
            }}
          >
            {creating ? 'Opretter...' : useSchedule ? 'Planlæg Opgave' : 'Start Opgave Nu'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Archive Modal ───────────────────────────── */
function ArchiveModal({ open, onClose, tasks, onSelectTask }: { 
  open: boolean; onClose: () => void; tasks: Task[]; onSelectTask: (t: Task) => void 
}) {
  const [searchArchive, setSearchArchive] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'queued' | 'active' | 'completed'>('all')

  const filteredTasks = useMemo(() => {
    let filtered = tasks
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus)
    }
    if (searchArchive.trim()) {
      const q = searchArchive.toLowerCase()
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.agent.toLowerCase().includes(q) || 
        (t.firstMessage || '').toLowerCase().includes(q)
      )
    }
    return filtered
  }, [tasks, filterStatus, searchArchive])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose} />
      <div 
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl z-50 rounded-xl overflow-hidden"
        style={{ background: 'rgba(15,15,20,0.98)', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(142,142,147,0.15)' }}>
                <Icon name="doc-text" size={18} style={{ color: '#8E8E93' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Arkiv</h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{filteredTasks.length} opgaver</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" 
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
              <Icon name="xmark" size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>

          {/* Search + Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Icon name="magnifying-glass" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" 
                    style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="text"
                value={searchArchive}
                onChange={e => setSearchArchive(e.target.value)}
                placeholder="Søg i arkiv..."
                className="w-full pl-10 pr-3 py-2 rounded-lg text-sm text-white placeholder-white/20"
                style={{ background: 'rgba(255,255,255,0.04)', border: 'none', outline: 'none' }}
              />
            </div>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'Alle', color: '#8E8E93' },
                { id: 'queued', label: 'I Kø', color: '#FF9F0A' },
                { id: 'active', label: 'Aktive', color: '#007AFF' },
                { id: 'completed', label: 'Afsluttet', color: '#30D158' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id as any)}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ 
                    background: filterStatus === f.id ? `${f.color}20` : 'rgba(255,255,255,0.04)',
                    color: filterStatus === f.id ? f.color : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="p-4 overflow-y-auto space-y-2" style={{ maxHeight: 'calc(85vh - 160px)' }}>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="doc-text" size={32} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen opgaver fundet</p>
            </div>
          ) : (
            filteredTasks.map(t => (
              <TaskMiniCard 
                key={t.id} 
                task={t} 
                onSelect={() => { onClose(); onSelectTask(t) }} 
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}

/* ── Main Page ──────────────────────────────── */
export default function Tasks() {
  const { sessions, cronJobs } = useLiveData()
  const [allSessions, setAllSessions] = useState<TranscriptSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [statusPopup, setStatusPopup] = useState<'queued' | 'active' | 'completed' | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY_SESSIONS)
    if (cached) {
      try { setAllSessions(JSON.parse(cached)) } catch {}
    }
    setLoading(true)
    fetchAllSessions()
      .then(s => {
        setAllSessions(s)
        localStorage.setItem(CACHE_KEY_SESSIONS, JSON.stringify(s))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tasks: Task[] = useMemo(() => {
    const transcriptTasks = allSessions.map(transcriptToTask)
    const liveTasks = sessions.map(liveSessionToTask)
    const mergedMap = new Map<string, Task>()
    for (const t of transcriptTasks) mergedMap.set(t.sessionId, t)
    for (const t of liveTasks) {
      const existing = mergedMap.get(t.sessionId)
      mergedMap.set(t.sessionId, existing ? { ...existing, ...t, sessionKey: t.sessionKey } : t)
    }
    return Array.from(mergedMap.values()).sort((a, b) => b.updated.getTime() - a.updated.getTime())
  }, [sessions, allSessions])

  const queued = tasks.filter(t => t.status === 'queued')
  const active = tasks.filter(t => t.status === 'active')
  const completed = tasks.filter(t => t.status === 'completed')

  // Bandwidth: active count / max capacity
  const bandwidth = Math.min(100, Math.round((active.length / Math.max(5, active.length + 2)) * 100))

  // Next scheduled task
  const nextCron = useMemo(() => {
    const scheduled = cronJobs.filter((j: any) => j.enabled !== false)
    if (scheduled.length === 0) return null
    // Find jobs with 'at' schedule
    const atJobs = scheduled.filter((j: any) => typeof j.schedule === 'object' && j.schedule?.kind === 'at')
    if (atJobs.length === 0) return null
    const sorted = atJobs.sort((a: any, b: any) => new Date(a.schedule.at).getTime() - new Date(b.schedule.at).getTime())
    const next = sorted[0]
    const nextTime = new Date((next.schedule as any).at)
    const diff = nextTime.getTime() - Date.now()
    if (diff < 0) return null
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    return { name: next.name, timeStr: hours > 0 ? `${hours}t ${mins % 60}m` : `${mins}m` }
  }, [cronJobs])

  // Filter by search
  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks
    const q = search.toLowerCase()
    return tasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.agent.toLowerCase().includes(q) || 
      (t.firstMessage || '').toLowerCase().includes(q)
    )
  }, [tasks, search])

  const handleStartTask = async (task: Task) => {
    try {
      await createAgent({
        name: task.title,
        task: task.firstMessage || task.title,
        model: 'sonnet',
        label: task.label || task.title.toLowerCase().replace(/\s+/g, '-'),
      })
    } catch (e) {
      console.error('Fejl ved start:', e)
    }
  }

  const queuedFiltered = queued.filter(t => 
    !search.trim() || 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.agent.toLowerCase().includes(search.toLowerCase()) || 
    (t.firstMessage || '').toLowerCase().includes(search.toLowerCase())
  )
  const activeFiltered = active.filter(t => 
    !search.trim() || 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.agent.toLowerCase().includes(search.toLowerCase()) || 
    (t.firstMessage || '').toLowerCase().includes(search.toLowerCase())
  )
  const completedFiltered = completed.filter(t => 
    !search.trim() || 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.agent.toLowerCase().includes(search.toLowerCase()) || 
    (t.firstMessage || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Opgaver</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {loading ? 'Indlæser...' : `${tasks.length} total · ${active.length} aktive · ${completed.length} afsluttede`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowArchive(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            onMouseEnter={e => { 
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)' 
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(142,142,147,0.2)'
            }}
            onMouseLeave={e => { 
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)' 
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <Icon name="doc-text" size={16} />
            Arkiv
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all"
            style={{ background: '#007AFF' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,122,255,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            <Icon name="plus" size={16} />
            Ny Opgave
          </button>
        </div>
      </div>

      {/* Search + Activity Status */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Icon name="magnifying-glass" size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søg opgaver..."
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20"
            style={{ background: 'rgba(255,255,255,0.04)', border: 'none', outline: 'none' }}
          />
        </div>
        {nextCron && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Icon name="clock" size={14} style={{ color: '#FF9F0A' }} />
            <span className="text-xs text-white/50">Næste:</span>
            <span className="text-xs font-medium text-white">{nextCron.name}</span>
            <span className="text-xs font-mono" style={{ color: '#FF9F0A' }}>{nextCron.timeStr}</span>
          </div>
        )}
      </div>

      {/* 3-Column Kanban */}
      <div className="flex-1 overflow-hidden grid grid-cols-3 gap-4">
        {/* I KØ */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#FF9F0A' }} />
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">I Kø</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(255,159,10,0.1)', color: '#FF9F0A' }}>
              {queuedFiltered.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {queuedFiltered.length === 0 ? (
              <div className="text-center py-8">
                <Icon name="clock" size={24} className="mx-auto mb-2" style={{ color: 'rgba(255,159,10,0.2)' }} />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Ingen i kø</p>
              </div>
            ) : (
              queuedFiltered.map(t => (
                <TaskMiniCard key={t.id} task={t} onSelect={() => setSelectedTask(t)} onStart={() => handleStartTask(t)} />
              ))
            )}
          </div>
        </div>

        {/* AKTIVE */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#007AFF' }} />
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">Aktive</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}>
              {activeFiltered.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {activeFiltered.length === 0 ? (
              <div className="text-center py-8">
                <Icon name="bolt" size={24} className="mx-auto mb-2" style={{ color: 'rgba(0,122,255,0.2)' }} />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Ingen aktive</p>
              </div>
            ) : (
              activeFiltered.map(t => (
                <TaskMiniCard key={t.id} task={t} onSelect={() => setSelectedTask(t)} />
              ))
            )}
          </div>
        </div>

        {/* AFSLUTTET */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#30D158' }} />
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">Afsluttet</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(48,209,88,0.1)', color: '#30D158' }}>
              {completedFiltered.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {completedFiltered.length === 0 ? (
              <div className="text-center py-8">
                <Icon name="checkmark-circle" size={24} className="mx-auto mb-2" style={{ color: 'rgba(48,209,88,0.2)' }} />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Ingen afsluttede</p>
              </div>
            ) : (
              completedFiltered.map(t => (
                <TaskMiniCard key={t.id} task={t} onSelect={() => setSelectedTask(t)} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Popups */}
      {selectedTask && <DetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />}
      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ArchiveModal 
        open={showArchive} 
        onClose={() => setShowArchive(false)} 
        tasks={tasks} 
        onSelectTask={setSelectedTask} 
      />
    </div>
  )
}
