import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { DonutChart, BarChart } from '../components/Chart'
import { dashboardStats, agents as mockAgents, apiUsageData, channels as mockChannels, systemInfo } from '../data/mock'
import { useLiveData } from '../api/LiveDataContext'
import { Status } from '../types'

function parseStatusText(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.includes('OpenClaw')) result.version = line.replace(/🦞\s*/, '').trim()
    if (line.includes('Time:')) result.time = line.replace(/🕒\s*Time:\s*/, '').trim()
    if (line.includes('Model:')) result.model = line.replace(/🧠\s*Model:\s*/, '').split('·')[0].trim()
    if (line.includes('Tokens:')) result.tokens = line.replace(/🧮\s*Tokens:\s*/, '').trim()
    if (line.includes('Context:')) result.context = line.replace(/📚\s*Context:\s*/, '').trim()
    if (line.includes('Session:')) result.session = line.replace(/🧵\s*Session:\s*/, '').trim()
    if (line.includes('Runtime:')) result.runtime = line.replace(/⚙️\s*Runtime:\s*/, '').trim()
    if (line.includes('Queue:')) result.queue = line.replace(/🪢\s*Queue:\s*/, '').trim()
  }
  return result
}

function deriveChannelsFromConfig(config: Record<string, any>): Array<{ name: string; status: 'ok' | 'warning' | 'setup' | 'off'; detail: string; enabled: boolean }> {
  const channelNames: Record<string, string> = {
    telegram: 'Telegram', whatsapp: 'WhatsApp', discord: 'Discord',
    slack: 'Slack', imessage: 'iMessage', nostr: 'Nostr',
    signal: 'Signal', googlechat: 'Google Chat',
  }
  const channels: Array<{ name: string; status: 'ok' | 'warning' | 'setup' | 'off'; detail: string; enabled: boolean }> = []
  const plugins = config.plugins?.entries || {}
  const channelConfigs = config.channels || {}

  for (const [key, pluginConf] of Object.entries(plugins) as [string, any][]) {
    const name = channelNames[key] || key
    const enabled = pluginConf.enabled !== false
    const chConf = channelConfigs[key] || {}

    if (!enabled) {
      channels.push({ name, status: 'off', detail: 'Deaktiveret', enabled: false })
    } else if (key === 'telegram' && chConf.botToken) {
      channels.push({ name, status: 'ok', detail: `dmPolicy: ${chConf.dmPolicy || 'default'}`, enabled: true })
    } else if (key === 'whatsapp' && chConf.dmPolicy) {
      channels.push({ name, status: 'warning', detail: 'Linket men ingen aktiv session', enabled: true })
    } else if (key === 'imessage' && chConf.cliPath) {
      channels.push({ name, status: 'warning', detail: 'Konfigureret men imsg ikke klar', enabled: true })
    } else if (enabled && !chConf.botToken && !chConf.token && !chConf.cliPath) {
      channels.push({ name, status: 'setup', detail: 'Ikke konfigureret', enabled: true })
    } else {
      channels.push({ name, status: 'ok', detail: 'Aktiv', enabled: true })
    }
  }
  return channels
}

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-orange-400" style={{ background: 'rgba(255,149,0,0.1)' }}>
      Demo data
    </span>
  )
}

export default function Dashboard() {
  const { isConnected, sessions, statusText, cronJobs, gatewayConfig } = useLiveData()
  const s = dashboardStats

  const useLive = isConnected && sessions.length > 0

  // Derive live data
  const parsedStatus = statusText ? parseStatusText(statusText) : null
  const liveChannels = gatewayConfig ? deriveChannelsFromConfig(gatewayConfig) : null
  const displayChannels = liveChannels || mockChannels
  const displaySessions = useLive ? sessions : null

  // Agent status counts from live sessions
  const runningCount = useLive ? sessions.filter(s => {
    const age = Date.now() - s.updatedAt
    return age < 120000 // active within 2 min
  }).length : s.agentStatus.running
  const completedCount = useLive ? sessions.filter(s => {
    const age = Date.now() - s.updatedAt
    return age >= 120000
  }).length : (s.agentStatus.completed || 0)

  const cronActiveCount = isConnected ? cronJobs.filter((j: any) => j.enabled !== false).length : s.cronActive

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="page-title">Oversigt</h1>
        {!isConnected && <DemoBadge />}
      </div>
      <p className="caption mb-8">Driftsoverblik — {new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Aktive Sessioner', value: useLive ? sessions.length : s.activeTasks, sub: useLive ? `${runningCount} aktive, ${completedCount} afsluttet` : 'på tværs af alle agenter' },
          { label: 'API Forespørgsler i Dag', value: s.apiToday.requests.toLocaleString(), sub: parsedStatus?.tokens || `${s.apiToday.tokens.toLocaleString()} tokens` },
          { label: 'Model', value: parsedStatus?.model || systemInfo.primaryModel, sub: parsedStatus?.context || 'Anthropic API-nøgle' },
          { label: 'Planlagte Jobs', value: `${cronActiveCount} aktive`, sub: cronJobs.length > 0 ? `${cronJobs.length} total` : 'Ingen konfigureret endnu' },
        ].map((stat, i) => (
          <Card key={i}>
            <p className="caption">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
            <p className="caption mt-1">{stat.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card title="System">
          <div className="space-y-2 text-sm">
            {parsedStatus ? (
              <>
                <div className="flex justify-between"><span className="caption">Version</span><span className="font-medium">{parsedStatus.version}</span></div>
                <div className="flex justify-between"><span className="caption">Model</span><span className="font-medium">{parsedStatus.model}</span></div>
                <div className="flex justify-between"><span className="caption">Tokens</span><span className="font-medium">{parsedStatus.tokens}</span></div>
                <div className="flex justify-between"><span className="caption">Kontekst</span><span className="font-medium">{parsedStatus.context}</span></div>
                <div className="flex justify-between"><span className="caption">Session</span><span className="font-medium">{parsedStatus.session}</span></div>
                <div className="flex justify-between"><span className="caption">Runtime</span><span className="font-medium">{parsedStatus.runtime}</span></div>
                <div className="flex justify-between"><span className="caption">Kø</span><span className="font-medium">{parsedStatus.queue}</span></div>
              </>
            ) : (
              <>
                <div className="flex justify-between"><span className="caption">Vært</span><span className="font-medium">{systemInfo.host}</span></div>
                <div className="flex justify-between"><span className="caption">OS</span><span className="font-medium">{systemInfo.os}</span></div>
                <div className="flex justify-between"><span className="caption">CPU</span><span className="font-medium">2 vCPU (EPYC)</span></div>
                <div className="flex justify-between"><span className="caption">RAM</span><span className="font-medium">{systemInfo.ramUsed} / {systemInfo.ramTotal}</span></div>
                <div className="flex justify-between"><span className="caption">Disk</span><span className="font-medium">{systemInfo.diskUsed} / {systemInfo.diskTotal} ({systemInfo.diskPercent}%)</span></div>
                <div className="flex justify-between"><span className="caption">Oppetid</span><span className="font-medium">{systemInfo.uptime}</span></div>
                <div className="flex justify-between"><span className="caption">Node</span><span className="font-medium">{systemInfo.nodeVersion}</span></div>
              </>
            )}
          </div>
        </Card>
        <Card title="Agentstatus" className="col-span-1">
          <DonutChart segments={[
            { value: runningCount || 1, color: '#34C759', label: 'Kørende' },
            { value: completedCount || 0, color: '#007AFF', label: 'Afsluttet' },
          ].filter(s => s.value > 0)} />
        </Card>
        <Card title="API Forbrug (7 dage)">
          <BarChart data={apiUsageData.map(d => ({ label: d.date, value: d.requests, color: '#007AFF' }))} height={180} />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card title="Kanaler" subtitle={`Forbindelsesstatus${liveChannels ? '' : ' (demo)'}`}>
          <div className="space-y-3">
            {displayChannels.map(ch => (
              <div key={ch.name} className="flex items-center justify-between py-2 glass-row">
                <div className="flex items-center gap-3">
                  <StatusBadge status={ch.status === 'ok' ? 'active' : ch.status === 'warning' ? 'warning' : ch.status === 'setup' ? 'idle' : 'paused'} />
                  <span className="text-sm font-medium">{ch.name}</span>
                </div>
                <span className="caption">{ch.detail}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Kræver Opmærksomhed" subtitle={`${s.attentionItems.length} punkter kræver handling`}>
          <div className="space-y-3">
            {s.attentionItems.map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 glass-row">
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.severity as Status} />
                  <span className="text-sm">{item.title}</span>
                </div>
                <span className="caption">{item.source}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Sessioner" subtitle={useLive ? `${sessions.length} live sessioner` : 'Aktive agentsessioner (demo)'}>
        <div className="space-y-3">
          {displaySessions ? displaySessions.map(s => {
            const isActive = Date.now() - s.updatedAt < 120000
            const timeAgo = formatTimeAgo(s.updatedAt)
            return (
              <div key={s.key} className="flex items-center justify-between py-2 glass-row">
                <div>
                  <p className="text-sm font-medium">{s.label || (s.key === 'agent:main:main' ? 'Hovedagent' : s.key)}</p>
                  <p className="caption">{s.key} · {s.lastChannel}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="caption">{timeAgo}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>{s.model}</span>
                  {s.contextTokens && <span className="caption">{Math.round(s.contextTokens / 1000)}k ctx</span>}
                  <StatusBadge status={isActive ? 'running' : 'completed'} />
                </div>
              </div>
            )
          }) : mockAgents.map(a => (
            <div key={a.id} className="flex items-center justify-between py-2 glass-row">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="caption">{a.purpose}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>{a.model}</span>
                <StatusBadge status={a.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60000) return 'lige nu'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min siden`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}t siden`
  return `${Math.floor(diff / 86400000)}d siden`
}
