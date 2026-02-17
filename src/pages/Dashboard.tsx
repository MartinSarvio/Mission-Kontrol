import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import { DonutChart, BarChart, MiniLineChart } from '../components/Chart'
import { useLiveData } from '../api/LiveDataContext'
import { fetchSystemInfo, ApiSession, CronJobApi } from '../api/openclaw'
import { Status } from '../types'
import { DashboardSkeleton } from '../components/SkeletonLoader'
import { usePageTitle } from '../hooks/usePageTitle'
import { useResourceHistory } from '../hooks/useResourceHistory'
import { useRelativeTime, formatRelativeTime } from '../hooks/useRelativeTime'
import ConnectionStatus from '../components/ConnectionStatus'
import DataFreshness from '../components/DataFreshness'
import { useToast } from '../hooks/useToast'

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
  
  const { isConnected, isLoading, isRefreshing, error, lastUpdated, consecutiveErrors, sessions, statusText, cronJobs, gatewayConfig } = useLiveData()
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

  // RAM og Disk procent — bruges til sparklines
  const ramPct = useMemo(() => {
    return systemInfo.ramUsed && systemInfo.ramTotal
      ? Math.round((parseFloat(systemInfo.ramUsed) / parseFloat(systemInfo.ramTotal)) * 100)
      : null
  }, [systemInfo.ramUsed, systemInfo.ramTotal])

  const diskPctValue = systemInfo.diskPercent ?? null

  const { ramHistory, diskHistory } = useResourceHistory(ramPct, diskPctValue)

  // Estimeret dagligt forbrug baseret på sessions
  const dailySpend = useMemo(() => {
    const today = new Date()
    const isSameLocalDay = (ts: number) => {
      const d = new Date(ts)
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
    }

    const extractInOut = (s: any): { input: number; output: number } | null => {
      // Understøt flere mulige feltnavne fra API'er
      const directIn = s?.inputTokens ?? s?.promptTokens ?? s?.tokensIn ?? s?.inTokens
      const directOut = s?.outputTokens ?? s?.completionTokens ?? s?.tokensOut ?? s?.outTokens

      if (Number.isFinite(directIn) && Number.isFinite(directOut)) {
        return { input: Number(directIn), output: Number(directOut) }
      }

      const usage = s?.usage
      const usageIn = usage?.input_tokens ?? usage?.prompt_tokens ?? usage?.inputTokens
      const usageOut = usage?.output_tokens ?? usage?.completion_tokens ?? usage?.outputTokens
      if (Number.isFinite(usageIn) && Number.isFinite(usageOut)) {
        return { input: Number(usageIn), output: Number(usageOut) }
      }

      return null
    }

    let totalInput = 0
    let totalOutput = 0
    let rowsWithTokens = 0

    for (const s of sessions as any[]) {
      if (!s?.updatedAt || !isSameLocalDay(s.updatedAt)) continue
      const io = extractInOut(s)
      if (!io) continue
      rowsWithTokens++
      totalInput += io.input
      totalOutput += io.output
    }

    if (rowsWithTokens === 0) {
      return { hasData: false, dkk: 0, inputTokens: 0, outputTokens: 0 }
    }

    const usd = (totalInput / 1_000_000 * 15) + (totalOutput / 1_000_000 * 75)
    const dkk = usd * 7
    return { hasData: true, dkk, inputTokens: totalInput, outputTokens: totalOutput }
  }, [sessions])

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
        <ConnectionStatus />
        {!isConnected && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-orange-400" style={{ background: 'rgba(255,149,0,0.1)' }}>
            Ikke forbundet
          </span>
        )}
        <DataFreshness className="ml-auto" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
                background: 'radial-gradient(ellipse, rgba(255, 159, 10, 0.22) 0%, transparent 70%)',
                filter: 'blur(20px)',
                zIndex: -1
              }} />
              <div className="flex items-center justify-between">
                <p className="caption">Dagligt Forbrug</p>
                <Icon name="zap" size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
              </div>
              <p className="text-2xl font-bold mt-1">
                {dailySpend.hasData ? `~${Math.round(dailySpend.dkk)} kr` : 'Ingen data'}
              </p>
              <p className="caption mt-1">i dag</p>
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

          {/* Hurtige handlinger */}
          <HurtigeHandlinger />

          {/* Dagens Forbrug - Cost Tracker */}
          <DagensForbrug sessions={sessions} />

          {/* Systemhelbred */}
          <Card title="Systemhelbred" subtitle="Server- og forbindelsesstatus" className="mb-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gateway Uptime */}
              <div className="flex items-start gap-3">
                <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: 'rgba(48,209,88,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="server" size={16} style={{ color: '#34C759' }} />
                </div>
                <div className="min-w-0">
                  <p className="caption text-xs">Gateway Oppetid</p>
                  <p className="text-sm font-semibold text-white truncate">
                    {systemInfo.uptime || 'Ukendt'}
                  </p>
                </div>
              </div>

              {/* RAM */}
              {(() => {
                const ramColor = ramPct === null ? '#8E8E93' : ramPct > 90 ? '#FF3B30' : ramPct > 70 ? '#FF9F0A' : '#34C759'
                return (
                  <div className="flex items-start gap-3">
                    <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: `${ramColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="gauge" size={16} style={{ color: ramColor }} />
                    </div>
                    <div className="min-w-0">
                      <p className="caption text-xs">Hukommelse</p>
                      <p className="text-sm font-semibold text-white truncate">
                        {ramPct !== null ? `${ramPct}%` : 'N/A'}
                      </p>
                      <p className="caption text-xs truncate">{systemInfo.ramUsed && systemInfo.ramTotal ? `${systemInfo.ramUsed} / ${systemInfo.ramTotal}` : ''}</p>
                      {ramHistory.length >= 2 && (
                        <div style={{ marginTop: 4 }}>
                          <MiniLineChart data={ramHistory} color="#007AFF" width={80} height={28} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Disk */}
              {(() => {
                const diskColor = diskPctValue === null ? '#8E8E93' : diskPctValue > 90 ? '#FF3B30' : diskPctValue > 70 ? '#FF9F0A' : '#34C759'
                return (
                  <div className="flex items-start gap-3">
                    <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: `${diskColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="folder" size={16} style={{ color: diskColor }} />
                    </div>
                    <div className="min-w-0">
                      <p className="caption text-xs">Disk</p>
                      <p className="text-sm font-semibold text-white truncate">
                        {diskPctValue !== null ? `${diskPctValue}%` : 'N/A'}
                      </p>
                      <p className="caption text-xs truncate">{systemInfo.diskUsed && systemInfo.diskTotal ? `${systemInfo.diskUsed} / ${systemInfo.diskTotal}` : ''}</p>
                      {diskHistory.length >= 2 && (
                        <div style={{ marginTop: 4 }}>
                          <MiniLineChart data={diskHistory} color="#30D158" width={80} height={28} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Connectivity */}
              {(() => {
                const score = consecutiveErrors === 0 ? 100 : Math.max(0, 100 - consecutiveErrors * 20)
                const connColor = score >= 80 ? '#34C759' : score >= 50 ? '#FF9F0A' : '#FF3B30'
                return (
                  <div className="flex items-start gap-3">
                    <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: `${connColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="zap" size={16} style={{ color: connColor }} />
                    </div>
                    <div className="min-w-0">
                      <p className="caption text-xs">Forbindelse</p>
                      <p className="text-sm font-semibold truncate" style={{ color: connColor }}>
                        {score}%
                      </p>
                      <p className="caption text-xs truncate">{consecutiveErrors === 0 ? 'Stabil' : `${consecutiveErrors} fejl i træk`}</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </Card>

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

          <RecentActivity sessions={sessions} cronJobs={cronJobs} />
        </>
      )}
    </div>
  )
}

// ── Hurtige handlinger ───────────────────────────────────────────────
const HurtigeHandlinger = memo(function HurtigeHandlinger() {
  const handlinger = [
    {
      icon: 'sparkle',
      title: 'Ny Workshop prompt',
      description: 'Skriv og test AI prompts',
      hash: 'workshop',
      accentColor: '#AF52DE',
    },
    {
      icon: 'doc-text',
      title: 'Se Journal',
      description: 'Gennemse agent aktivitet',
      hash: 'journal',
      accentColor: '#007AFF',
    },
    {
      icon: 'timer',
      title: 'Cron Jobs',
      description: 'Planlagte automatiseringer',
      hash: 'cron',
      accentColor: '#FF9F0A',
    },
    {
      icon: 'chart-bar',
      title: 'API Forbrug',
      description: 'Token og omkostningsoversigt',
      hash: 'api',
      accentColor: '#34C759',
    },
  ]

  return (
    <Card title="Hurtige handlinger" subtitle="Genveje til vigtige sider" className="mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {handlinger.map(h => (
          <button
            key={h.hash}
            onClick={() => { window.location.hash = h.hash }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 10,
              padding: '16px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
              width: '100%',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.boxShadow = `0 0 24px ${h.accentColor}20`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: `${h.accentColor}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name={h.icon} size={17} style={{ color: h.accentColor }} />
            </div>
            <div style={{ minWidth: 0, width: '100%' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.title}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, margin: 0 }}>{h.description}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
})

// ── Dagens Forbrug Cost Tracker ──────────────────────────────────────
const DagensForbrug = memo(function DagensForbrug({ sessions }: { sessions: ApiSession[] }) {
  const costData = useMemo(() => {
    const today = new Date()
    const isSameDay = (ts: number) => {
      const d = new Date(ts)
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
    }

    // Model pricing (USD per 1M tokens): input / output
    const pricing: Record<string, { input: number; output: number }> = {
      'opus': { input: 15, output: 75 },
      'sonnet': { input: 3, output: 15 },
      'haiku': { input: 0.25, output: 1.25 },
    }

    const getModelKey = (model: string): string => {
      const m = model.toLowerCase()
      if (m.includes('opus')) return 'opus'
      if (m.includes('sonnet')) return 'sonnet'
      if (m.includes('haiku')) return 'haiku'
      return 'opus' // default
    }

    const getModelLabel = (key: string): string => {
      if (key === 'opus') return 'Opus'
      if (key === 'sonnet') return 'Sonnet'
      if (key === 'haiku') return 'Haiku'
      return key
    }

    interface SessionCost {
      name: string
      cost: number
      model: string
    }

    const sessionCosts: SessionCost[] = []
    const modelTotals: Record<string, number> = {}
    let totalCost = 0

    for (const s of sessions) {
      if (!isSameDay(s.updatedAt)) continue

      const modelKey = getModelKey(s.model || '')
      const p = pricing[modelKey] || pricing['opus']

      // Estimate: assume ~40% input, ~60% output for total tokens
      const total = s.totalTokens || s.contextTokens || 0
      if (total === 0) continue

      const inputTokens = Math.round(total * 0.4)
      const outputTokens = Math.round(total * 0.6)
      const cost = (inputTokens / 1_000_000 * p.input) + (outputTokens / 1_000_000 * p.output)

      totalCost += cost
      modelTotals[modelKey] = (modelTotals[modelKey] || 0) + cost

      const name = s.displayName || s.label || (s.key === 'agent:main:main' ? 'Hovedagent' : s.key.split(':').pop() || 'Session')
      sessionCosts.push({ name, cost, model: getModelLabel(modelKey) })
    }

    // Top 3 sessions by cost
    const top3 = [...sessionCosts].sort((a, b) => b.cost - a.cost).slice(0, 3)

    // Bar chart data by model
    const modelColors: Record<string, string> = {
      opus: '#AF52DE',
      sonnet: '#007AFF',
      haiku: '#34C759',
    }
    const barData = Object.entries(modelTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([key, cost]) => ({
        label: getModelLabel(key),
        value: parseFloat(cost.toFixed(4)),
        color: modelColors[key] || '#8E8E93',
      }))

    return {
      hasData: sessionCosts.length > 0,
      totalCost,
      top3,
      barData,
    }
  }, [sessions])

  return (
    <Card className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,159,10,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chart-bar" size={14} style={{ color: '#FF9F0A' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Dagens Forbrug</p>
          <p className="caption text-xs">Estimeret omkostning i dag</p>
        </div>
      </div>

      {!costData.hasData ? (
        <div className="text-center py-8 text-white/50 text-sm">
          <p style={{ color: 'rgba(255,255,255,0.3)' }}>&mdash;</p>
          <p className="mt-1">Ingen forbrugsdata for i dag</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Total forbrug */}
          <div className="flex flex-col items-center justify-center">
            <p className="caption text-xs mb-1">Total i dag</p>
            <p className="text-3xl font-bold text-white">${costData.totalCost.toFixed(2)}</p>
            <p className="caption text-xs mt-1">USD estimeret</p>
          </div>

          {/* Top 3 sessions */}
          <div>
            <p className="caption text-xs mb-3">Top sessioner</p>
            <div className="space-y-2">
              {costData.top3.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600, width: 16 }}>{i + 1}.</span>
                    <span className="truncate text-white/80">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="caption text-xs">{s.model}</span>
                    <span className="font-medium text-white">${s.cost.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart by model */}
          <div>
            <p className="caption text-xs mb-3">Fordelt pr. model</p>
            {costData.barData.length > 0 ? (
              <BarChart data={costData.barData} height={120} showValues />
            ) : (
              <p className="text-white/30 text-sm text-center py-4">&mdash;</p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
})

const QuickActions = memo(function QuickActions({ onHealthcheck }: { onHealthcheck: () => void }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const toast = useToast()

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
                    toast.warning('Genstarter Gateway...')
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
            onClick={() => handleAction('cache', async () => { toast.info('Cache ryddet — genindlæser...'); localStorage.clear(); window.location.reload() })}
            disabled={loadingAction === 'cache'}
          >
            <Icon name="xmark" size={16} /> {loadingAction === 'cache' ? 'Rydder...' : 'Ryd Cache'}
          </button>

          {/* Kør Healthcheck */}
          <button
            style={btnBase}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            onClick={() => handleAction('health', async () => { onHealthcheck(); toast.success('Healthcheck startet') })}
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
})

const RecentActivity = memo(function RecentActivity({ sessions, cronJobs }: { sessions: ApiSession[], cronJobs: CronJobApi[] }) {
  interface ActivityEvent {
    id: string
    type: 'session_start' | 'session_end' | 'cron_run' | 'error'
    timestamp: number
    icon: string
    title: string
    description: string
  }

  const events = useMemo(() => {
    const allEvents: ActivityEvent[] = []

    // Tilføj session events
    sessions.forEach(s => {
      const isActive = Date.now() - s.updatedAt < 120000
      const sessionType = s.key.includes('subagent') ? 'Subagent' : s.key.includes('main') ? 'Hovedagent' : 'Session'
      const agentName = s.displayName || s.label || s.key.split(':')[1] || 'Unavngiven'

      if (isActive) {
        // Aktiv session = start event
        allEvents.push({
          id: `session-start-${s.key}`,
          type: 'session_start',
          timestamp: s.updatedAt,
          icon: 'play',
          title: `${agentName} startede`,
          description: `${sessionType} · ${s.channel || 'ingen kanal'}`
        })
      } else {
        // Inaktiv session = slut event
        allEvents.push({
          id: `session-end-${s.key}`,
          type: 'session_end',
          timestamp: s.updatedAt,
          icon: 'checkmark-circle',
          title: `${agentName} afsluttede`,
          description: `${sessionType} · ${s.contextTokens ? `${Math.round(s.contextTokens / 1000)}k tokens` : 'Færdig'}`
        })
      }
    })

    // Tilføj cron job runs
    cronJobs.forEach(job => {
      if (job.lastRun) {
        const lastRunTime = new Date(job.lastRun).getTime()
        if (!isNaN(lastRunTime)) {
          allEvents.push({
            id: `cron-${job.id}-${lastRunTime}`,
            type: 'cron_run',
            timestamp: lastRunTime,
            icon: 'timer',
            title: `${job.name || 'Planlagt job'} kørte`,
            description: typeof job.schedule === 'object' 
              ? (job.schedule?.expr || job.schedule?.kind || 'Planlagt') 
              : (job.schedule || 'Ukendt tidsplan')
          })
        }
      }
    })

    // Sorter efter tidspunkt (nyeste først) og tag max 10
    return allEvents
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
  }, [sessions, cronJobs])

  if (events.length === 0) {
    return (
      <div className="mb-8">
        <Card title="Seneste Aktivitet" subtitle="Unified activity feed">
          <div className="text-center py-12 text-white/50 text-sm">
            <Icon name="info-circle" size={32} className="mb-3 opacity-30" style={{ display: 'inline-flex' }} />
            <p>Ingen aktivitet endnu</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <Card title="Seneste Aktivitet" subtitle={`${events.length} seneste hændelser`}>
        <div className="space-y-1">
          {events.map((event, index) => (
            <ActivityEventRow key={event.id} event={event} isLast={index === events.length - 1} />
          ))}
        </div>
      </Card>
    </div>
  )
})

const ActivityEventRow = memo(function ActivityEventRow({ event, isLast }: { event: { type: string; timestamp: number; icon: string; title: string; description: string }; isLast: boolean }) {
  const timeAgo = useRelativeTime(event.timestamp)
  
  const iconColor = event.type === 'session_start' 
    ? '#34C759' 
    : event.type === 'session_end' 
    ? '#007AFF' 
    : event.type === 'cron_run' 
    ? '#FF9F0A' 
    : '#FF3B30'

  return (
    <div className="relative flex gap-3 py-3">
      {/* Timeline line */}
      {!isLast && (
        <div 
          style={{
            position: 'absolute',
            left: '11px',
            top: '36px',
            bottom: '-12px',
            width: '2px',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
          }}
        />
      )}
      
      {/* Icon circle */}
      <div 
        style={{
          position: 'relative',
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: `${iconColor}15`,
          border: `2px solid ${iconColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1
        }}
      >
        <Icon name={event.icon} size={12} style={{ color: iconColor }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="text-sm font-medium text-white truncate">{event.title}</p>
          <span className="caption text-xs flex-shrink-0">{timeAgo}</span>
        </div>
        <p className="caption text-xs truncate">{event.description}</p>
      </div>
    </div>
  )
})

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60000) return 'lige nu'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min siden`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}t siden`
  return `${Math.floor(diff / 86400000)}d siden`
}
