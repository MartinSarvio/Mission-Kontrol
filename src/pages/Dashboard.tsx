import { useState, useEffect, useMemo, useCallback } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import { DonutChart, BarChart } from '../components/Chart'
import { useLiveData } from '../api/LiveDataContext'
import { fetchSystemInfo } from '../api/openclaw'
import { Status } from '../types'
import { DashboardSkeleton } from '../components/SkeletonLoader'
import { usePageTitle } from '../hooks/usePageTitle'

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
  const channelConfigs = config.channels || {}

  // Loop through the channels object directly
  for (const [key, chConf] of Object.entries(channelConfigs) as [string, any][]) {
    const name = channelNames[key] || key
    const enabled = chConf.enabled !== false
    // Check for credentials - botToken may be redacted as __OPENCLAW_REDACTED__
    const hasToken = !!(chConf.token || chConf.botToken)
    const hasCreds = hasToken || chConf.cliPath || chConf.dmPolicy || chConf.allowFrom

    if (!enabled) {
      channels.push({ name, status: 'off', detail: 'Deaktiveret', enabled: false })
    } else if (hasCreds) {
      // Has some credentials/config = likely working
      const details: string[] = []
      if (chConf.dmPolicy) details.push(`dmPolicy: ${chConf.dmPolicy}`)
      if (chConf.groupPolicy) details.push(`groups: ${chConf.groupPolicy}`)
      if (chConf.streamMode) details.push(chConf.streamMode)
      channels.push({ name, status: 'ok', detail: details.join(' · ') || 'Aktiv', enabled: true })
    } else {
      channels.push({ name, status: 'setup', detail: 'Ikke konfigureret', enabled: true })
    }
  }
  return channels
}

export default function Dashboard() {
  usePageTitle('Dashboard')
  
  const { isConnected, isLoading, isRefreshing, error, sessions, statusText, cronJobs, gatewayConfig } = useLiveData()
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({})

  useEffect(() => {
    if (isConnected) {
      fetchSystemInfo().then(info => setSystemInfo(info || {})).catch(() => {})
    }
  }, [isConnected])

  if (isLoading && sessions.length === 0) {
    return <DashboardSkeleton />
  }

  // Memoize reload handler
  const handleReload = useCallback(() => {
    window.location.reload()
  }, [])

  if (error && !isConnected && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-white/70 mb-2">Kunne ikke hente data</p>
          <p className="text-sm text-white/40 mb-4">{error}</p>
          <button
            onClick={handleReload}
            style={{ background: '#007AFF', color: '#fff', padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            Prøv igen
          </button>
        </div>
      </div>
    )
  }

  // Memoize parsed status and channels to avoid re-parsing on every render
  const parsedStatus = useMemo(
    () => statusText ? parseStatusText(statusText) : {},
    [statusText]
  )
  
  const channels = useMemo(
    () => gatewayConfig ? deriveChannelsFromConfig(gatewayConfig) : [],
    [gatewayConfig]
  )

  // Memoize session stats calculations
  const { runningCount, completedCount } = useMemo(() => {
    const now = Date.now()
    const running = sessions.filter(s => (now - s.updatedAt) < 120000).length
    const completed = sessions.filter(s => (now - s.updatedAt) >= 120000).length
    return { runningCount: running, completedCount: completed }
  }, [sessions])

  const cronActiveCount = useMemo(
    () => cronJobs.filter((j: any) => j.enabled !== false).length,
    [cronJobs]
  )

  // Memoize token parsing and cost calculation
  const { tokensValue, formattedCost, tokensIn, tokensOut, costUSD } = useMemo(() => {
    const tokensText = parsedStatus.tokens || '0 in / 0 out'
    const tokensMatch = tokensText.match(/([\d.]+[kM]?)\s*in/)
    const tokensVal = tokensMatch ? tokensMatch[1] : '0'

    // Parse token values
    function parseTokenValue(val: string): number {
      const match = val.match(/([\d.]+)([kM]?)/)
      if (!match) return 0
      const num = parseFloat(match[1])
      const unit = match[2]
      if (unit === 'M') return num * 1000000
      if (unit === 'k') return num * 1000
      return num
    }

    const inMatch = tokensText.match(/([\d.]+[kM]?)\s*in/)
    const outMatch = tokensText.match(/([\d.]+[kM]?)\s*out/)
    const tIn = inMatch ? parseTokenValue(inMatch[1]) : 0
    const tOut = outMatch ? parseTokenValue(outMatch[1]) : 0

    // Opus 4 pricing: ~$15/M input, ~$75/M output
    const cUSD = (tIn / 1000000 * 15) + (tOut / 1000000 * 75)
    const cDKK = cUSD * 7
    const fCost = cDKK < 1 ? `${(cDKK * 100).toFixed(0)} øre` : `${cDKK.toFixed(2)} kr`

    return {
      tokensValue: tokensVal,
      formattedCost: fCost,
      tokensIn: tIn,
      tokensOut: tOut,
      costUSD: cUSD
    }
  }, [parsedStatus.tokens])

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
            <Card style={{ 
              position: 'relative',
              overflow: 'visible'
            }}>
              <div style={{
                position: 'absolute',
                bottom: '-10px',
                left: '20%',
                right: '20%',
                height: '40px',
                background: 'radial-gradient(ellipse, rgba(0, 122, 255, 0.3) 0%, transparent 70%)',
                filter: 'blur(20px)',
                zIndex: -1
              }} />
              <p className="caption">Aktive Sessioner</p>
              <p className="text-2xl font-bold mt-1">{sessions.length}</p>
              <p className="caption mt-1">{runningCount} aktive, {completedCount} afsluttet</p>
            </Card>
            <Card style={{ 
              position: 'relative',
              overflow: 'visible'
            }}>
              <div style={{
                position: 'absolute',
                bottom: '-10px',
                left: '20%',
                right: '20%',
                height: '40px',
                background: 'radial-gradient(ellipse, rgba(48, 209, 88, 0.3) 0%, transparent 70%)',
                filter: 'blur(20px)',
                zIndex: -1
              }} />
              <p className="caption">Tokens i Session</p>
              <p className="text-2xl font-bold mt-1">{tokensValue}</p>
              <p className="caption mt-1">{parsedStatus.tokens || 'Ingen data'}</p>
            </Card>
            <Card style={{ 
              position: 'relative',
              overflow: 'visible'
            }}>
              <div style={{
                position: 'absolute',
                bottom: '-10px',
                left: '20%',
                right: '20%',
                height: '40px',
                background: 'radial-gradient(ellipse, rgba(175, 82, 222, 0.3) 0%, transparent 70%)',
                filter: 'blur(20px)',
                zIndex: -1
              }} />
              <p className="caption">Model</p>
              <p className="text-2xl font-bold mt-1">{parsedStatus.model || 'N/A'}</p>
              <p className="caption mt-1">{parsedStatus.context || 'Anthropic API'}</p>
            </Card>
            <Card style={{ 
              position: 'relative',
              overflow: 'visible'
            }}>
              <div style={{
                position: 'absolute',
                bottom: '-10px',
                left: '20%',
                right: '20%',
                height: '40px',
                background: 'radial-gradient(ellipse, rgba(255, 159, 10, 0.3) 0%, transparent 70%)',
                filter: 'blur(20px)',
                zIndex: -1
              }} />
              <p className="caption">Planlagte Jobs</p>
              <p className="text-2xl font-bold mt-1">{cronActiveCount} aktive</p>
              <p className="caption mt-1">{cronJobs.length} total</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <Card title="System">
              <div className="space-y-2 text-sm min-w-0">
                {parsedStatus.version && <div className="flex justify-between"><span className="caption">Version</span><span className="font-medium truncate ml-2">{parsedStatus.version}</span></div>}
                {parsedStatus.runtime && <div className="flex justify-between"><span className="caption">Runtime</span><span className="font-medium truncate ml-2">{parsedStatus.runtime}</span></div>}
                {parsedStatus.session && <div className="flex justify-between gap-2 min-w-0"><span className="caption flex-shrink-0">Session</span><span className="font-medium truncate">{parsedStatus.session}</span></div>}
                {parsedStatus.queue && <div className="flex justify-between"><span className="caption">Kø</span><span className="font-medium truncate ml-2">{parsedStatus.queue}</span></div>}
                {systemInfo.host && <div className="flex justify-between"><span className="caption">Vært</span><span className="font-medium truncate ml-2">{systemInfo.host}</span></div>}
                {systemInfo.os && <div className="flex justify-between"><span className="caption">OS</span><span className="font-medium truncate ml-2">{systemInfo.os}</span></div>}
                {systemInfo.ramUsed && systemInfo.ramTotal && <div className="flex justify-between"><span className="caption">RAM</span><span className="font-medium truncate ml-2">{systemInfo.ramUsed} / {systemInfo.ramTotal}</span></div>}
                {systemInfo.diskUsed && systemInfo.diskTotal && <div className="flex justify-between"><span className="caption">Disk</span><span className="font-medium truncate ml-2">{systemInfo.diskUsed} / {systemInfo.diskTotal} ({systemInfo.diskPercent}%)</span></div>}
                {systemInfo.uptime && <div className="flex justify-between"><span className="caption">Oppetid</span><span className="font-medium truncate ml-2">{systemInfo.uptime}</span></div>}
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
            <Card title="Estimeret Forbrug">
              <div className="text-center py-8 min-w-0">
                <p className="text-3xl font-bold text-white mb-2">{formattedCost}</p>
                <p className="caption mb-4">Aktuel session</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="caption">Input tokens</span>
                    <span className="font-medium">{tokensIn >= 1000000 ? `${(tokensIn / 1000000).toFixed(2)}M` : `${Math.round(tokensIn / 1000)}k`}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="caption">Output tokens</span>
                    <span className="font-medium">{tokensOut >= 1000000 ? `${(tokensOut / 1000000).toFixed(2)}M` : `${Math.round(tokensOut / 1000)}k`}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="caption">Estimeret USD</span>
                    <span className="font-medium">${costUSD.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <Card title="Kanaler" subtitle={`${channels.filter(c => c.enabled).length} aktiverede`}>
              {channels.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm">Ingen kanaler konfigureret</div>
              ) : (
                <div className="space-y-3 min-w-0">
                  {channels.map(ch => (
                    <div key={ch.name} className="flex items-center justify-between py-2 glass-row min-w-0 overflow-hidden">
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusBadge status={ch.status === 'ok' ? 'active' : ch.status === 'warning' ? 'warning' : ch.status === 'setup' ? 'idle' : 'paused'} />
                        <span className="text-sm font-medium truncate">{ch.name}</span>
                      </div>
                      <span className="caption truncate ml-2 flex-shrink-0">{ch.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Planlagte Jobs" subtitle={`${cronActiveCount} aktive af ${cronJobs.length} total`}>
              {cronJobs.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm">Ingen cron jobs konfigureret</div>
              ) : (
                <div className="space-y-3 min-w-0">
                  {cronJobs.slice(0, 5).map((job: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 glass-row min-w-0 overflow-hidden">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{job.name || job.label || 'Unavngiven job'}</p>
                        <p className="caption truncate">{typeof job.schedule === 'object' ? (job.schedule?.expr || job.schedule?.kind || 'Planlagt') : (job.schedule || 'Ukendt tidsplan')}</p>
                      </div>
                      <StatusBadge status={job.enabled === false ? 'paused' : 'active'} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <Card title="Live Aktivitet" subtitle="Seneste agent-handlinger">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm">Ingen aktivitet</div>
              ) : (
                <div className="space-y-3 min-w-0">
                  {sessions.slice(0, 5).map(s => {
                    const isActive = Date.now() - s.updatedAt < 120000
                    const timeAgo = formatTimeAgo(s.updatedAt)
                    const sessionType = s.key.includes('subagent') ? 'Subagent' : s.key.includes('main') ? 'Hovedagent' : 'Session'
                    const agentName = s.displayName || s.label || s.key.split(':')[1] || 'Unavngiven'
                    
                    return (
                      <div key={s.key} className="py-2 glass-row min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between mb-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                            <StatusBadge status={isActive ? 'running' : 'completed'} />
                            <span className="text-sm font-medium truncate">{agentName}</span>
                            <span className="caption text-xs flex-shrink-0">· {sessionType}</span>
                          </div>
                          <span className="caption text-xs flex-shrink-0 ml-2">{timeAgo}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs min-w-0 overflow-hidden">
                          <span className="caption flex-shrink-0">{s.channel || 'ingen kanal'}</span>
                          <span className="text-white/20 flex-shrink-0">·</span>
                          <span className="font-mono caption truncate">{s.model}</span>
                          {s.contextTokens && (
                            <>
                              <span className="text-white/20 flex-shrink-0">·</span>
                              <span className="caption flex-shrink-0">{Math.round(s.contextTokens / 1000)}k ctx</span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card title="Sessioner" subtitle={`${sessions.length} live sessioner`}>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm">Ingen aktive sessioner</div>
              ) : (
                <div className="space-y-3 min-w-0">
                  {sessions.map(s => {
                    const isActive = Date.now() - s.updatedAt < 120000
                    const timeAgo = formatTimeAgo(s.updatedAt)
                    return (
                      <div key={s.key} className="flex items-center justify-between py-2 glass-row min-w-0 overflow-hidden gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{s.displayName || s.label || (s.key === 'agent:main:main' ? 'Hovedagent' : s.key)}</p>
                          <p className="caption truncate">{s.key} · {s.channel || 'ingen kanal'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="caption hidden sm:inline">{timeAgo}</span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded-lg truncate max-w-[120px]" style={{ background: 'rgba(255,255,255,0.06)' }}>{s.model}</span>
                          {s.contextTokens && <span className="caption hidden md:inline">{Math.round(s.contextTokens / 1000)}k ctx</span>}
                          <StatusBadge status={isActive ? 'running' : 'completed'} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          <QuickActions onHealthcheck={() => {
            fetchSystemInfo().then(info => setSystemInfo(info || {})).catch(() => {})
          }} />
        </>
      )}
    </div>
  )
}

function QuickActions({ onHealthcheck }: { onHealthcheck: () => void }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [confirmRestart, setConfirmRestart] = useState(false)

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.2s ease', flex: '1 1 0',
    justifyContent: 'center', minWidth: 140,
  }

  const handleAction = async (key: string, action: () => Promise<void> | void) => {
    setLoadingAction(key)
    try { await action() } finally {
      setTimeout(() => setLoadingAction(null), 600)
    }
  }

  return (
    <div className="mb-8">
      <Card title="Hurtige Genveje" subtitle="Almindelige handlinger">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {/* Genstart Gateway */}
          {confirmRestart ? (
            <div style={{ ...btnBase, flexDirection: 'column', gap: 8, background: 'rgba(255,59,48,0.1)', borderColor: 'rgba(255,59,48,0.3)' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Bekraeft genstart?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setConfirmRestart(false); handleAction('restart', async () => {
                    try { await fetch('/api/gateway/restart', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('gateway_token') || ''}` } }) } catch {}
                  }) }}
                  style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#FF3B30', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >Ja, genstart</button>
                <button
                  onClick={() => setConfirmRestart(false)}
                  style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer' }}
                >Annuller</button>
              </div>
            </div>
          ) : (
            <button
              style={btnBase}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
              onClick={() => setConfirmRestart(true)}
              disabled={loadingAction === 'restart'}
            >
              <Icon name="restart" size={16} /> {loadingAction === 'restart' ? 'Genstarter...' : 'Genstart Gateway'}
            </button>
          )}

          {/* Ryd Cache */}
          <button
            style={btnBase}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            onClick={() => handleAction('cache', async () => { localStorage.clear(); window.location.reload() })}
            disabled={loadingAction === 'cache'}
          >
            <Icon name="xmark" size={16} /> {loadingAction === 'cache' ? 'Rydder...' : 'Ryd Cache'}
          </button>

          {/* Kør Healthcheck */}
          <button
            style={btnBase}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            onClick={() => handleAction('health', async () => { onHealthcheck() })}
            disabled={loadingAction === 'health'}
          >
            <Icon name="gauge" size={16} /> {loadingAction === 'health' ? 'Tjekker...' : 'Koer Healthcheck'}
          </button>

          {/* Åbn GitHub */}
          <button
            style={btnBase}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            onClick={() => window.open('https://github.com/MartinSarvio/mission-kontrol', '_blank')}
          >
            <Icon name="globe" size={16} /> Aabn GitHub
          </button>
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
