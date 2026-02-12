// OpenClaw Gateway API Client

const STORAGE_KEY_URL = 'openclaw-gateway-url'
const STORAGE_KEY_TOKEN = 'openclaw-gateway-token'

const DEFAULT_URL = 'http://127.0.0.1:63362'

export function getGatewayUrl(): string {
  return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_URL
}

export function getGatewayToken(): string {
  return localStorage.getItem(STORAGE_KEY_TOKEN) || ''
}

export function setGatewayUrl(url: string) {
  localStorage.setItem(STORAGE_KEY_URL, url)
}

export function setGatewayToken(token: string) {
  localStorage.setItem(STORAGE_KEY_TOKEN, token)
}

function resolveApiUrl(base: string): string {
  // If running on Vercel and gateway is external, use the proxy rewrite to avoid CORS
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') && base.includes('ts.net')) {
    return '/api/gateway'
  }
  return base
}

async function invokeToolRaw(tool: string, args: Record<string, unknown>): Promise<unknown> {
  const url = resolveApiUrl(getGatewayUrl())
  const token = getGatewayToken()
  if (!token) throw new Error('Ingen auth token konfigureret')

  const res = await fetch(`${url}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ tool, args }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (!data.ok) throw new Error(data.error?.message || 'API fejl')
  return data
}

export interface ApiSession {
  key: string
  kind: string
  channel: string
  label?: string
  displayName: string
  updatedAt: number
  sessionId: string
  model: string
  contextTokens?: number
  totalTokens?: number
  systemSent?: boolean
  abortedLastRun?: boolean
  lastChannel: string
  transcriptPath: string
}

export interface SessionsResponse {
  count: number
  sessions: ApiSession[]
}

export interface CronJobApi {
  id: string
  name: string
  schedule: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
  command?: string
  tool?: string
  args?: Record<string, unknown>
}

export async function fetchSessions(): Promise<SessionsResponse> {
  const data = await invokeToolRaw('sessions_list', { messageLimit: 0 }) as any
  // The result text is JSON string
  const text = data.result?.content?.[0]?.text
  if (text) {
    try { return JSON.parse(text) } catch { /* fall through */ }
  }
  // Try details directly
  if (data.result?.details?.sessions) return data.result.details
  throw new Error('Ugyldigt sessions svar')
}

export async function fetchStatus(): Promise<string> {
  const data = await invokeToolRaw('session_status', {}) as any
  const text = data.result?.content?.[0]?.text
  if (text) return text
  throw new Error('Ugyldigt status svar')
}

export async function fetchCronJobs(): Promise<CronJobApi[]> {
  const data = await invokeToolRaw('cron', { action: 'list', includeDisabled: true }) as any
  const text = data.result?.content?.[0]?.text
  if (text) {
    try {
      const parsed = JSON.parse(text)
      return parsed.jobs || []
    } catch { /* fall through */ }
  }
  if (data.result?.details?.jobs) return data.result.details.jobs
  return []
}

export async function fetchConfig(): Promise<Record<string, any>> {
  const data = await invokeToolRaw('gateway', { action: 'config.get' }) as any
  const text = data.result?.content?.[0]?.text
  if (text) {
    try { return JSON.parse(text) } catch { /* fall through */ }
  }
  if (data.result?.details) return data.result.details
  throw new Error('Ugyldigt config svar')
}

export interface AgentApi {
  name: string
  model: string
  workspace?: string
  skills?: string[]
  channels?: string[]
  cronJobs?: string[]
  sessions?: string[]
  contextTokens?: number
  totalTokens?: number
}

export async function listAgents(): Promise<AgentApi[]> {
  const data = await invokeToolRaw('agents_list', {}) as any
  const text = data.result?.content?.[0]?.text
  if (text) {
    try {
      const parsed = JSON.parse(text)
      return parsed.agents || []
    } catch { /* fall through */ }
  }
  if (data.result?.details?.agents) return data.result.details.agents
  return []
}

export async function createAgent(config: {
  name: string
  task: string
  model?: string
  label?: string
  skills?: string[]
  channels?: string[]
  workspace?: string
}): Promise<any> {
  // Create as a real agent, not just a session
  return invokeToolRaw('agents_create', {
    name: config.name,
    model: config.model || 'claude-sonnet-4-5',
    workspace: config.workspace,
    skills: config.skills,
    channels: config.channels,
    initialTask: config.task,
  })
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await fetchStatus()
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function listSkills(): Promise<any> {
  return invokeToolRaw('exec', { 
    command: 'ls /data/.openclaw/workspace/skills/ && for d in /data/.openclaw/workspace/skills/*/; do echo "---"; basename "$d"; cat "$d/SKILL.md" 2>/dev/null | head -5; done' 
  })
}

export async function installSkill(name: string): Promise<any> {
  return invokeToolRaw('exec', { 
    command: `cd /data/.openclaw/workspace && clawhub install ${name}` 
  })
}

export async function searchSkills(query: string): Promise<any> {
  return invokeToolRaw('exec', { 
    command: `clawhub search ${query}` 
  })
}
