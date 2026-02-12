import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { DonutChart, BarChart } from '../components/Chart'
import { dashboardStats, agents, apiUsageData, channels, systemInfo } from '../data/mock'

export default function Dashboard() {
  const s = dashboardStats
  return (
    <div>
      <h1 className="page-title mb-1">Oversigt</h1>
      <p className="caption mb-8">Driftsoverblik — {new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Aktive Opgaver', value: s.activeTasks, sub: 'på tværs af alle agenter' },
          { label: 'API Forespørgsler i Dag', value: s.apiToday.requests.toLocaleString(), sub: `${s.apiToday.tokens.toLocaleString()} tokens` },
          { label: 'Omkostning i Dag', value: `$${s.apiToday.cost.toFixed(2)}`, sub: 'Anthropic API-nøgle' },
          { label: 'Planlagte Jobs', value: `${s.cronActive} aktive`, sub: s.cronFailed > 0 ? `${s.cronFailed} fejlende` : 'Ingen konfigureret endnu' },
        ].map((stat, i) => (
          <Card key={i}>
            <p className="caption">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
            <p className="caption mt-1">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* System Info */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card title="System">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="caption">Vært</span><span className="font-medium">{systemInfo.host}</span></div>
            <div className="flex justify-between"><span className="caption">OS</span><span className="font-medium">{systemInfo.os}</span></div>
            <div className="flex justify-between"><span className="caption">CPU</span><span className="font-medium">2 vCPU (EPYC)</span></div>
            <div className="flex justify-between"><span className="caption">RAM</span><span className="font-medium">{systemInfo.ramUsed} / {systemInfo.ramTotal}</span></div>
            <div className="flex justify-between"><span className="caption">Disk</span><span className="font-medium">{systemInfo.diskUsed} / {systemInfo.diskTotal} ({systemInfo.diskPercent}%)</span></div>
            <div className="flex justify-between"><span className="caption">Oppetid</span><span className="font-medium">{systemInfo.uptime}</span></div>
            <div className="flex justify-between"><span className="caption">Node</span><span className="font-medium">{systemInfo.nodeVersion}</span></div>
          </div>
        </Card>
        <Card title="Agentstatus" className="col-span-1">
          <DonutChart segments={[
            { value: s.agentStatus.running, color: '#34C759', label: 'Kørende' },
            { value: s.agentStatus.completed || 0, color: '#007AFF', label: 'Afsluttet' },
            ...(s.agentStatus.idle > 0 ? [{ value: s.agentStatus.idle, color: '#8e8e93', label: 'Inaktiv' }] : []),
            ...(s.agentStatus.paused > 0 ? [{ value: s.agentStatus.paused, color: '#FF9500', label: 'Pauseret' }] : []),
            ...(s.agentStatus.failed > 0 ? [{ value: s.agentStatus.failed, color: '#FF3B30', label: 'Fejlet' }] : []),
          ]} />
        </Card>
        <Card title="API Forbrug (7 dage)">
          <BarChart data={apiUsageData.map(d => ({ label: d.date, value: d.requests, color: '#007AFF' }))} height={180} />
        </Card>
      </div>

      {/* Channels */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card title="Kanaler" subtitle="Forbindelsesstatus">
          <div className="space-y-3">
            {channels.map(ch => (
              <div key={ch.name} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0">
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
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.severity} />
                  <span className="text-sm">{item.title}</span>
                </div>
                <span className="caption">{item.source}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Sessions */}
      <Card title="Sessioner" subtitle="Aktive agentsessioner">
        <div className="space-y-3">
          {agents.map(a => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="caption">{a.purpose}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono bg-apple-gray-50 px-2 py-0.5 rounded">{a.model}</span>
                <StatusBadge status={a.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
