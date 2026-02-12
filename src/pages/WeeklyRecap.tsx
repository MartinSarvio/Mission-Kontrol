import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { BarChart } from '../components/Chart'
import { weeklyMetrics } from '../data/mock'

export default function WeeklyRecap() {
  const m = weeklyMetrics
  return (
    <div>
      <h1 className="page-title mb-1">Weekly Recap</h1>
      <p className="caption mb-6">Week of February 6–12, 2026</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Completed', value: m.tasksCompleted.toLocaleString(), color: 'text-[#34C759]' },
          { label: 'In Progress', value: m.tasksInProgress.toString(), color: 'text-apple-blue' },
          { label: 'Blocked', value: m.tasksBlocked.toString(), color: 'text-[#FF3B30]' },
          { label: 'Total Cost', value: `$${m.totalCost.toFixed(2)}`, color: 'text-apple-text' },
        ].map((s, i) => (
          <Card key={i}>
            <p className="caption">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card title="Cost per Client">
          <BarChart data={m.costPerClient.map(c => ({ label: c.client.split(' ')[0], value: c.cost, color: '#007AFF' }))} height={160} />
        </Card>
        <Card title="Quality Score">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-apple-blue">{m.qualityScore}%</div>
            <div className="text-sm text-apple-gray-500">
              <p>Based on eval pass rates, error frequency, and latency metrics.</p>
              <p className="mt-1 text-[#34C759] font-medium">↑ 2.3% from last week</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Top 5 Incidents" className="mb-6">
        <div className="space-y-3">
          {m.incidents.slice(0, 5).map(inc => (
            <div key={inc.id} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <StatusBadge status={inc.severity} />
                <div>
                  <p className="text-sm font-medium">{inc.title}</p>
                  <p className="caption">{inc.agent} · {inc.client}</p>
                </div>
              </div>
              <StatusBadge status={inc.status} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Suggestions for Next Week">
        <div className="space-y-2">
          {m.suggestions.map((s, i) => (
            <div key={i} className="flex gap-3 py-2 text-sm border-b border-apple-gray-50 last:border-0">
              <span className="text-apple-blue font-bold">{i + 1}</span>
              <p className="text-apple-gray-600">{s}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
