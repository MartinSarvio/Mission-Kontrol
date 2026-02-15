// OpenClaw Gateway API Client

const STORAGE_KEY_URL = 'openclaw-gateway-url'
const STORAGE_KEY_TOKEN = 'openclaw-gateway-token'

// Use Tauri's fetch in desktop app (bypasses CORS/cert issues), native fetch in browser
async function smartFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')
      const res = await tauriFetch(input instanceof URL ? input.toString() : input, {
        ...init,
        method: init?.method || 'GET',
        headers: init?.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : init?.headers as Record<string, string>,
      })
      return res
    } catch (e: any) {
      console.warn('[smartFetch] Tauri fetch failed, falling back to native:', e?.message)
      return fetch(input, init)
    }
  }
  return fetch(input, init)
}

function getDefaultUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return '/api/gateway'
  }
  return 'http://127.0.0.1:63362'
}

export function getGatewayUrl(): string {
  return localStorage.getItem(STORAGE_KEY_URL) || getDefaultUrl()
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

export async function invokeToolRaw(tool: string, args: Record<string, unknown>): Promise<unknown> {
  const url = resolveApiUrl(getGatewayUrl())
  const token = getGatewayToken()
  if (!token) throw new Error('Ingen auth token konfigureret')

  let res: Response
  try {
    res = await smartFetch(`${url}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tool, args }),
    })
  } catch (e: any) {
    throw new Error(`Netværksfejl: ${e?.message || e || 'Ukendt fejl'}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText || 'Ukendt'}`)
  }
  let data: any
  try {
    data = await res.json()
  } catch {
    throw new Error('Ugyldigt JSON svar fra gateway')
  }
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
  lastMessages?: SessionMessage[]
}

export interface SessionsResponse {
  count: number
  sessions: ApiSession[]
}

export interface CronJobApi {
  id: string
  name: string
  schedule: string | { kind?: string; expr?: string; tz?: string; everyMs?: number; at?: string }
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

// Ny funktion til fuld session historik med tool calls
export interface ToolCall {
  tool: string
  args: Record<string, any>
  result?: any
  timestamp?: number
}

export interface DetailedSessionMessage extends SessionMessage {
  toolCalls?: ToolCall[]
}

export async function getSessionHistory(sessionKey: string): Promise<DetailedSessionMessage[]> {
  const data = await invokeToolRaw('sessions_history', { 
    sessionKey, 
    includeTools: true, 
    limit: 50 
  }) as any
  
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
  // Use agents_list tool instead of exec
  const data = await invokeToolRaw('agents_list', {}) as any
  const text = data.result?.content?.[0]?.text
  if (text) {
    try {
      const parsed = JSON.parse(text)
      // agents_list returns { requester, allowAny, agents: [{ id, configured }] }
      if (parsed.agents && Array.isArray(parsed.agents)) {
        // Map API response to our AgentApi interface
        return parsed.agents.map((a: any) => ({
          name: a.id || 'unknown',
          model: a.configured?.model?.primary || 'claude-opus-4-6',
          workspace: a.configured?.workspace,
          skills: a.configured?.skills || [],
          channels: a.configured?.channels || [],
          cronJobs: [],
          sessions: [],
        }))
      }
      return []
    } catch (e) {
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
  // Create agent by spawning a session with the task
  return invokeToolRaw('sessions_spawn', {
    task: config.task || `Du er agent "${config.name}". Vent på instruktioner.`,
    model: config.model || 'sonnet',
    label: config.label || config.name,
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

export interface SkillInfo {
  name: string
  description: string
  location: 'workspace' | 'system'
  category: string
}

export async function fetchInstalledSkills(): Promise<SkillInfo[]> {
  try {
    // Call clawhub list to get installed skills
    const listData = await invokeToolRaw('exec', { command: 'clawhub list' }) as any
    const listText = listData.result?.content?.[0]?.text || ''
    
    const skills: SkillInfo[] = []
    const lines = listText.trim().split('\n').filter(Boolean)
    
    for (const line of lines) {
      // Parse "skill-name  version" format
      const match = line.trim().match(/^(\S+)\s+(\S+)$/)
      if (!match) continue
      
      const [, name, version] = match
      
      // Get description from clawhub inspect
      let description = 'No description available'
      let category = 'Andet'
      
      try {
        const inspectData = await invokeToolRaw('exec', { command: `clawhub inspect ${name}` }) as any
        const inspectText = inspectData.result?.content?.[0]?.text || ''
        
        // Parse "Summary: ..." line
        const summaryMatch = inspectText.match(/Summary:\s*(.+)/i)
        if (summaryMatch) {
          description = summaryMatch[1].trim()
        }
      } catch {
        // If inspect fails, use generic description
        description = `${name} v${version}`
      }
      
      // Detect category from name
      if (name.includes('github') || name.includes('git')) category = 'Udvikling'
      else if (name.includes('browser') || name.includes('web')) category = 'Automation'
      else if (name.includes('perplexity') || name.includes('search')) category = 'Søgning'
      else if (name.includes('youtube') || name.includes('video') || name.includes('media')) category = 'Medier'
      else if (name.includes('newsletter') || name.includes('mail')) category = 'Kommunikation'
      else if (name.includes('summarize') || name.includes('summary')) category = 'AI / Tekst'
      else if (name.includes('review') || name.includes('pr-')) category = 'Udvikling'
      
      skills.push({
        name,
        description,
        location: 'workspace', // All clawhub-installed skills are workspace
        category,
      })
    }
    
    return skills
  } catch (e) {
    console.error('Failed to fetch installed skills:', e)
    return []
  }
}

export async function installSkill(name: string): Promise<any> {
  // Use sessions_spawn to run clawhub install command
  return invokeToolRaw('sessions_spawn', {
    task: `Installer skill '${name}' via clawhub. Kør kommandoen: clawhub install ${name}`,
    model: 'sonnet',
    label: 'skill-install',
  })
}

export async function searchSkills(query: string): Promise<{ name: string; version: string; description: string; score: number }[]> {
  try {
    // Use clawhub search CLI command
    const data = await invokeToolRaw('exec', { command: `clawhub search ${query} --limit 15` }) as any
    const text = data.result?.content?.[0]?.text || ''
    
    const results: { name: string; version: string; description: string; score: number }[] = []
    const lines = text.trim().split('\n').filter(Boolean)
    
    for (const line of lines) {
      // Skip "- Searching" and empty lines
      if (line.includes('Searching') || !line.trim()) continue
      
      // Parse format: "skill-name vX.X.X  Description text  (score)"
      // Example: "lb-supabase-skill v0.1.0  Supabase Complete Documentation  (3.444)"
      const match = line.match(/^(\S+)\s+v?([\d.]+)\s+(.+?)\s+\(([\d.]+)\)/)
      if (match) {
        const [, name, version, description, scoreStr] = match
        results.push({
          name: name.trim(),
          version: version.trim(),
          description: description.trim(),
          score: parseFloat(scoreStr) / 10, // Normalize score to 0-1 range
        })
      }
    }
    
    return results
  } catch (e) {
    console.error('Failed to search ClawHub:', e)
    return []
  }
}

// --- Live data functions (no mock) ---

export async function readFileContent(path: string): Promise<string> {
  const data = await invokeToolRaw('read', { path }) as any
  const text = data.result?.content?.[0]?.text
  if (typeof text === 'string') return text
  throw new Error('Kunne ikke læse fil')
}

export async function downloadFile(path: string): Promise<{ content: string; name: string }> {
  const content = await readFileContent(path)
  const name = path.split('/').pop() || 'download'
  return { content, name }
}

export async function fetchWorkspaceFiles(): Promise<{ name: string; size: string; modified: string; type: string; path: string }[]> {
  // Use exec to get real file listing with sizes
  const data = await invokeToolRaw('exec', {
    command: 'find /data/.openclaw/workspace -maxdepth 3 -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.openclaw/workspace/mission-kontrol/src/*" | head -100 | while read f; do ls -lh "$f" 2>/dev/null; done'
  }) as any
  const text = data.result?.content?.[0]?.text || ''

  const results: { name: string; size: string; modified: string; type: string; path: string }[] = []
  const lines = text.split('\n').filter(Boolean)

  for (const line of lines) {
    // ls -lh output: -rw-r--r-- 1 root root 4.2K Feb 14 12:00 /data/.openclaw/workspace/FILE.md
    const match = line.match(/\S+\s+\S+\s+\S+\s+\S+\s+([\d.]+[KMGTP]?)\s+(\w+\s+\d+\s+[\d:]+)\s+(.+)$/)
    if (match) {
      const [, size, modified, fullPath] = match
      const name = fullPath.split('/').pop() || fullPath
      const ext = name.split('.').pop()?.toLowerCase() || ''
      const typeMap: Record<string, string> = {
        md: 'Markdown', txt: 'Tekst', json: 'JSON', js: 'JavaScript', ts: 'TypeScript',
        tsx: 'React TSX', jsx: 'React JSX', css: 'CSS', html: 'HTML', sh: 'Shell',
        yml: 'YAML', yaml: 'YAML', toml: 'TOML', mjs: 'ES Module',
      }
      results.push({
        name,
        path: fullPath.trim(),
        size,
        modified,
        type: typeMap[ext] || ext.toUpperCase() || 'Fil',
      })
    }
  }

  // Fallback if exec returned nothing
  if (results.length === 0) {
    const knownFiles = ['MEMORY.md', 'SOUL.md', 'USER.md', 'IDENTITY.md', 'TOOLS.md', 'AGENTS.md', 'HEARTBEAT.md', 'BOOT.md']
    for (const file of knownFiles) {
      results.push({
        name: file,
        path: `/data/.openclaw/workspace/${file}`,
        size: 'N/A',
        modified: 'Ukendt',
        type: 'Markdown',
      })
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchSystemInfo(): Promise<Record<string, string>> {
  // Use session_status and gateway config.get instead of exec
  const info: Record<string, string> = {}
  
  try {
    // Get session status for runtime info
    const statusData = await invokeToolRaw('session_status', {}) as any
    const statusText = statusData.result?.content?.[0]?.text || ''
    
    // Parse session_status output
    // Format: "Runtime: agent=main | host=... | os=... | model=... | ..."
    const runtimeMatch = statusText.match(/Runtime:\s*(.+)/i)
    if (runtimeMatch) {
      const pairs = runtimeMatch[1].split('|').map((p: string) => p.trim())
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split('=')
        const value = valueParts.join('=').trim()
        if (key && value) {
          const k = key.trim()
          if (k === 'host') info.host = value
          else if (k === 'os') info.os = value
          else if (k === 'node') info.nodeVersion = value
          else if (k === 'model') info.model = value
        }
      }
    }
    
    // Get gateway config for version and mode info
    const configData = await invokeToolRaw('gateway', { action: 'config.get' }) as any
    const configText = configData.result?.content?.[0]?.text || ''
    
    if (configText) {
      try {
        const parsed = JSON.parse(configText)
        const rawConfig = parsed.result?.raw
        const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : (rawConfig || parsed)
        
        if (config.gateway) {
          info.gatewayMode = config.gateway.mode || 'unknown'
          info.gatewayPort = String(config.gateway.port || '18789')
        }
        
        // Extract version from result metadata if available
        if (parsed.version) {
          info.openclawVersion = parsed.version
        }
      } catch (e) {
        console.error('Failed to parse config:', e)
      }
    }
    
    // Add some derived info
    info.hostType = 'Docker Container'
    info.uptime = 'Se session_status for detaljer'
    
  } catch (e) {
    console.error('Failed to fetch system info:', e)
  }
  
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
  // Use memory_search instead of grep via exec
  const data = await invokeToolRaw('memory_search', { query }) as any
  const text = data.result?.content?.[0]?.text || ''
  
  const results: { file: string; line: number; text: string }[] = []
  
  if (text) {
    const lines = text.split('\n').filter(Boolean)
    
    for (const line of lines.slice(0, 30)) {
      // Try to extract file and content from search result
      // Memory search format varies, but typically includes filename and snippet
      const fileMatch = line.match(/([A-Z_]+\.md|[\w/-]+\.(ts|tsx|json|js|mjs|md))/i)
      
      if (fileMatch) {
        const file = fileMatch[0].replace('/data/.openclaw/workspace/', '')
        // Extract text content (everything after filename and colon)
        const textMatch = line.substring(line.indexOf(fileMatch[0]) + fileMatch[0].length)
        const cleanText = textMatch.replace(/^:\s*/, '').trim()
        
        if (cleanText) {
          results.push({
            file,
            line: 0, // Memory search doesn't provide line numbers
            text: cleanText.slice(0, 200), // Truncate long matches
          })
        }
      }
    }
  }
  
  return results
}

export async function fetchAllSessionHistory(limit = 20): Promise<{ session: string; role: string; text: string; timestamp?: number }[]> {
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

/* ── Transcript & History API ─────────────────────────── */

export interface TranscriptSession {
  sessionId: string
  agent: string
  label?: string
  spawnedBy?: string
  startedAt?: string
  updatedAt?: number
  model?: string
  messageCount: number
  firstMessage?: string
  status: string
  sessionKey?: string
}

export interface MemoryEntry {
  date: string
  filename: string
  content: string
}

/* ── Static Archive API ──────────────────────────────────
 * Data is served from static JSON files in /public/ that are
 * generated by a cron job on the server. This works on Vercel
 * since the files are bundled at build time and refreshed on deploy.
 * The gateway also serves them via Tailscale for the desktop app.
 */

async function fetchStaticArchive(filename: string): Promise<any> {
  // Try fetching from same origin (works on Vercel and local dev)
  const baseUrl = typeof window !== 'undefined' && window.location.origin || ''
  const res = await smartFetch(`${baseUrl}/${filename}?t=${Date.now()}`)
  if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${res.status}`)
  return res.json()
}

// Fetch ALL sessions including completed ones
export async function fetchAllSessions(): Promise<TranscriptSession[]> {
  // Try static archive first
  try {
    const archive = await fetchStaticArchive('sessions-archive.json')
    if (archive?.sessions?.length) return archive.sessions
  } catch {}

  // Fallback: use live Gateway API
  try {
    const data = await invokeToolRaw('sessions_list', { messageLimit: 2, limit: 100 }) as any
    const text = data.result?.content?.[0]?.text
    let sessions: any[] = []
    if (text) {
      try {
        const parsed = JSON.parse(text)
        sessions = parsed.sessions || []
      } catch {}
    }
    if (!sessions.length && data.result?.details?.sessions) {
      sessions = data.result.details.sessions
    }
    return sessions.map((s: any) => ({
      sessionId: s.sessionId,
      agent: s.kind === 'main' ? 'main' : (s.label || s.key?.split(':')[1] || 'subagent'),
      model: s.model || 'unknown',
      label: s.label,
      status: s.kind,
      updatedAt: s.updatedAt,
      messageCount: s.lastMessages?.length || s.messageCount || 0,
      firstMessage: s.lastMessages?.[0]?.content?.[0]?.text || s.lastMessages?.[0]?.text || '',
      spawnedBy: s.key?.includes('subagent') ? 'main' : undefined,
      messages: s.lastMessages?.map((m: any) => ({
        role: m.role,
        text: typeof m.content === 'string' ? m.content : m.content?.[0]?.text || '',
        ts: m.timestamp,
      })) || [],
    }))
  } catch {}
  return []
}

// Fetch memory files for Journal
export async function fetchMemoryFiles(): Promise<MemoryEntry[]> {
  try {
    const archive = await fetchStaticArchive('memory-archive.json')
    if (archive?.entries) return archive.entries
  } catch {
    try {
      const url = resolveApiUrl(getGatewayUrl())
      const res = await smartFetch(`${url.replace('/api/gateway', '')}/memory-archive.json?t=${Date.now()}`)
      if (res.ok) {
        const archive = await res.json()
        if (archive?.entries) return archive.entries
      }
    } catch {}
  }
  return []
}

// Read a specific transcript's messages
export async function readTranscriptMessages(agent: string, sessionId: string, limit = 50): Promise<DetailedSessionMessage[]> {
  // Build possible session keys to try (most specific first)
  const keysToTry = [
    `agent:${agent}:subagent:${sessionId}`,
    `agent:${agent}:${sessionId}`,
    sessionId,
  ]

  try {
    // First check if session is in active list (has embedded messages)
    const allSessions = await fetchAllSessions()
    const session = allSessions.find((s: any) => s.sessionId === sessionId)
    
    if (session) {
      // Use actual sessionKey from API
      if ((session as any)?.sessionKey) {
        keysToTry.unshift((session as any).sessionKey)
      }
      // Try embedded messages first
      if ((session as any).messages?.length) {
        return (session as any).messages.map((m: any) => ({
          role: m.role,
          text: m.text || m.content?.[0]?.text || '',
          timestamp: m.ts || m.timestamp,
          toolCalls: m.toolCalls,
        }))
      }
    }

    // Try each possible session key until one works
    for (const sessionKey of [...new Set(keysToTry)]) {
      try {
        const data = await invokeToolRaw('sessions_history', { sessionKey, limit, includeTools: true }) as any
        const text = data.result?.content?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          const messages = parsed.messages || parsed || []
          if (messages.length > 0) {
            return messages.map((m: any) => ({
              role: m.role,
              text: typeof m.content === 'string' ? m.content : m.content?.[0]?.text || m.text || '',
              timestamp: m.timestamp,
              toolCalls: m.toolCalls,
            }))
          }
        }
      } catch { /* try next key */ }
    }
  } catch {}
  return []
}
