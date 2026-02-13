// OpenClaw Gateway API Client
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

const STORAGE_KEY_URL = 'openclaw-gateway-url'
const STORAGE_KEY_TOKEN = 'openclaw-gateway-token'

// Use Tauri's fetch in desktop app (bypasses CORS/cert issues), native fetch in browser
function smartFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    return tauriFetch(input, init)
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

async function invokeToolRaw(tool: string, args: Record<string, unknown>): Promise<unknown> {
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
  // Return known skills from system and workspace
  const systemSkills: SkillInfo[] = [
    { name: 'clawhub', description: 'Skill package manager for discovering and installing skills', location: 'system', category: 'System' },
    { name: 'healthcheck', description: 'System health monitoring and diagnostics', location: 'system', category: 'Sikkerhed' },
    { name: 'openai-image-gen', description: 'Generate images using OpenAI DALL-E', location: 'system', category: 'AI / Kreativ' },
    { name: 'openai-whisper-api', description: 'Speech-to-text using OpenAI Whisper API', location: 'system', category: 'AI / Lyd' },
    { name: 'skill-creator', description: 'Create new OpenClaw skills from templates', location: 'system', category: 'Udvikling' },
    { name: 'weather', description: 'Weather forecast and current conditions', location: 'system', category: 'Data' },
  ]
  
  const workspaceSkills: SkillInfo[] = [
    { name: 'perplexity', description: 'Advanced web search using Perplexity Sonar', location: 'workspace', category: 'Søgning' },
    { name: 'youtube-watcher', description: 'Monitor YouTube channels and transcribe videos', location: 'workspace', category: 'Medier' },
  ]
  
  return [...workspaceSkills, ...systemSkills]
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
  // Use web_fetch to search ClawHub API
  try {
    const url = `https://clawhub.com/api/search?q=${encodeURIComponent(query)}`
    const data = await invokeToolRaw('web_fetch', { url }) as any
    const text = data.result?.content?.[0]?.text || ''
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => ({
          name: s.name || s.id || '',
          version: s.version || '1.0.0',
          description: s.description || '',
          score: s.score || 0.5,
        }))
      }
    } catch {
      // Fallback: return empty array
    }
  } catch (e) {
    console.error('Failed to search ClawHub:', e)
  }
  
  return []
}

// --- Live data functions (no mock) ---

export async function fetchWorkspaceFiles(): Promise<{ name: string; size: string; modified: string; type: string; path: string }[]> {
  // Use memory_search to find workspace files
  const data = await invokeToolRaw('memory_search', { query: 'workspace file md ts tsx json' }) as any
  const text = data.result?.content?.[0]?.text || ''
  
  // Also include known workspace files
  const knownFiles = [
    'MEMORY.md', 'SOUL.md', 'USER.md', 'IDENTITY.md', 'TOOLS.md', 
    'AGENTS.md', 'HEARTBEAT.md', 'BOOTSTRAP.md', 'BOOT.md'
  ]
  
  const results: { name: string; size: string; modified: string; type: string; path: string }[] = []
  
  // Parse search results
  if (text) {
    const lines = text.split('\n').filter(Boolean)
    for (const line of lines.slice(0, 30)) {
      // Extract filename from search result
      const match = line.match(/([A-Z_]+\.md|[\w-]+\.(ts|tsx|json|js|mjs))/i)
      if (match) {
        const name = match[0]
        const ext = name.split('.').pop()?.toUpperCase() || 'FIL'
        results.push({
          name,
          path: `/data/.openclaw/workspace/${name}`,
          size: 'N/A',
          modified: new Date().toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' }),
          type: ext,
        })
      }
    }
  }
  
  // Add known files if not already in results
  for (const file of knownFiles) {
    if (!results.find(r => r.name === file)) {
      const ext = file.split('.').pop()?.toUpperCase() || 'MD'
      results.push({
        name: file,
        path: `/data/.openclaw/workspace/${file}`,
        size: 'N/A',
        modified: new Date().toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' }),
        type: ext,
      })
    }
  }
  
  return results.slice(0, 50)
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
  startedAt: string
  updatedAt?: number
  model?: string
  messageCount: number
  firstMessage?: string
  status: 'active' | 'completed'
}

export interface MemoryEntry {
  date: string
  filename: string
  content: string
}

// Read a file from disk via gateway exec tool
async function readFileViaGateway(path: string): Promise<string> {
  const data = await invokeToolRaw('read', { path }) as any
  const text = data.result?.content?.[0]?.text
  if (text) return text
  throw new Error('Could not read file')
}

// List files via gateway exec
async function execViaGateway(command: string): Promise<string> {
  const data = await invokeToolRaw('exec', { command, timeout: 10 }) as any
  const text = data.result?.content?.[0]?.text
  if (text) return text
  return ''
}

// Fetch ALL sessions including completed ones from transcript files on disk
export async function fetchAllSessions(): Promise<TranscriptSession[]> {
  try {
    const output = await execViaGateway(`python3 -c "
import json, os, glob

sessions = []
for agent_dir in glob.glob('/data/.openclaw/agents/*/sessions/'):
    agent = agent_dir.split('/')[-3]
    
    # Read sessions.json for metadata
    meta = {}
    sfile = os.path.join(agent_dir, 'sessions.json')
    if os.path.exists(sfile):
        with open(sfile) as f:
            meta = json.load(f)
    
    # Scan all transcript files
    for jf in sorted(glob.glob(os.path.join(agent_dir, '*.jsonl')), key=os.path.getmtime, reverse=True):
        sid = os.path.basename(jf).replace('.jsonl', '')
        stat = os.stat(jf)
        
        # Read first few lines for metadata
        first_msg = ''
        model = ''
        msg_count = 0
        started = ''
        with open(jf) as f:
            for i, line in enumerate(f):
                if i > 200: break
                try:
                    d = json.loads(line)
                    if d.get('type') == 'session':
                        started = d.get('timestamp', '')
                    elif d.get('type') == 'model_change':
                        model = d.get('modelId', '')
                    elif d.get('type') == 'message':
                        msg_count += 1
                        if not first_msg:
                            msg = d.get('message', {})
                            c = msg.get('content', [])
                            if isinstance(c, list):
                                for block in c:
                                    if isinstance(block, dict) and block.get('type') == 'text':
                                        first_msg = block.get('text', '')[:150]
                                        break
                            elif isinstance(c, str):
                                first_msg = c[:150]
                except: pass
        
        # Find label from sessions.json
        label = None
        spawned_by = None
        for k, v in meta.items():
            if v.get('sessionId') == sid:
                label = v.get('label')
                spawned_by = v.get('spawnedBy')
                break
        
        sessions.append({
            'sessionId': sid,
            'agent': agent,
            'label': label,
            'spawnedBy': spawned_by,
            'startedAt': started,
            'updatedAt': int(stat.st_mtime * 1000),
            'model': model,
            'messageCount': msg_count,
            'firstMessage': first_msg,
            'status': 'active' if (int(stat.st_mtime * 1000) > (int(__import__('time').time() * 1000) - 300000)) else 'completed'
        })

print(json.dumps(sessions))
"`)
    return JSON.parse(output)
  } catch (e) {
    console.error('Failed to fetch all sessions:', e)
    return []
  }
}

// Fetch memory files for Journal
export async function fetchMemoryFiles(): Promise<MemoryEntry[]> {
  try {
    const output = await execViaGateway(`python3 -c "
import json, os, glob
entries = []
for f in sorted(glob.glob('/data/.openclaw/workspace/memory/*.md'), reverse=True):
    name = os.path.basename(f)
    date = name.replace('.md', '')
    with open(f) as fh:
        content = fh.read()
    entries.append({'date': date, 'filename': name, 'content': content})
print(json.dumps(entries))
"`)
    return JSON.parse(output)
  } catch (e) {
    console.error('Failed to fetch memory files:', e)
    return []
  }
}

// Read a specific transcript's messages
export async function readTranscriptMessages(agent: string, sessionId: string, limit = 50): Promise<DetailedSessionMessage[]> {
  try {
    const output = await execViaGateway(`python3 -c "
import json, glob

path = None
for p in glob.glob('/data/.openclaw/agents/${agent}/sessions/${sessionId}.jsonl*'):
    if '.deleted' not in p or not path:
        path = p
        if '.deleted' not in p: break

if not path:
    print('[]')
else:
    msgs = []
    with open(path) as f:
        for line in f:
            try:
                d = json.loads(line)
                if d.get('type') != 'message': continue
                msg = d.get('message', {})
                role = msg.get('role', '')
                content = msg.get('content', '')
                text = ''
                tool_calls = []
                if isinstance(content, str):
                    text = content
                elif isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict):
                            if block.get('type') == 'text':
                                text = block.get('text', '')
                            elif block.get('type') == 'tool_use':
                                tool_calls.append({'tool': block.get('name',''), 'args': block.get('input',{})})
                            elif block.get('type') == 'tool_result':
                                pass
                            elif block.get('type') == 'toolCall':
                                tool_calls.append({'tool': block.get('name',''), 'args': block.get('arguments',{})})
                
                entry = {'role': role, 'text': text[:500], 'timestamp': msg.get('timestamp', d.get('timestamp'))}
                if tool_calls:
                    entry['toolCalls'] = tool_calls[:5]
                if text or tool_calls:
                    msgs.append(entry)
            except: pass
    print(json.dumps(msgs[-${limit}:]))
"`)
    return JSON.parse(output)
  } catch (e) {
    console.error('Failed to read transcript:', e)
    return []
  }
}
