import { useState, useEffect } from 'react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { DonutChart, BarChart } from '../components/Chart'
import { useLiveData } from '../api/LiveDataContext'
import { fetchSystemInfo } from '../api/openclaw'
import { Status } from '../types'

interface SystemInfo {
  host?: string
  os?: string
  cpu?: string
  ramTotal?: string
  ramUsed?: string
  ramAvailable?: string
  diskTotal?: string
  diskUsed?: string
  diskPercent?: number
  uptime?: string
  nodeVersion?: string
  openclawVersion?: string
}

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

export default function Dashboard() {
  const { isConnected, isLoading, sessions, statusText, cronJobs, gatewayConfig } = useLiveData()
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({})

  useEffect(() => {
    if (isConnected) {
      fetchSystemInfo().then(info => setSystemInfo(info || {})).catch(() => {})
    }
  }, [isConnected])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-white/50">Henter data...</p>
      </div>
    )
  }

  const parsedStatus = statusText ? parseStatusText(statusText) : {}
  const channels = gatewayConfig ? deriveChannelsFromConfig(gatewayConfig) : []

  // Stats from live sessions
  const runningCount = sessions.filter(s => {
    const age = Date.now() - s.updatedAt
    return age < 120000 // active within 2 min
  }).length
  const completedCount = sessions.filter(s => {
    const age = Date.now() - s.updatedAt
    return age >= 120000
  }).length

  const cronActiveCount = cronJobs.filter((j: any) => j.enabled !== false).length

  // Extract tokens from status text (format: "1.23M in / 456k out")
  const tokensText = parsedStatus.tokens || '0 in / 0 out'
  const tokensMatch = tokensText.match(/([\d.]+[kM]?)\s*in/)
  const tokensValue = tokensMatch ? tokensMatch[1] : '0'

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Oversigt</h1>
        {!isConnected && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-orange-400" style={{ background: 'rgba(255,149,0,0.1)' }}>
            Ikke forbundet
          </span>
        )}
      </div>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>Driftsoverblik — {new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

      {!isConnected ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-white/70 mb-2">Ingen forbindelse til Gateway</p>
            <p className="text-sm text-white/50">Gå til Indstillinger for at konfigurere API forbindelse</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <p className="caption">Aktive Sessioner</p>
              <p className="text-2xl font-bold mt-1">{sessions.length}</p>
              <p className="caption mt-1">{runningCount} aktive, {completedCount} afsluttet</p>
            </Card>
            <Card>
              <p className="caption">Tokens i Session</p>
              <p className="text-2xl font-bold mt-1">{tokensValue}</p>
              <p className="caption mt-1">{parsedStatus.tokens || 'Ingen data'}</p>
            </Card>
            <Card>
              <p className="caption">Model</p>
              <p className="text-2xl font-bold mt-1">{parsedStatus.model || 'N/A'}</p>
              <p className="caption mt-1">{parsedStatus.context || 'Anthropic API'}</p>
            </Card>
            <Card>
              <p className="caption">Planlagte Jobs</p>
              <p className="text-2xl font-bold mt-1">{cronActiveCount} aktive</p>
              <p className="caption mt-1">{cronJobs.length} total</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card title="System">
              <div className="space-y-2 text-sm">
                {parsedStatus.version && <div className="flex justify-between"><span className="caption">Version</span><span className="font-medium">{parsedStatus.version}</span></div>}
                {parsedStatus.runtime && <div className="flex justify-between"><span className="caption">Runtime</span><span className="font-medium">{parsedStatus.runtime}</span></div>}
                {parsedStatus.session && <div className="flex justify-between"><span className="caption">Session</span><span className="font-medium">{parsedStatus.session}</span></div>}
                {parsedStatus.queue && <div className="flex justify-between"><span className="caption">Kø</span><span className="font-medium">{parsedStatus.queue}</span></div>}
                {systemInfo.host && <div className="flex justify-between"><span className="caption">Vært</span><span className="font-medium">{systemInfo.host}</span></div>}
                {systemInfo.os && <div className="flex justify-between"><span className="caption">OS</span><span className="font-medium">{systemInfo.os}</span></div>}
                {systemInfo.ramUsed && systemInfo.ramTotal && <div className="flex justify-between"><span className="caption">RAM</span><span className="font-medium">{systemInfo.ramUsed} / {systemInfo.ramTotal}</span></div>}
                {systemInfo.diskUsed && systemInfo.diskTotal && <div className="flex justify-between"><span className="caption">Disk</span><span className="font-medium">{systemInfo.diskUsed} / {systemInfo.diskTotal} ({systemInfo.diskPercent}%)</span></div>}
                {systemInfo.uptime && <div className="flex justify-between"><span className="caption">Oppetid</span><span className="font-medium">{systemInfo.uptime}</span></div>}
              </div>
            </Card>
            <Card title="Agentstatus" className="col-span-1">
              {runningCount === 0 && completedCount === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm">Ingen sessioner</div>
              ) : (
                <DonutChart segments={[
                  { value: runningCount || 1, color: '#34C759', label: 'Kørende' },
                  { value: completedCount || 0, color: '#007AFF', label: 'Afsluttet' },
                ].filter(s => s.value > 0)} />
              )}
            </Card>
            <Card title="API Forbrug (7 dage)">
              <div className="text-center py-8 text-white/50 text-sm">Historik ikke tilgængelig</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card title="Kanaler" subtitle={`${channels.filter(c => c.enabled).length} aktiverede`}>
              {channels.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm">Ingen kanaler konfigureret</div>
              ) : (
                <div className="space-y-3">
                  {channels.map(ch => (
                    <div key={ch.name} className="flex items-center justify-between py-2 glass-row">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={ch.status === 'ok' ? 'active' : ch.status === 'warning' ? 'warning' : ch.status === 'setup' ? 'idle' : 'paused'} />
                        <span className="text-sm font-medium">{ch.name}</span>
                      </div>
                      <span className="caption">{ch.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Planlagte Jobs" subtitle={`${cronActiveCount} aktive af ${cronJobs.length} total`}>
              {cronJobs.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm">Ingen cron jobs konfigureret</div>
              ) : (
                <div className="space-y-3">
                  {cronJobs.slice(0, 5).map((job: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 glass-row">
                      <div>
                        <p className="text-sm font-medium">{job.name || job.label || 'Unavngiven job'}</p>
                        <p className="caption">{job.schedule || 'Ukendt tidsplan'}</p>
                      </div>
                      <StatusBadge status={job.enabled === false ? 'paused' : 'active'} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Sessioner" subtitle={`${sessions.length} live sessioner`}>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-white/50 text-sm">Ingen aktive sessioner</div>
            ) : (
              <div className="space-y-3">
                {sessions.map(s => {
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
                })}
              </div>
            )}
          </Card>
        </>
      )}
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
