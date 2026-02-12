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

export interface SessionMessage {
  role: string
  text?: string
  content?: string
  timestamp?: number
}

export interface SessionWithMessages extends ApiSession {
  lastMessages?: SessionMessage[]
}

export async function fetchSessionHistory(sessionKey: string, limit = 5): Promise<SessionMessage[]> {
  const data = await invokeToolRaw('sessions_history', { sessionKey, limit, includeTools: false }) as any
  const text = data.result?.content?.[0]?.text
  if (text) {
    try {
      const parsed = JSON.parse(text)
      return parsed.messages || parsed || []
    } catch { /* fall through */ }
  }
  if (data.result?.details?.messages) return data.result.details.messages
  return []
}

export async function fetchSessions(): Promise<SessionsResponse> {
  const data = await invokeToolRaw('sessions_list', { messageLimit: 2 }) as any
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
    try {
      const parsed = JSON.parse(text)
      // config.get returns { ok, result: { path, exists, raw: "..." } }
      // We need to parse the raw JSON string inside result
      if (parsed.result?.raw) {
        const raw = parsed.result.raw
        return typeof raw === 'string' ? JSON.parse(raw) : raw
      }
      // If it's already the config object (has channels/agents etc)
      if (parsed.channels || parsed.agents) return parsed
      return parsed
    } catch { /* fall through */ }
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
  // Use CLI command via exec tool
  const data = await invokeToolRaw('exec', { command: 'openclaw agents list --json' }) as any
  const text = data.result?.content?.[0]?.text
  if (text) {
    try {
      // Parse JSON output from CLI
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed
      return parsed.agents || []
    } catch (e) {
      // Fallback: return empty array if parsing fails
      console.error('Failed to parse agents list:', e)
      return []
    }
  }
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
  // Create a real agent using CLI command
  const cmd = `openclaw agents add --name "${config.name}" --model "${config.model || 'claude-sonnet-4-5'}"`
  const result = await invokeToolRaw('exec', { command: cmd }) as any
  
  // If initialTask is provided, spawn a session for this agent with the task
  if (config.task && result) {
    return invokeToolRaw('sessions_spawn', {
      task: config.task,
      model: config.model,
      label: config.label || config.name,
    })
  }
  
  return result
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

// --- Live data functions (no mock) ---

export async function fetchWorkspaceFiles(): Promise<{ name: string; size: string; modified: string; type: string }[]> {
  const data = await invokeToolRaw('exec', {
    command: `find /data/.openclaw/workspace -maxdepth 2 -type f \\( -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.js" -o -name "*.mjs" \\) -printf '%p|%s|%T@|%f\\n' 2>/dev/null | sort -t'|' -k3 -rn | head -50`
  }) as any
  const text = data.result?.content?.[0]?.text || ''
  return text.split('\n').filter(Boolean).map((line: string) => {
    const [path, size, mtime, name] = line.split('|')
    const sizeNum = parseInt(size || '0')
    const sizeStr = sizeNum > 1024 ? `${(sizeNum / 1024).toFixed(1)} KB` : `${sizeNum} B`
    const date = new Date(parseFloat(mtime || '0') * 1000)
    const dateStr = date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
    const ext = (name || '').split('.').pop()?.toUpperCase() || 'FIL'
    return { name: name || path, path, size: sizeStr, modified: dateStr, type: ext }
  })
}

export async function fetchSystemInfo(): Promise<Record<string, string>> {
  const data = await invokeToolRaw('exec', {
    command: `echo "host=$(hostname)|os=$(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2)|kernel=$(uname -r) ($(uname -m))|cpu=$(lscpu 2>/dev/null | grep 'Model name' | cut -d: -f2 | xargs)|ram_total=$(free -h | awk '/Mem:/{print $2}')|ram_used=$(free -h | awk '/Mem:/{print $3}')|ram_avail=$(free -h | awk '/Mem:/{print $7}')|disk_total=$(df -h / | awk 'NR==2{print $2}')|disk_used=$(df -h / | awk 'NR==2{print $3}')|disk_pct=$(df / | awk 'NR==2{print $5}')|node=$(node -v 2>/dev/null)|uptime=$(uptime -p 2>/dev/null || uptime)"`
  }) as any
  const text = data.result?.content?.[0]?.text || ''
  const info: Record<string, string> = {}
  text.split('|').forEach((pair: string) => {
    const [k, ...v] = pair.split('=')
    if (k) info[k.trim()] = v.join('=').trim()
  })
  return info
}

export async function runPrompt(prompt: string, model?: string): Promise<{ sessionKey: string; result: string }> {
  const data = await invokeToolRaw('sessions_spawn', {
    task: prompt,
    model: model || 'sonnet',
    label: 'workshop-run',
  }) as any
  return {
    sessionKey: data.result?.details?.childSessionKey || data.result?.content?.[0]?.text || '',
    result: data.result?.content?.[0]?.text || JSON.stringify(data.result?.details || {})
  }
}

export async function fetchCronRuns(jobId: string): Promise<any[]> {
  const data = await invokeToolRaw('cron', { action: 'runs', jobId }) as any
  const text = data.result?.content?.[0]?.text
  if (text) {
    try { const p = JSON.parse(text); return p.runs || p || [] } catch { /* */ }
  }
  return []
}

export async function searchWorkspace(query: string): Promise<{ file: string; line: number; text: string }[]> {
  const data = await invokeToolRaw('exec', {
    command: `grep -rn --include="*.md" --include="*.ts" --include="*.tsx" --include="*.json" -i "${query.replace(/"/g, '\\"')}" /data/.openclaw/workspace/ 2>/dev/null | head -30`
  }) as any
  const text = data.result?.content?.[0]?.text || ''
  return text.split('\n').filter(Boolean).map((line: string) => {
    const match = line.match(/^(.+?):(\d+):(.*)$/)
    if (!match) return { file: '', line: 0, text: line }
    return { file: match[1].replace('/data/.openclaw/workspace/', ''), line: parseInt(match[2]), text: match[3].trim() }
  }).filter((r: any) => r.file)
}

export async function fetchAllSessionHistory(limit = 20): Promise<{ session: string; role: string; text: string; timestamp?: number }[]> {
  // Get all sessions, then fetch recent messages from each
  const sessionsData = await fetchSessions()
  const entries: { session: string; role: string; text: string; timestamp?: number }[] = []
  const sessions = sessionsData.sessions?.slice(0, 10) || []
  
  for (const s of sessions) {
    try {
      const msgs = await fetchSessionHistory(s.key, 3)
      for (const m of msgs) {
        entries.push({
          session: s.displayName || s.label || s.key,
          role: m.role,
          text: (m.text || m.content || '').slice(0, 300),
          timestamp: m.timestamp
        })
      }
    } catch { /* skip */ }
  }
  
  return entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, limit)
}
