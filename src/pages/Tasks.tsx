import { useState, useRef } from 'react'

interface TaskStep {
  name: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: string
  finishedAt?: string
  tool?: string
  output?: string
}

interface Task {
  id: string
  title: string
  status: 'queued' | 'active' | 'completed'
  priority: 'critical' | 'high' | 'normal' | 'low'
  agent: string
  client: string
  type: string
  created: string
  started?: string
  finished?: string
  estimatedMinutes: number
  progress?: number
  currentStep?: string
  steps: TaskStep[]
  lastActivity: string
  result?: 'success' | 'error'
  journalRef?: string
  logsRef?: string
}

interface LiveEvent {
  id: string
  taskId: string
  taskTitle: string
  type: 'step_started' | 'tool_called' | 'doc_read' | 'error' | 'task_done'
  agent: string
  client: string
  message: string
  timestamp: string
}

const priorityConfig = {
  critical: { label: 'Kritisk', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  high: { label: 'Høj', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600', dot: 'bg-blue-500' },
  low: { label: 'Lav', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
}

const eventTypeLabels: Record<string, { icon: string; label: string }> = {
  step_started: { icon: '▶️', label: 'Agent startede trin' },
  tool_called: { icon: '🔧', label: 'Værktøj kaldt' },
  doc_read: { icon: '📄', label: 'Dokument læst' },
  error: { icon: '❌', label: 'Fejl opstået' },
  task_done: { icon: '✅', label: 'Opgave færdig' },
}

const initialTasks: Task[] = [
  {
    id: 't1', title: 'Byg Mission Kontrol MVP', status: 'completed', priority: 'critical',
    agent: 'mission-kontrol-builder', client: 'OpenClaw', type: 'udvikling',
    created: '2026-02-08T10:00:00', started: '2026-02-08T10:05:00', finished: '2026-02-08T14:30:00',
    estimatedMinutes: 240, progress: 100, lastActivity: 'Alle komponenter bygget og deployet',
    result: 'success', journalRef: 'j-001',
    steps: [
      { name: 'Opsæt projekt', status: 'done', startedAt: '2026-02-08T10:05:00', finishedAt: '2026-02-08T10:20:00', tool: 'npm init' },
      { name: 'Byg sidebar + layout', status: 'done', startedAt: '2026-02-08T10:20:00', finishedAt: '2026-02-08T11:00:00', tool: 'React' },
      { name: 'Implementer sider', status: 'done', startedAt: '2026-02-08T11:00:00', finishedAt: '2026-02-08T13:30:00', tool: 'React' },
      { name: 'Test og deploy', status: 'done', startedAt: '2026-02-08T13:30:00', finishedAt: '2026-02-08T14:30:00', tool: 'npm run build' },
    ],
  },
  {
    id: 't2', title: 'Dansk UI + rigtig data', status: 'completed', priority: 'high',
    agent: 'mission-kontrol-danish', client: 'OpenClaw', type: 'lokalisering',
    created: '2026-02-09T08:00:00', started: '2026-02-09T08:10:00', finished: '2026-02-09T11:45:00',
    estimatedMinutes: 180, progress: 100, lastActivity: 'Alle tekster oversat til dansk',
    result: 'success', journalRef: 'j-002',
    steps: [
      { name: 'Oversæt UI tekster', status: 'done', startedAt: '2026-02-09T08:10:00', finishedAt: '2026-02-09T09:30:00' },
      { name: 'Tilføj mock data', status: 'done', startedAt: '2026-02-09T09:30:00', finishedAt: '2026-02-09T11:00:00' },
      { name: 'Valider og byg', status: 'done', startedAt: '2026-02-09T11:00:00', finishedAt: '2026-02-09T11:45:00', tool: 'npm run build' },
    ],
  },
  {
    id: 't3', title: 'Kanban + Intelligens tilføjelse', status: 'active', priority: 'critical',
    agent: 'kanban-intel-builder', client: 'OpenClaw', type: 'udvikling',
    created: '2026-02-12T04:00:00', started: '2026-02-12T04:01:00',
    estimatedMinutes: 120, progress: 45, currentStep: 'Bygger Kanban board komponenter',
    lastActivity: 'Implementerer drag-and-drop funktionalitet',
    steps: [
      { name: 'Analysér eksisterende kode', status: 'done', startedAt: '2026-02-12T04:01:00', finishedAt: '2026-02-12T04:10:00', tool: 'read' },
      { name: 'Opret Task datamodel', status: 'done', startedAt: '2026-02-12T04:10:00', finishedAt: '2026-02-12T04:20:00' },
      { name: 'Byg Kanban board', status: 'running', startedAt: '2026-02-12T04:20:00', tool: 'React' },
      { name: 'Byg Intelligens redesign', status: 'pending' },
      { name: 'Test og deploy', status: 'pending' },
    ],
  },
  {
    id: 't4', title: 'OrderFlow design review', status: 'queued', priority: 'high',
    agent: 'designer', client: 'OrderFlow', type: 'design',
    created: '2026-02-11T16:00:00', estimatedMinutes: 90,
    lastActivity: 'Venter i kø — planlagt til næste sprint',
    steps: [
      { name: 'Analysér nuværende design', status: 'pending' },
      { name: 'Sammenlign med owner.com', status: 'pending', tool: 'web_search' },
      { name: 'Udarbejd anbefalinger', status: 'pending' },
    ],
  },
  {
    id: 't5', title: 'Ugentlig sikkerhedsaudit', status: 'queued', priority: 'normal',
    agent: 'security-agent', client: 'OpenClaw', type: 'sikkerhed',
    created: '2026-02-12T00:00:00', estimatedMinutes: 45,
    lastActivity: 'Automatisk planlagt — kører hver mandag',
    steps: [
      { name: 'Tjek credentials', status: 'pending', tool: 'exec' },
      { name: 'Scan porte', status: 'pending', tool: 'exec' },
      { name: 'Generer rapport', status: 'pending' },
    ],
  },
  {
    id: 't6', title: 'WhatsApp reconnect', status: 'queued', priority: 'high',
    agent: 'channel-manager', client: 'OpenClaw', type: 'integration',
    created: '2026-02-11T22:00:00', estimatedMinutes: 15,
    lastActivity: 'Session udløbet — kræver QR-kode scanning',
    steps: [
      { name: 'Genstart WhatsApp service', status: 'pending', tool: 'exec' },
      { name: 'Generer QR-kode', status: 'pending' },
      { name: 'Verificér forbindelse', status: 'pending' },
    ],
  },
  {
    id: 't7', title: 'Opsæt Discord bot', status: 'queued', priority: 'low',
    agent: 'channel-manager', client: 'OpenClaw', type: 'integration',
    created: '2026-02-10T14:00:00', estimatedMinutes: 60,
    lastActivity: 'Afventer Discord bot token fra Martin',
    steps: [
      { name: 'Opret bot applikation', status: 'pending' },
      { name: 'Konfigurer permissions', status: 'pending' },
      { name: 'Test forbindelse', status: 'pending' },
    ],
  },
  {
    id: 't8', title: 'API forbrugsrapport', status: 'completed', priority: 'normal',
    agent: 'analytics-agent', client: 'OpenClaw', type: 'rapport',
    created: '2026-02-10T08:00:00', started: '2026-02-10T08:05:00', finished: '2026-02-10T08:25:00',
    estimatedMinutes: 30, progress: 100, lastActivity: 'Rapport genereret og sendt',
    result: 'success', journalRef: 'j-005',
    steps: [
      { name: 'Hent forbrugsdata', status: 'done', startedAt: '2026-02-10T08:05:00', finishedAt: '2026-02-10T08:12:00' },
      { name: 'Analysér trends', status: 'done', startedAt: '2026-02-10T08:12:00', finishedAt: '2026-02-10T08:20:00' },
      { name: 'Generér PDF', status: 'done', startedAt: '2026-02-10T08:20:00', finishedAt: '2026-02-10T08:25:00' },
    ],
  },
  {
    id: 't9', title: 'FLOW landingsside prototype', status: 'queued', priority: 'normal',
    agent: 'frontend-dev', client: 'FLOW', type: 'udvikling',
    created: '2026-02-11T10:00:00', estimatedMinutes: 180,
    lastActivity: 'Wireframes godkendt — klar til implementering',
    steps: [
      { name: 'Opsæt Next.js projekt', status: 'pending' },
      { name: 'Implementer hero sektion', status: 'pending' },
      { name: 'Byg features sektion', status: 'pending' },
      { name: 'Tilføj responsivt design', status: 'pending' },
    ],
  },
  {
    id: 't10', title: 'Database migration til Supabase', status: 'active', priority: 'high',
    agent: 'backend-dev', client: 'FLOW', type: 'backend',
    created: '2026-02-11T14:00:00', started: '2026-02-11T14:15:00',
    estimatedMinutes: 150, progress: 70, currentStep: 'Migrerer brugerdata',
    lastActivity: 'Restaurant-tabeller oprettet succesfuldt',
    steps: [
      { name: 'Design schema', status: 'done', startedAt: '2026-02-11T14:15:00', finishedAt: '2026-02-11T15:00:00' },
      { name: 'Opret tabeller', status: 'done', startedAt: '2026-02-11T15:00:00', finishedAt: '2026-02-11T16:00:00', tool: 'supabase' },
      { name: 'Migrér data', status: 'running', startedAt: '2026-02-11T16:00:00', tool: 'supabase' },
      { name: 'Test integritet', status: 'pending' },
    ],
  },
  {
    id: 't11', title: 'Telegram bot fejlrettelse', status: 'completed', priority: 'high',
    agent: 'channel-manager', client: 'OpenClaw', type: 'bugfix',
    created: '2026-02-11T09:00:00', started: '2026-02-11T09:05:00', finished: '2026-02-11T09:35:00',
    estimatedMinutes: 30, progress: 100, lastActivity: 'Fejl rettet — bot svarer nu korrekt',
    result: 'success',
    steps: [
      { name: 'Reproducér fejl', status: 'done', startedAt: '2026-02-11T09:05:00', finishedAt: '2026-02-11T09:10:00' },
      { name: 'Find årsag', status: 'done', startedAt: '2026-02-11T09:10:00', finishedAt: '2026-02-11T09:20:00' },
      { name: 'Implementér fix', status: 'done', startedAt: '2026-02-11T09:20:00', finishedAt: '2026-02-11T09:35:00' },
    ],
  },
  {
    id: 't12', title: 'Automatisk backup opsætning', status: 'completed', priority: 'normal',
    agent: 'devops-agent', client: 'OpenClaw', type: 'infrastruktur',
    created: '2026-02-09T16:00:00', started: '2026-02-09T16:10:00', finished: '2026-02-09T17:00:00',
    estimatedMinutes: 60, progress: 100, lastActivity: 'Daglig backup konfigureret til kl. 03:00',
    result: 'success',
    steps: [
      { name: 'Konfigurer cron job', status: 'done', startedAt: '2026-02-09T16:10:00', finishedAt: '2026-02-09T16:30:00', tool: 'exec' },
      { name: 'Test backup', status: 'done', startedAt: '2026-02-09T16:30:00', finishedAt: '2026-02-09T16:50:00' },
      { name: 'Verificér restore', status: 'done', startedAt: '2026-02-09T16:50:00', finishedAt: '2026-02-09T17:00:00' },
    ],
  },
]

const mockEvents: LiveEvent[] = [
  { id: 'e1', taskId: 't3', taskTitle: 'Kanban + Intelligens tilføjelse', type: 'step_started', agent: 'kanban-intel-builder', client: 'OpenClaw', message: 'Startede trin: Byg Kanban board', timestamp: '2026-02-12T04:20:00' },
  { id: 'e2', taskId: 't10', taskTitle: 'Database migration til Supabase', type: 'tool_called', agent: 'backend-dev', client: 'FLOW', message: 'Kaldte værktøj: supabase migrate', timestamp: '2026-02-12T04:15:00' },
  { id: 'e3', taskId: 't3', taskTitle: 'Kanban + Intelligens tilføjelse', type: 'doc_read', agent: 'kanban-intel-builder', client: 'OpenClaw', message: 'Læste dokument: App.tsx, Sidebar.tsx, Intelligence.tsx', timestamp: '2026-02-12T04:05:00' },
  { id: 'e4', taskId: 't10', taskTitle: 'Database migration til Supabase', type: 'step_started', agent: 'backend-dev', client: 'FLOW', message: 'Startede trin: Migrér data', timestamp: '2026-02-11T16:00:00' },
  { id: 'e5', taskId: 't11', taskTitle: 'Telegram bot fejlrettelse', type: 'task_done', agent: 'channel-manager', client: 'OpenClaw', message: 'Opgave afsluttet med succes', timestamp: '2026-02-11T09:35:00' },
  { id: 'e6', taskId: 't10', taskTitle: 'Database migration til Supabase', type: 'tool_called', agent: 'backend-dev', client: 'FLOW', message: 'Kaldte værktøj: supabase create table restaurants', timestamp: '2026-02-11T15:30:00' },
  { id: 'e7', taskId: 't8', taskTitle: 'API forbrugsrapport', type: 'task_done', agent: 'analytics-agent', client: 'OpenClaw', message: 'Rapport genereret og sendt til Martin', timestamp: '2026-02-10T08:25:00' },
  { id: 'e8', taskId: 't2', taskTitle: 'Dansk UI + rigtig data', type: 'task_done', agent: 'mission-kontrol-danish', client: 'OpenClaw', message: 'Alle tekster oversat — build succesfuld', timestamp: '2026-02-09T11:45:00' },
  { id: 'e9', taskId: 't3', taskTitle: 'Kanban + Intelligens tilføjelse', type: 'tool_called', agent: 'kanban-intel-builder', client: 'OpenClaw', message: 'Kaldte værktøj: write Tasks.tsx', timestamp: '2026-02-12T04:22:00' },
  { id: 'e10', taskId: 't6', taskTitle: 'WhatsApp reconnect', type: 'error', agent: 'channel-manager', client: 'OpenClaw', message: 'Fejl: Session token udløbet — kræver manuel handling', timestamp: '2026-02-11T22:05:00' },
]

function timeAgo(dateStr: string): string {
  const now = new Date('2026-02-12T06:00:00')
  const date = new Date(dateStr)
  const mins = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (mins < 60) return `${mins}m siden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}t siden`
  const days = Math.floor(hours / 24)
  return `${days}d siden`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [viewMode, setViewMode] = useState<'kanban' | 'livefeed'>('kanban')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filterClient, setFilterClient] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
  const [eventFilterAgent, setEventFilterAgent] = useState('')
  const [eventFilterClient, setEventFilterClient] = useState('')
  const dragItem = useRef<string | null>(null)

  const clients = [...new Set(tasks.map(t => t.client))]
  const agents = [...new Set(tasks.map(t => t.agent))]
  const types = [...new Set(tasks.map(t => t.type))]

  const filtered = tasks.filter(t => {
    if (filterClient && t.client !== filterClient) return false
    if (filterAgent && t.agent !== filterAgent) return false
    if (filterType && t.type !== filterType) return false
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (onlyMine && t.agent !== 'kanban-intel-builder') return false
    return true
  })

  const queued = filtered.filter(t => t.status === 'queued').sort((a, b) => {
    const order = { critical: 0, high: 1, normal: 2, low: 3 }
    return order[a.priority] - order[b.priority]
  })
  const active = filtered.filter(t => t.status === 'active')
  const completed = filtered.filter(t => t.status === 'completed')

  const filteredEvents = mockEvents.filter(e => {
    if (eventFilterAgent && e.agent !== eventFilterAgent) return false
    if (eventFilterClient && e.client !== eventFilterClient) return false
    return true
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  function handleDragStart(taskId: string) {
    dragItem.current = taskId
  }

  function handleDrop(newStatus: 'queued' | 'active' | 'completed') {
    if (!dragItem.current) return
    setTasks(prev => prev.map(t => {
      if (t.id !== dragItem.current) return t
      const updated = { ...t, status: newStatus }
      if (newStatus === 'active' && !t.started) updated.started = new Date().toISOString()
      if (newStatus === 'completed') {
        updated.finished = new Date().toISOString()
        updated.progress = 100
        updated.result = 'success'
      }
      if (newStatus === 'queued') {
        updated.started = undefined
        updated.progress = undefined
        updated.currentStep = undefined
      }
      return updated
    }))
    dragItem.current = null
  }

  function handleAction(taskId: string, action: 'pause' | 'restart' | 'cancel') {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      if (action === 'pause') return { ...t, status: 'queued' as const, lastActivity: 'Sat på pause' }
      if (action === 'restart') return { ...t, status: 'queued' as const, progress: undefined, currentStep: undefined, started: undefined, finished: undefined, result: undefined, lastActivity: 'Genstartet — venter i kø' }
      if (action === 'cancel') return { ...t, status: 'completed' as const, result: 'error' as const, finished: new Date().toISOString(), lastActivity: 'Annulleret manuelt' }
      return t
    }))
  }

  const TaskCard = ({ task }: { task: Task }) => {
    const pc = priorityConfig[task.priority]
    return (
      <div
        draggable
        onDragStart={() => handleDragStart(task.id)}
        onClick={() => setSelectedTask(task)}
        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-100 group"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'active' ? 'bg-blue-500 animate-pulse' : task.result === 'success' ? 'bg-green-500' : task.result === 'error' ? 'bg-red-500' : pc.dot}`} />
            <h4 className="text-sm font-semibold text-gray-900 truncate">{task.title}</h4>
          </div>
          <span className={`badge text-[10px] flex-shrink-0 ml-2 ${pc.color}`}>{pc.label}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-gray-400">{task.client}</span>
          <span className="text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">{task.agent}</span>
        </div>
        {task.status === 'active' && task.progress !== undefined && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-blue-600 font-medium">{task.currentStep}</span>
              <span className="text-[11px] font-semibold text-blue-600">{task.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        )}
        {task.status === 'completed' && task.result && (
          <div className={`mb-2 text-[11px] font-medium ${task.result === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {task.result === 'success' ? '✓ Gennemført' : '✕ Fejlet'}
          </div>
        )}
        <p className="text-[11px] text-gray-400 mb-3 line-clamp-1">{task.lastActivity}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <span>⏱ {task.estimatedMinutes}m</span>
            <span className="text-gray-300">·</span>
            <span>{timeAgo(task.created)}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.status === 'active' && (
              <button onClick={e => { e.stopPropagation(); handleAction(task.id, 'pause') }} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-xs" title="Pause">⏸</button>
            )}
            <button onClick={e => { e.stopPropagation(); handleAction(task.id, 'restart') }} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-xs" title="Genstart">🔄</button>
            {task.status !== 'completed' && (
              <button onClick={e => { e.stopPropagation(); handleAction(task.id, 'cancel') }} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-xs" title="Annuller">✕</button>
            )}
            <button onClick={e => { e.stopPropagation(); setSelectedTask(task) }} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-xs" title="Detaljer">→</button>
          </div>
        </div>
      </div>
    )
  }

  const Column = ({ title, count, color, tasks: columnTasks, status }: { title: string; count: number; color: string; tasks: Task[]; status: 'queued' | 'active' | 'completed' }) => (
    <div
      className="flex-1 min-w-[300px]"
      onDragOver={e => e.preventDefault()}
      onDrop={() => handleDrop(status)}
    >
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="space-y-3 min-h-[200px] p-2 rounded-xl bg-gray-50/50">
        {columnTasks.map(task => <TaskCard key={task.id} task={task} />)}
        {columnTasks.length === 0 && (
          <div className="text-center py-8 text-gray-300 text-sm">Ingen opgaver</div>
        )}
      </div>
    </div>
  )

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <h1 className="page-title">Opgaver</h1>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('kanban')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Kanban</button>
          <button onClick={() => setViewMode('livefeed')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'livefeed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Live Feed</button>
        </div>
      </div>
      <p className="caption mb-5">Opgavestyring og realtidsoverblik</p>

      {viewMode === 'kanban' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle klienter</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle agenter</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle typer</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="text"
              placeholder="Søg efter titel..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input text-xs py-1.5 w-48"
            />
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} className="rounded" />
              Kun mine opgaver
            </label>
          </div>

          {/* Kanban Board */}
          <div className="flex gap-5 overflow-x-auto pb-4">
            <Column title="Kø" count={queued.length} color="bg-yellow-400" tasks={queued} status="queued" />
            <Column title="Aktiv" count={active.length} color="bg-blue-500" tasks={active} status="active" />
            <Column title="Afsluttet" count={completed.length} color="bg-green-500" tasks={completed} status="completed" />
          </div>
        </>
      )}

      {viewMode === 'livefeed' && (
        <>
          <div className="flex items-center gap-3 mb-5">
            <select value={eventFilterAgent} onChange={e => setEventFilterAgent(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle agenter</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={eventFilterClient} onChange={e => setEventFilterClient(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle klienter</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {filteredEvents.map(event => {
              const evType = eventTypeLabels[event.type]
              return (
                <div
                  key={event.id}
                  onClick={() => {
                    const t = tasks.find(t => t.id === event.taskId)
                    if (t) setSelectedTask(t)
                  }}
                  className="card flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <span className="text-lg mt-0.5">{evType.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-500">{evType.label}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{event.agent}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{event.client}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{event.taskTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{event.message}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">{formatDate(event.timestamp)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Detail Side Panel */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 bg-black/20 z-50" onClick={() => setSelectedTask(null)} />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{selectedTask.title}</h2>
                <button onClick={() => setSelectedTask(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Status</p>
                  <span className={`badge ${selectedTask.status === 'active' ? 'bg-blue-100 text-blue-700' : selectedTask.status === 'completed' ? (selectedTask.result === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-yellow-100 text-yellow-700'}`}>
                    {selectedTask.status === 'queued' ? 'I kø' : selectedTask.status === 'active' ? 'Aktiv' : 'Afsluttet'}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Prioritet</p>
                  <span className={`badge ${priorityConfig[selectedTask.priority].color}`}>{priorityConfig[selectedTask.priority].label}</span>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Agent</p>
                  <p className="text-sm font-medium">{selectedTask.agent}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Klient</p>
                  <p className="text-sm font-medium">{selectedTask.client}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Type</p>
                  <p className="text-sm font-medium">{selectedTask.type}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Estimeret</p>
                  <p className="text-sm font-medium">{selectedTask.estimatedMinutes} min</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Oprettet</p>
                  <p className="text-sm">{formatDate(selectedTask.created)}</p>
                </div>
                {selectedTask.started && (
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Startet</p>
                    <p className="text-sm">{formatDate(selectedTask.started)}</p>
                  </div>
                )}
              </div>

              {selectedTask.status === 'active' && selectedTask.progress !== undefined && (
                <div className="mb-6">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-blue-600">{selectedTask.currentStep}</span>
                    <span className="text-sm font-bold text-blue-600">{selectedTask.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${selectedTask.progress}%` }} />
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Trin</h3>
                <div className="space-y-2">
                  {selectedTask.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.status === 'done' ? 'bg-green-100 text-green-600' :
                        step.status === 'running' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                        step.status === 'error' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {step.status === 'done' ? '✓' : step.status === 'running' ? '▶' : step.status === 'error' ? '!' : (i + 1)}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{step.name}</p>
                        {step.tool && <p className="text-[11px] text-gray-400">Værktøj: {step.tool}</p>}
                      </div>
                      {step.finishedAt && step.startedAt && (
                        <span className="text-[10px] text-gray-400">
                          {Math.round((new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()) / 60000)}m
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {selectedTask.status === 'active' && (
                  <button onClick={() => { handleAction(selectedTask.id, 'pause'); setSelectedTask(null) }} className="btn-secondary text-xs">⏸ Pause</button>
                )}
                <button onClick={() => { handleAction(selectedTask.id, 'restart'); setSelectedTask(null) }} className="btn-secondary text-xs">🔄 Genstart</button>
                {selectedTask.status !== 'completed' && (
                  <button onClick={() => { handleAction(selectedTask.id, 'cancel'); setSelectedTask(null) }} className="btn-secondary text-xs text-red-500">✕ Annuller</button>
                )}
                {selectedTask.journalRef && (
                  <button className="btn-primary text-xs">📋 Gå til journal</button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
