import { Agent, JournalEntry, Document, Client, CronJob, ApiUsageRecord, EvalDataset, EvalRun, WorkshopTemplate, Incident, WeeklyMetrics } from '../types'

export const agents: Agent[] = [
  {
    id: 'a1', name: 'Hovedagent', status: 'running',
    purpose: 'Primær AI-assistent — forbundet med Martin via Telegram (@Sarviobot)',
    model: 'claude-opus-4-6', instructions: 'Hovedagent for OpenClaw-instansen. Håndterer alle brugerforespørgsler, koordinerer sub-agenter, administrerer workspace og kanaler.',
    tools: ['web_search', 'web_fetch', 'browser', 'exec', 'read', 'write', 'edit', 'message', 'tts', 'image', 'nodes'],
    skills: ['perplexity', 'youtube-watcher'],
    memoryPolicy: '200k kontekstvindue', rateLimit: '4 samtidige agenter',
    timeout: 'Ingen grænse', retries: 0, lastRun: 'Aktiv nu', runsToday: 1
  },
  {
    id: 'a2', name: 'mission-kontrol-builder', status: 'completed',
    purpose: 'Sub-agent der byggede Mission Kontrol webappen',
    model: 'claude-opus-4-6', instructions: 'Byg Mission Kontrol webapp med React, TypeScript og Tailwind CSS. Apple-inspireret design.',
    tools: ['exec', 'read', 'write', 'edit'],
    skills: [],
    memoryPolicy: 'Enkeltkørsel', rateLimit: '8 samtidige sub-agenter',
    timeout: 'Automatisk', retries: 0, lastRun: 'Afsluttet', runsToday: 1
  },
  {
    id: 'a3', name: 'mission-kontrol-danish', status: 'running',
    purpose: 'Sub-agent der oversætter Mission Kontrol til dansk med rigtig data',
    model: 'claude-opus-4-6', instructions: 'Genbyg Mission Kontrol med dansk UI og ægte data fra OpenClaw-instansen.',
    tools: ['exec', 'read', 'write', 'edit'],
    skills: [],
    memoryPolicy: 'Enkeltkørsel', rateLimit: '8 samtidige sub-agenter',
    timeout: 'Automatisk', retries: 0, lastRun: 'Aktiv nu', runsToday: 1
  },
]

export const journalEntries: JournalEntry[] = [
  { id: 'j1', timestamp: '2026-02-12 05:33', agent: 'Hovedagent', client: 'Martin', task: 'Genbyg Mission Kontrol med dansk UI', severity: 'info', prompt: 'Rebuild Mission Kontrol webapp med dansk tekst og rigtig data...', output: 'Sub-agent spawnet: mission-kontrol-danish. Arbejder på at oversætte og opdatere alle moduler.', tools: ['exec', 'write', 'edit'], documentsRead: ['AGENTS.md', 'TOOLS.md'], documentsWritten: [], latencyMs: 1200, cost: 0.0, pinned: false, notes: '', tags: ['mission-kontrol', 'dansk', 'rebuild'] },
  { id: 'j2', timestamp: '2026-02-12 04:58', agent: 'mission-kontrol-builder', client: 'Martin', task: 'Byg Mission Kontrol webapp v1', severity: 'info', prompt: 'Byg en komplet operations-dashboard webapp...', output: 'Mission Kontrol webapp bygget med succes. 13 moduler, Apple-inspireret design, React + TypeScript + Tailwind.', tools: ['exec', 'write', 'read'], documentsRead: [], documentsWritten: ['mission-kontrol/*'], latencyMs: 45000, cost: 0.0, pinned: true, notes: 'Første version med mock data', tags: ['mission-kontrol', 'webapp', 'build'] },
  { id: 'j3', timestamp: '2026-02-12 03:00', agent: 'Hovedagent', client: 'Martin', task: 'System status tjek', severity: 'info', prompt: 'Tjek systemstatus og konfiguration', output: 'System kører fint. Debian 13, 2 vCPU, 7.8 GB RAM, 96 GB disk. OpenClaw v2026.2.9. Telegram aktiv.', tools: ['exec'], documentsRead: [], documentsWritten: [], latencyMs: 800, cost: 0.0, pinned: false, notes: '', tags: ['system', 'status'] },
  { id: 'j4', timestamp: '2026-02-11 22:00', agent: 'Hovedagent', client: 'Martin', task: 'WhatsApp forbindelse advarsel', severity: 'warning', prompt: 'WhatsApp kanal status check', output: 'WhatsApp er linket men ingen aktiv Web-session. Anbefaler genforbindelse via QR-kode.', tools: ['exec'], documentsRead: [], documentsWritten: [], latencyMs: 500, cost: 0.0, pinned: false, notes: 'WhatsApp kræver regelmæssig genforbindelse', tags: ['whatsapp', 'advarsel'] },
  { id: 'j5', timestamp: '2026-02-11 20:00', agent: 'Hovedagent', client: 'Martin', task: 'Workspace bootstrap', severity: 'info', prompt: 'Initialiser workspace-filer og konfiguration', output: 'Workspace konfigureret med AGENTS.md, BOOT.md, BOOTSTRAP.md, HEARTBEAT.md, IDENTITY.md, MEMORY.md, SOUL.md, TOOLS.md, USER.md', tools: ['write', 'read'], documentsRead: [], documentsWritten: ['AGENTS.md', 'TOOLS.md', 'IDENTITY.md'], latencyMs: 2000, cost: 0.0, pinned: false, notes: '', tags: ['workspace', 'bootstrap'] },
]

export const documents: Document[] = [
  { id: 'd1', name: 'AGENTS.md', type: 'Markdown', size: '4.2 KB', version: 1, tags: ['workspace', 'config'], lastModified: '2026-02-11', usedInRuns: 5, doNotUse: false, uploadedBy: 'System' },
  { id: 'd2', name: 'TOOLS.md', type: 'Markdown', size: '1.8 KB', version: 1, tags: ['workspace', 'værktøjer'], lastModified: '2026-02-11', usedInRuns: 3, doNotUse: false, uploadedBy: 'System' },
  { id: 'd3', name: 'IDENTITY.md', type: 'Markdown', size: '1.2 KB', version: 1, tags: ['workspace', 'identitet'], lastModified: '2026-02-11', usedInRuns: 2, doNotUse: false, uploadedBy: 'System' },
  { id: 'd4', name: 'MEMORY.md', type: 'Markdown', size: '0.8 KB', version: 1, tags: ['workspace', 'hukommelse'], lastModified: '2026-02-11', usedInRuns: 1, doNotUse: false, uploadedBy: 'System' },
  { id: 'd5', name: 'SOUL.md', type: 'Markdown', size: '1.5 KB', version: 1, tags: ['workspace', 'personlighed'], lastModified: '2026-02-11', usedInRuns: 1, doNotUse: false, uploadedBy: 'System' },
  { id: 'd6', name: 'BOOT.md', type: 'Markdown', size: '0.6 KB', version: 1, tags: ['workspace', 'opstart'], lastModified: '2026-02-11', usedInRuns: 1, doNotUse: false, uploadedBy: 'System' },
  { id: 'd7', name: 'BOOTSTRAP.md', type: 'Markdown', size: '0.9 KB', version: 1, tags: ['workspace', 'bootstrap'], lastModified: '2026-02-11', usedInRuns: 1, doNotUse: false, uploadedBy: 'System' },
  { id: 'd8', name: 'HEARTBEAT.md', type: 'Markdown', size: '0.5 KB', version: 1, tags: ['workspace', 'hjerterytme'], lastModified: '2026-02-11', usedInRuns: 1, doNotUse: false, uploadedBy: 'System' },
  { id: 'd9', name: 'USER.md', type: 'Markdown', size: '0.7 KB', version: 1, tags: ['workspace', 'bruger'], lastModified: '2026-02-11', usedInRuns: 1, doNotUse: false, uploadedBy: 'System' },
]

export const clients: Client[] = [
  { id: 'c1', name: 'Martin Sarvio', email: 'martin@flow.dk', company: 'FLOW / OrderFlow AI', status: 'active', activeTasks: 2, documents: 9, apiKey: 'Via Telegram @Sarviobot', role: 'admin', lastActive: 'Lige nu', totalSpend: 0 },
]

export const cronJobs: CronJob[] = []

export const apiUsageData: ApiUsageRecord[] = [
  { date: '6. feb', tokens: 0, requests: 0, cost: 0, errors: 0 },
  { date: '7. feb', tokens: 0, requests: 0, cost: 0, errors: 0 },
  { date: '8. feb', tokens: 0, requests: 0, cost: 0, errors: 0 },
  { date: '9. feb', tokens: 0, requests: 0, cost: 0, errors: 0 },
  { date: '10. feb', tokens: 12000, requests: 8, cost: 0, errors: 0 },
  { date: '11. feb', tokens: 85000, requests: 42, cost: 0, errors: 0 },
  { date: '12. feb', tokens: 120000, requests: 56, cost: 0, errors: 0 },
]

export const evalDatasets: EvalDataset[] = []
export const evalRuns: EvalRun[] = []

export const workshopTemplates: WorkshopTemplate[] = [
  { id: 'w1', name: 'Websøgning', prompt: 'Søg efter følgende emne og giv et samlet overblik:\n\n{{emne}}', lastUsed: '2026-02-12', runs: 3 },
  { id: 'w2', name: 'YouTube Transskription', prompt: 'Hent og opsummer transskription fra denne video:\n\n{{video_url}}', lastUsed: '2026-02-11', runs: 1 },
]

export const incidents: Incident[] = [
  { id: 'i1', title: 'Modeller under anbefalet niveau (haiku)', severity: 'warning', status: 'active', agent: 'System', client: 'Intern', timestamp: '2026-02-12', description: 'Nogle konfigurerede modeller er under de anbefalede niveauer' },
  { id: 'i2', title: 'Credentials-mappe læsbar af andre', severity: 'warning', status: 'active', agent: 'System', client: 'Intern', timestamp: '2026-02-12', description: 'Credentials-mappen har tilstand 755 — bør begrænses' },
  { id: 'i3', title: 'WhatsApp ingen aktiv session', severity: 'warning', status: 'active', agent: 'System', client: 'Intern', timestamp: '2026-02-12', description: 'WhatsApp er linket men mangler aktiv Web-session' },
  { id: 'i4', title: 'iMessage ikke klar', severity: 'warning', status: 'active', agent: 'System', client: 'Intern', timestamp: '2026-02-12', description: 'iMessage er konfigureret men imsg er ikke klar' },
]

export const weeklyMetrics: WeeklyMetrics = {
  tasksCompleted: 3, tasksInProgress: 1, tasksBlocked: 0,
  totalCost: 0, qualityScore: 100,
  incidents: incidents,
  costPerClient: [
    { client: 'Martin Sarvio', cost: 0 },
  ],
  suggestions: [
    'Konfigurer Discord, Slack, Google Chat og Nostr kanaler for fuld dækning',
    'Genopret WhatsApp Web-session for at aktivere beskeder',
    'Tilføj planlagte jobs (cron) for automatiserede opgaver',
    'Overvej at begrænse credentials-mappens tilladelser (chmod 700)',
    'Opsæt evalueringsdatasæt for at måle agentkvalitet',
  ]
}

export const channels = [
  { name: 'Telegram', status: 'ok' as const, detail: '@Sarviobot — dmPolicy: pairing', enabled: true },
  { name: 'WhatsApp', status: 'warning' as const, detail: 'Linket men ingen aktiv Web-session', enabled: true },
  { name: 'Discord', status: 'setup' as const, detail: 'Ingen token konfigureret', enabled: true },
  { name: 'Google Chat', status: 'setup' as const, detail: 'Ikke konfigureret', enabled: true },
  { name: 'Slack', status: 'setup' as const, detail: 'Ingen tokens', enabled: true },
  { name: 'iMessage', status: 'warning' as const, detail: 'Konfigureret men imsg ikke klar', enabled: true },
  { name: 'Nostr', status: 'setup' as const, detail: 'Ikke konfigureret', enabled: true },
  { name: 'Signal', status: 'off' as const, detail: 'Deaktiveret', enabled: false },
]

export const systemInfo = {
  host: 'a426331a6530',
  hostType: 'Hostinger VPS, Docker container',
  os: 'Debian 13 (trixie)',
  kernel: 'Linux 6.8.0-94-generic (x64)',
  cpu: 'AMD EPYC 9354P 32-Core (2 vCPU)',
  ramTotal: '7.8 GB',
  ramUsed: '1.2 GB',
  ramAvailable: '6.5 GB',
  diskTotal: '96 GB',
  diskUsed: '22 GB',
  diskPercent: 23,
  nodeVersion: 'v22.22.0',
  uptime: '1 dag 18+ timer',
  openclawVersion: '2026.2.9',
  gatewayMode: 'lokal tilstand, port 18789',
  primaryModel: 'anthropic/claude-opus-4-6',
  maxAgents: 4,
  maxSubagents: 8,
}

export const availableModels = [
  'claude-opus-4-6', 'claude-sonnet-4-5', 'claude-opus-4-5', 'claude-opus-4-1',
  'claude-opus-4-0', 'claude-sonnet-4-0', 'claude-haiku-4-5', 'claude-3-5-haiku-latest',
  'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'gpt-5.2',
  'gemini-3-flash-preview', 'grok-4-1-fast-reasoning'
]

export const dashboardStats = {
  activeTasks: 1,
  agentStatus: { running: 2, idle: 0, paused: 0, failed: 0, completed: 1 },
  cronActive: 0, cronFailed: 0,
  apiToday: { tokens: 120000, requests: 56, cost: 0 },
  attentionItems: [
    { id: '1', title: 'Modeller under anbefalet niveau (haiku)', severity: 'warning' as const, source: 'Sikkerhed' },
    { id: '2', title: 'Credentials-mappe læsbar af andre (755)', severity: 'warning' as const, source: 'Sikkerhed' },
    { id: '3', title: 'WhatsApp: ingen aktiv Web-session', severity: 'warning' as const, source: 'Kanaler' },
    { id: '4', title: 'iMessage: konfigureret men ikke klar', severity: 'warning' as const, source: 'Kanaler' },
    { id: '5', title: 'Discord, Slack, Google Chat, Nostr: ikke konfigureret', severity: 'info' as const, source: 'Kanaler' },
  ]
}
