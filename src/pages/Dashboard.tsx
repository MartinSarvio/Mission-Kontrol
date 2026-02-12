import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { DonutChart, BarChart } from '../components/Chart'
import { dashboardStats, agents, apiUsageData } from '../data/mock'

export default function Dashboard() {
  const s = dashboardStats
  return (
    <div>
      <h1 className="page-title mb-1">Dashboard</h1>
      <p className="caption mb-8">Operations overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Tasks', value: s.activeTasks, sub: 'across all agents' },
          { label: 'API Requests Today', value: s.apiToday.requests.toLocaleString(), sub: `${s.apiToday.tokens.toLocaleString()} tokens` },
          { label: 'Cost Today', value: `$${s.apiToday.cost.toFixed(2)}`, sub: 'within budget' },
          { label: 'Cron Jobs', value: `${s.cronActive} active`, sub: `${s.cronFailed} failing` },
        ].map((stat, i) => (
          <Card key={i}>
            <p className="caption">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
            <p className="caption mt-1">{stat.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card title="Agent Status" className="col-span-1">
          <DonutChart segments={[
            { value: s.agentStatus.running, color: '#34C759', label: 'Running' },
            { value: s.agentStatus.idle, color: '#8e8e93', label: 'Idle' },
            { value: s.agentStatus.paused, color: '#FF9500', label: 'Paused' },
            { value: s.agentStatus.failed, color: '#FF3B30', label: 'Failed' },
          ]} />
        </Card>
        <Card title="API Usage (7 days)" className="col-span-2">
          <BarChart data={apiUsageData.map(d => ({ label: d.date, value: d.requests, color: '#007AFF' }))} height={180} />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Attention Needed" subtitle={`${s.attentionItems.length} items require action`}>
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
        <Card title="Agents" subtitle="Current status">
          <div className="space-y-3">
            {agents.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="caption">{a.runsToday} runs today</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
