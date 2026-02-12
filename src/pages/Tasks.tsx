import { useState, useRef, useMemo } from 'react'
import Icon from '../components/Icon'

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
  critical: { label: 'Kritisk', color: 'text-red-400', bg: 'rgba(255,59,48,0.1)', dot: 'bg-red-500' },
  high: { label: 'Høj', color: 'text-orange-400', bg: 'rgba(255,149,0,0.1)', dot: 'bg-orange-500' },
  normal: { label: 'Normal', color: 'text-blue-400', bg: 'rgba(0,122,255,0.1)', dot: 'bg-blue-500' },
  low: { label: 'Lav', color: 'text-white/50', bg: 'rgba(142,142,147,0.1)', dot: 'bg-white/30' },
}

const eventTypeConfig: Record<string, { icon: string; label: string }> = {
  step_started: { icon: 'play', label: 'Agent startede trin' },
  tool_called: { icon: 'wrench', label: 'Værktøj kaldt' },
  doc_read: { icon: 'doc', label: 'Dokument læst' },
  error: { icon: 'xmark', label: 'Fejl opstået' },
  task_done: { icon: 'check', label: 'Opgave færdig' },
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
  // Historical tasks for Historik view
  {
    id: 't13', title: 'SSL certifikat fornyelse', status: 'completed', priority: 'critical',
    agent: 'devops-agent', client: 'OpenClaw', type: 'infrastruktur',
    created: '2026-02-08T06:00:00', started: '2026-02-08T06:05:00', finished: '2026-02-08T06:15:00',
    estimatedMinutes: 15, progress: 100, lastActivity: 'Certifikat fornyet', result: 'success',
    steps: [{ name: 'Forny certifikat', status: 'done', startedAt: '2026-02-08T06:05:00', finishedAt: '2026-02-08T06:15:00' }],
  },
  {
    id: 't14', title: 'Log rotation fejl', status: 'completed', priority: 'high',
    agent: 'devops-agent', client: 'OpenClaw', type: 'infrastruktur',
    created: '2026-02-08T12:00:00', started: '2026-02-08T12:10:00', finished: '2026-02-08T12:40:00',
    estimatedMinutes: 30, progress: 100, lastActivity: 'Log rotation retableret', result: 'error',
    steps: [{ name: 'Diagnosticér', status: 'done' }, { name: 'Fix konfiguration', status: 'error' }],
  },
  {
    id: 't15', title: 'Kundedata eksport til CSV', status: 'completed', priority: 'normal',
    agent: 'analytics-agent', client: 'FLOW', type: 'rapport',
    created: '2026-02-09T10:00:00', started: '2026-02-09T10:05:00', finished: '2026-02-09T10:20:00',
    estimatedMinutes: 20, progress: 100, lastActivity: 'CSV eksporteret', result: 'success',
    steps: [{ name: 'Hent data', status: 'done' }, { name: 'Generér CSV', status: 'done' }],
  },
  {
    id: 't16', title: 'E-mail notifikation test', status: 'completed', priority: 'low',
    agent: 'channel-manager', client: 'OpenClaw', type: 'test',
    created: '2026-02-09T14:00:00', started: '2026-02-09T14:05:00', finished: '2026-02-09T14:10:00',
    estimatedMinutes: 10, progress: 100, lastActivity: 'Test gennemført', result: 'success',
    steps: [{ name: 'Send test e-mail', status: 'done' }],
  },
  {
    id: 't17', title: 'Supabase schema validering', status: 'completed', priority: 'high',
    agent: 'backend-dev', client: 'FLOW', type: 'backend',
    created: '2026-02-10T11:00:00', started: '2026-02-10T11:10:00', finished: '2026-02-10T11:45:00',
    estimatedMinutes: 40, progress: 100, lastActivity: 'Schema valideret OK', result: 'success',
    steps: [{ name: 'Validér relationer', status: 'done' }, { name: 'Kør migrations', status: 'done' }],
  },
  {
    id: 't18', title: 'Fejlsøgning: Telegram timeout', status: 'completed', priority: 'critical',
    agent: 'channel-manager', client: 'OpenClaw', type: 'bugfix',
    created: '2026-02-10T15:00:00', started: '2026-02-10T15:05:00', finished: '2026-02-10T15:50:00',
    estimatedMinutes: 45, progress: 100, lastActivity: 'Timeout løst — polling interval justeret', result: 'success',
    steps: [{ name: 'Analysér logs', status: 'done' }, { name: 'Justér polling', status: 'done' }, { name: 'Verificér', status: 'done' }],
  },
  {
    id: 't19', title: 'Perplexity API integration', status: 'completed', priority: 'high',
    agent: 'mission-kontrol-builder', client: 'OpenClaw', type: 'integration',
    created: '2026-02-10T09:00:00', started: '2026-02-10T09:05:00', finished: '2026-02-10T10:30:00',
    estimatedMinutes: 90, progress: 100, lastActivity: 'Sonar Pro Search integreret', result: 'success',
    steps: [{ name: 'Konfigurer API', status: 'done' }, { name: 'Implementér søgning', status: 'done' }, { name: 'Test', status: 'done' }],
  },
  {
    id: 't20', title: 'Workspace filer synkronisering', status: 'completed', priority: 'normal',
    agent: 'devops-agent', client: 'OpenClaw', type: 'infrastruktur',
    created: '2026-02-09T20:00:00', started: '2026-02-09T20:05:00', finished: '2026-02-09T20:15:00',
    estimatedMinutes: 15, progress: 100, lastActivity: 'Alle filer synkroniseret', result: 'success',
    steps: [{ name: 'Synkroniser', status: 'done' }],
  },
  {
    id: 't21', title: 'Fejlsøgning: Memory leak i agent', status: 'completed', priority: 'critical',
    agent: 'devops-agent', client: 'OpenClaw', type: 'bugfix',
    created: '2026-02-08T18:00:00', started: '2026-02-08T18:10:00', finished: '2026-02-08T19:20:00',
    estimatedMinutes: 60, progress: 100, lastActivity: 'Memory leak identificeret og løst', result: 'success',
    steps: [{ name: 'Profiler hukommelse', status: 'done' }, { name: 'Identificér leak', status: 'done' }, { name: 'Patch', status: 'done' }],
  },
  {
    id: 't22', title: 'YouTube watcher skill test', status: 'completed', priority: 'low',
    agent: 'mission-kontrol-builder', client: 'OpenClaw', type: 'test',
    created: '2026-02-08T15:00:00', started: '2026-02-08T15:05:00', finished: '2026-02-08T15:20:00',
    estimatedMinutes: 20, progress: 100, lastActivity: 'Transskription fungerer', result: 'success',
    steps: [{ name: 'Test transskription', status: 'done' }],
  },
  {
    id: 't23', title: 'FLOW menu upload API', status: 'completed', priority: 'high',
    agent: 'backend-dev', client: 'FLOW', type: 'backend',
    created: '2026-02-10T13:00:00', started: '2026-02-10T13:10:00', finished: '2026-02-10T14:30:00',
    estimatedMinutes: 90, progress: 100, lastActivity: 'Upload endpoint klar', result: 'error',
    steps: [{ name: 'Design endpoint', status: 'done' }, { name: 'Implementér', status: 'done' }, { name: 'Test', status: 'error' }],
  },
  {
    id: 't24', title: 'Daglig sundhedsrapport', status: 'completed', priority: 'normal',
    agent: 'analytics-agent', client: 'OpenClaw', type: 'rapport',
    created: '2026-02-11T06:00:00', started: '2026-02-11T06:05:00', finished: '2026-02-11T06:15:00',
    estimatedMinutes: 15, progress: 100, lastActivity: 'Rapport sendt', result: 'success',
    steps: [{ name: 'Indsaml data', status: 'done' }, { name: 'Generér rapport', status: 'done' }],
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function durationMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}t ${m}m` : `${h}t`
}

type SortKey = 'title' | 'client' | 'agent' | 'priority' | 'created' | 'finished' | 'duration' | 'result'
type SortDir = 'asc' | 'desc'

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [viewMode, setViewMode] = useState<'kanban' | 'livefeed' | 'historik'>('kanban')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filterClient, setFilterClient] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
  const [eventFilterAgent, setEventFilterAgent] = useState('')
  const [eventFilterClient, setEventFilterClient] = useState('')
  // Historik state
  const [histSearch, setHistSearch] = useState('')
  const [histClient, setHistClient] = useState('')
  const [histAgent, setHistAgent] = useState('')
  const [histStatus, setHistStatus] = useState('')
  const [histSort, setHistSort] = useState<SortKey>('created')
  const [histSortDir, setHistSortDir] = useState<SortDir>('desc')
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

  // Historik data
  const histTasks = useMemo(() => {
    const all = tasks.filter(t => t.status === 'completed')
    let result = all.filter(t => {
      if (histSearch && !t.title.toLowerCase().includes(histSearch.toLowerCase())) return false
      if (histClient && t.client !== histClient) return false
      if (histAgent && t.agent !== histAgent) return false
      if (histStatus === 'success' && t.result !== 'success') return false
      if (histStatus === 'error' && t.result !== 'error') return false
      return true
    })
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
    result.sort((a, b) => {
      let cmp = 0
      switch (histSort) {
        case 'title': cmp = a.title.localeCompare(b.title); break
        case 'client': cmp = a.client.localeCompare(b.client); break
        case 'agent': cmp = a.agent.localeCompare(b.agent); break
        case 'priority': cmp = priorityOrder[a.priority] - priorityOrder[b.priority]; break
        case 'created': cmp = new Date(a.created).getTime() - new Date(b.created).getTime(); break
        case 'finished': cmp = new Date(a.finished || '').getTime() - new Date(b.finished || '').getTime(); break
        case 'duration':
          const da = a.started && a.finished ? durationMinutes(a.started, a.finished) : 0
          const db = b.started && b.finished ? durationMinutes(b.started, b.finished) : 0
          cmp = da - db; break
        case 'result': cmp = (a.result || '').localeCompare(b.result || ''); break
      }
      return histSortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [tasks, histSearch, histClient, histAgent, histStatus, histSort, histSortDir])

  const histStats = useMemo(() => {
    const all = tasks.filter(t => t.status === 'completed')
    const success = all.filter(t => t.result === 'success').length
    const errors = all.filter(t => t.result === 'error').length
    const durations = all.filter(t => t.started && t.finished).map(t => durationMinutes(t.started!, t.finished!))
    const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
    return { total: all.length, successRate: all.length ? Math.round(success / all.length * 100) : 0, avgDuration: avg, errorRate: all.length ? Math.round(errors / all.length * 100) : 0 }
  }, [tasks])

  function toggleSort(key: SortKey) {
    if (histSort === key) setHistSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setHistSort(key); setHistSortDir('desc') }
  }

  function handleDragStart(taskId: string) { dragItem.current = taskId }

  function handleDrop(newStatus: 'queued' | 'active' | 'completed') {
    if (!dragItem.current) return
    setTasks(prev => prev.map(t => {
      if (t.id !== dragItem.current) return t
      const updated = { ...t, status: newStatus }
      if (newStatus === 'active' && !t.started) updated.started = new Date().toISOString()
      if (newStatus === 'completed') { updated.finished = new Date().toISOString(); updated.progress = 100; updated.result = 'success' }
      if (newStatus === 'queued') { updated.started = undefined; updated.progress = undefined; updated.currentStep = undefined }
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
        className="glass-task-card group"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'active' ? 'bg-blue-500 animate-pulse' : task.result === 'success' ? 'bg-green-500' : task.result === 'error' ? 'bg-red-500' : pc.dot}`} />
            <h4 className="text-sm font-semibold text-white truncate">{task.title}</h4>
          </div>
          <span className={`badge text-[10px] flex-shrink-0 ml-2 ${pc.color}`} style={{ background: pc.bg }}>{pc.label}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.client}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.agent}</span>
        </div>
        {task.status === 'active' && task.progress !== undefined && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-blue-400 font-medium">{task.currentStep}</span>
              <span className="text-[11px] font-semibold text-blue-400">{task.progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,122,255,0.1)' }}>
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        )}
        {task.status === 'completed' && task.result && (
          <div className={`mb-2 text-[11px] font-medium flex items-center gap-1 ${task.result === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            <Icon name={task.result === 'success' ? 'check' : 'xmark'} size={12} />
            {task.result === 'success' ? 'Gennemført' : 'Fejlet'}
          </div>
        )}
        <p className="text-[11px] mb-3 line-clamp-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.lastActivity}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Icon name="timer" size={12} />
            <span>{task.estimatedMinutes}m</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span>{timeAgo(task.created)}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.status === 'active' && (
              <button onClick={e => { e.stopPropagation(); handleAction(task.id, 'pause') }} className="w-6 h-6 flex items-center justify-center rounded-lg text-white/50" style={{ background: 'rgba(255,255,255,0.06)' }} title="Pause"><Icon name="pause" size={12} /></button>
            )}
            <button onClick={e => { e.stopPropagation(); handleAction(task.id, 'restart') }} className="w-6 h-6 flex items-center justify-center rounded-lg text-white/50" style={{ background: 'rgba(255,255,255,0.06)' }} title="Genstart"><Icon name="restart" size={12} /></button>
            {task.status !== 'completed' && (
              <button onClick={e => { e.stopPropagation(); handleAction(task.id, 'cancel') }} className="w-6 h-6 flex items-center justify-center rounded-lg text-red-400" style={{ background: 'rgba(255,59,48,0.06)' }} title="Annuller"><Icon name="xmark" size={12} /></button>
            )}
            <button onClick={e => { e.stopPropagation(); setSelectedTask(task) }} className="w-6 h-6 flex items-center justify-center rounded-lg text-white/50" style={{ background: 'rgba(255,255,255,0.06)' }} title="Detaljer"><Icon name="chevron-right" size={12} /></button>
          </div>
        </div>
      </div>
    )
  }

  const Column = ({ title, count, color, tasks: columnTasks, status }: { title: string; count: number; color: string; tasks: Task[]; status: 'queued' | 'active' | 'completed' }) => (
    <div className="flex-1 min-w-[300px]" onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(status)}>
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

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <th
      onClick={() => toggleSort(sortKey)}
      className="table-header text-left px-4 py-3 cursor-pointer select-none"
    >
      <span className="flex items-center gap-1">
        {label}
        {histSort === sortKey && <Icon name="arrow-up-down" size={12} className={histSortDir === 'asc' ? '' : 'rotate-180'} />}
      </span>
    </th>
  )

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <h1 className="page-title">Opgaver</h1>
        <div className="glass-toggle-group flex items-center">
          {(['kanban', 'livefeed', 'historik'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 text-sm font-medium rounded-xl transition-all ${viewMode === m ? 'glass-toggle-active text-white' : 'text-white/50'}`}>
              {m === 'kanban' ? 'Kanban' : m === 'livefeed' ? 'Live Feed' : 'Historik'}
            </button>
          ))}
        </div>
      </div>
      <p className="caption mb-5">Opgavestyring og realtidsoverblik</p>

      {viewMode === 'kanban' && (
        <>
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
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"><Icon name="magnifying-glass" size={14} /></span>
              <input type="text" placeholder="Søg efter titel..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input text-xs py-1.5 w-48 pl-8" />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} className="rounded" />
              Kun mine opgaver
            </label>
          </div>
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
              const evType = eventTypeConfig[event.type]
              return (
                <div key={event.id} onClick={() => { const t = tasks.find(t => t.id === event.taskId); if (t) setSelectedTask(t) }} className="card flex items-start gap-4 cursor-pointer">
                  <span className="mt-0.5"><Icon name={evType.icon} size={18} className={event.type === 'error' ? 'text-red-400' : event.type === 'task_done' ? 'text-green-400' : 'text-white/50'} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{evType.label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{event.agent}</span>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{event.client}</span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: '#ffffff' }}>{event.taskTitle}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{event.message}</p>
                  </div>
                  <span className="text-[11px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDate(event.timestamp)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {viewMode === 'historik' && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Total opgaver', value: histStats.total.toString(), icon: 'checklist' },
              { label: 'Succesrate', value: `${histStats.successRate}%`, icon: 'check' },
              { label: 'Gns. varighed', value: formatDuration(histStats.avgDuration), icon: 'clock' },
              { label: 'Fejlrate', value: `${histStats.errorRate}%`, icon: 'xmark' },
            ].map((s, i) => (
              <div key={i} className="card">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={s.icon} size={16} className="text-white/40" />
                  <p className="caption">{s.label}</p>
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"><Icon name="magnifying-glass" size={14} /></span>
              <input type="text" placeholder="Søg i opgaver..." value={histSearch} onChange={e => setHistSearch(e.target.value)} className="input text-xs py-1.5 w-full pl-8" />
            </div>
            <select value={histClient} onChange={e => setHistClient(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle klienter</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={histAgent} onChange={e => setHistAgent(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle agenter</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={histStatus} onChange={e => setHistStatus(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle statusser</option>
              <option value="success">Succes</option>
              <option value="error">Fejl</option>
            </select>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <SortHeader label="Opgave" sortKey="title" />
                    <SortHeader label="Klient" sortKey="client" />
                    <SortHeader label="Agent" sortKey="agent" />
                    <SortHeader label="Prioritet" sortKey="priority" />
                    <SortHeader label="Oprettet" sortKey="created" />
                    <SortHeader label="Afsluttet" sortKey="finished" />
                    <SortHeader label="Varighed" sortKey="duration" />
                    <SortHeader label="Status" sortKey="result" />
                  </tr>
                </thead>
                <tbody>
                  {histTasks.map(task => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)} className="glass-row cursor-pointer">
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: '#ffffff' }}>{task.title}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{task.client}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{task.agent}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[10px] ${priorityConfig[task.priority].color}`} style={{ background: priorityConfig[task.priority].bg }}>{priorityConfig[task.priority].label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDate(task.created)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.finished ? formatDate(task.finished) : '-'}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {task.started && task.finished ? formatDuration(durationMinutes(task.started, task.finished)) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[10px] ${task.result === 'success' ? 'text-green-400' : 'text-red-400'}`} style={{ background: task.result === 'success' ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)' }}>
                          <Icon name={task.result === 'success' ? 'check' : 'xmark'} size={10} />
                          {task.result === 'success' ? 'Succes' : 'Fejl'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <span className={`badge ${selectedTask.status === 'active' ? 'text-blue-400' : selectedTask.status === 'completed' ? (selectedTask.result === 'success' ? 'text-green-400' : 'text-red-400') : 'text-yellow-700'}`} style={{ background: selectedTask.status === 'active' ? 'rgba(0,122,255,0.1)' : selectedTask.status === 'completed' ? (selectedTask.result === 'success' ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)') : 'rgba(255,149,0,0.1)' }}>
                    {selectedTask.status === 'queued' ? 'I kø' : selectedTask.status === 'active' ? 'Aktiv' : 'Afsluttet'}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Prioritet</p>
                  <span className={`badge ${priorityConfig[selectedTask.priority].color}`} style={{ background: priorityConfig[selectedTask.priority].bg }}>{priorityConfig[selectedTask.priority].label}</span>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Agent</p>
                  <p className="text-sm font-medium">{selectedTask.agent}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Klient</p>
                  <p className="text-sm font-medium">{selectedTask.client}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Type</p>
                  <p className="text-sm font-medium">{selectedTask.type}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Estimeret</p>
                  <p className="text-sm font-medium">{selectedTask.estimatedMinutes} min</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Oprettet</p>
                  <p className="text-sm">{formatDate(selectedTask.created)}</p>
                </div>
                {selectedTask.started && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Startet</p>
                    <p className="text-sm">{formatDate(selectedTask.started)}</p>
                  </div>
                )}
              </div>

              {selectedTask.status === 'active' && selectedTask.progress !== undefined && (
                <div className="mb-6">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-blue-400">{selectedTask.currentStep}</span>
                    <span className="text-sm font-bold text-blue-400">{selectedTask.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,122,255,0.1)' }}>
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${selectedTask.progress}%` }} />
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#ffffff' }}>Trin</h3>
                <div className="space-y-2">
                  {selectedTask.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.status === 'done' ? 'text-green-400' :
                        step.status === 'running' ? 'text-blue-400 animate-pulse' :
                        step.status === 'error' ? 'text-red-400' : 'text-white/40'
                      }`} style={{ background: step.status === 'done' ? 'rgba(52,199,89,0.1)' : step.status === 'running' ? 'rgba(0,122,255,0.1)' : step.status === 'error' ? 'rgba(255,59,48,0.1)' : 'rgba(142,142,147,0.1)' }}>
                        {step.status === 'done' ? <Icon name="check" size={10} /> : step.status === 'running' ? <Icon name="play" size={10} /> : step.status === 'error' ? '!' : (i + 1)}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: '#ffffff' }}>{step.name}</p>
                        {step.tool && <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Værktøj: {step.tool}</p>}
                      </div>
                      {step.finishedAt && step.startedAt && (
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {Math.round((new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()) / 60000)}m
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {selectedTask.status === 'active' && (
                  <button onClick={() => { handleAction(selectedTask.id, 'pause'); setSelectedTask(null) }} className="btn-secondary text-xs flex items-center gap-1.5"><Icon name="pause" size={12} /> Pause</button>
                )}
                <button onClick={() => { handleAction(selectedTask.id, 'restart'); setSelectedTask(null) }} className="btn-secondary text-xs flex items-center gap-1.5"><Icon name="restart" size={12} /> Genstart</button>
                {selectedTask.status !== 'completed' && (
                  <button onClick={() => { handleAction(selectedTask.id, 'cancel'); setSelectedTask(null) }} className="btn-secondary text-xs text-red-400 flex items-center gap-1.5"><Icon name="xmark" size={12} /> Annuller</button>
                )}
                {selectedTask.journalRef && (
                  <button className="btn-primary text-xs flex items-center gap-1.5"><Icon name="doc-text" size={12} /> Gå til journal</button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
