import { useState, useMemo, useEffect } from 'react'
import Icon from '../components/Icon'
// import LiveFeed from '../components/LiveFeed'
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

function sessionToTask(s: ApiSession): Task {
  const updatedAt = new Date(s.updatedAt)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  
  let status: 'queued' | 'active' | 'completed' = 'completed'
  
  // Kø logik: subagent uden aktivitet (ingen lastMessages eller meget gamle)
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
  if (kind === 'main') return 'brain'
  if (kind === 'subagent') return 'robot'
  return 'sparkle'
}

function getKindColor(kind: string): string {
  if (kind === 'main') return '#007AFF'
  if (kind === 'subagent') return '#AF52DE'
  return '#FF9F0A'
}

/* ── Task Card ───────────────────────────────── */
function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const statusColors = {
    queued: '#FF9F0A',
    active: '#007AFF',
    completed: '#30D158',
  }
  
  const statusLabels = {
    queued: 'I Kø',
    active: 'Aktiv',
    completed: 'Afsluttet',
  }
  
  const color = statusColors[task.status]
  
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-4 cursor-pointer transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderLeft: `3px solid ${color}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${getKindColor(task.kind)}20` }}
        >
          <Icon name={getAgentIcon(task.kind)} size={18} style={{ color: getKindColor(task.kind) }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white mb-1 truncate">{task.title}</h3>
          <div className="flex items-center gap-2">
            <span 
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${getKindColor(task.kind)}20`, color: getKindColor(task.kind) }}
            >
              {task.kind === 'main' ? 'Hoved' : task.kind === 'subagent' ? 'Sub' : task.kind}
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.channel}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(task.updated)}</span>
        <div className="flex items-center gap-3">
          {task.contextTokens && (
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {(task.contextTokens / 1000).toFixed(0)}K
            </span>
          )}
          <span className="text-xs font-semibold" style={{ color }}>
            {statusLabels[task.status]}
          </span>
        </div>
      </div>
    </div>
  )
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
          <Icon name="wrench" size={14} style={{ color: '#FF9F0A' }} />
          <span className="text-sm font-medium" style={{ color: '#FF9F0A' }}>{toolCall.tool}</span>
        </div>
        <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Argumenter
            </p>
            <pre className="text-xs p-2 rounded overflow-x-auto" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.6)' }}>
              {JSON.stringify(toolCall.args || {}, null, 2)}
            </pre>
          </div>
          
          {toolCall.result && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Resultat
              </p>
              <pre className="text-xs p-2 rounded overflow-x-auto max-h-40" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.6)' }}>
                {typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result || {}, null, 2)}
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
        <div className={`text-xs mb-1 ${isUser ? 'text-right' : 'text-left'}`} style={{ color: 'rgba(255,255,255,0.3)' }}>
          {isUser ? 'Bruger' : isAssistant ? 'Agent' : message.role}
        </div>
        
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

/* ── Column Component ────────────────────────── */
function Column({ title, tasks, color, onClick }: { title: string; tasks: Task[]; color: string; onClick: (task: Task) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color }}>
          {title}
        </h2>
        <span 
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}
        >
          {tasks.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="doc" size={24} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen opgaver</p>
          </div>
        ) : (
          tasks.map(task => <TaskCard key={task.id} task={task} onClick={() => onClick(task)} />)
        )}
      </div>
    </div>
  )
}

/* ── Detail Panel ────────────────────────────── */
function DetailPanel({ task, onClose }: { task: Task; onClose: () => void }) {
  const [sessionHistory, setSessionHistory] = useState<DetailedSessionMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    setLoadingHistory(true)
    getSessionHistory(task.sessionKey)
      .then(msgs => setSessionHistory(msgs))
      .catch(err => {
        console.error('Failed to load history:', err)
        setSessionHistory([])
      })
      .finally(() => setLoadingHistory(false))
  }, [task.sessionKey])

  const statusColors = {
    queued: '#FF9F0A',
    active: '#007AFF',
    completed: '#30D158',
  }

  const statusLabels = {
    queued: 'I Kø',
    active: 'Aktiv',
    completed: 'Afsluttet',
  }

  const color = statusColors[task.status]

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose} />
      <div 
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] z-50 overflow-y-auto flex flex-col"
        style={{
          background: 'rgba(10,10,15,0.98)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
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
                    {statusLabels[task.status]}
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
          
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Type</p>
              <span 
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${getKindColor(task.kind)}20`, color: getKindColor(task.kind) }}
              >
                {task.kind === 'main' ? 'Hoved' : task.kind === 'subagent' ? 'Sub-agent' : task.kind}
              </span>
            </div>
            <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Kanal</p>
              <p className="text-xs text-white">{task.channel}</p>
            </div>
            <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Model</p>
              <p className="text-xs text-white">{task.model.split('/').pop()}</p>
            </div>
            <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Tokens</p>
              <p className="text-xs text-white">{task.contextTokens ? `${(task.contextTokens / 1000).toFixed(1)}K` : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingHistory ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} />
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
              <Icon name="doc-text" size={32} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen beskeder i denne session</p>
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const tasks: Task[] = useMemo(() => {
    return sessions.map(sessionToTask).sort((a, b) => b.updated.getTime() - a.updated.getTime())
  }, [sessions])

  const queued = tasks.filter(t => t.status === 'queued')
  const active = tasks.filter(t => t.status === 'active')
  const completed = tasks.filter(t => t.status === 'completed')

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Opgaver</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {tasks.length} sessions · {active.length} aktive
          </p>
        </div>
        
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, #007AFF, #AF52DE)' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,122,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          <Icon name="plus" size={16} />
          Opret Opgave
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
        <Column title="I Kø" tasks={queued} color="#FF9F0A" onClick={setSelectedTask} />
        <Column title="Aktive" tasks={active} color="#007AFF" onClick={setSelectedTask} />
        <Column title="Afsluttede" tasks={completed} color="#30D158" onClick={setSelectedTask} />
      </div>

      {selectedTask && <DetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />}
      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
