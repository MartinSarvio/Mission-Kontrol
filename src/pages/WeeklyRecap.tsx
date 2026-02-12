import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { weeklyMetrics } from '../data/mock'

export default function WeeklyRecap() {
  const m = weeklyMetrics
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Ugerapport</h1>
      <p className="caption mb-6">Uge 6.–12. februar 2026</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Fuldført', value: m.tasksCompleted.toString(), color: 'text-[#34C759]' },
          { label: 'I Gang', value: m.tasksInProgress.toString(), color: 'text-apple-blue' },
          { label: 'Blokeret', value: m.tasksBlocked.toString(), color: 'text-[#FF3B30]' },
          { label: 'Samlet Omkostning', value: `$${m.totalCost.toFixed(2)}`, color: 'text-white' },
        ].map((s, i) => (
          <Card key={i}>
            <p className="caption">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card title="Kvalitetsscore">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="text-5xl font-bold text-apple-blue">{m.qualityScore}%</div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <p>Baseret på evalueringer, fejlfrekvens og svartider.</p>
              <p className="mt-1 text-[#34C759] font-medium">Ny instans — baseline etableres</p>
            </div>
          </div>
        </Card>
        <Card title="Omkostning pr. Klient">
          <div className="space-y-2">
            {m.costPerClient.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 glass-row text-sm">
                <span className="font-medium">{c.client}</span>
                <span>${c.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Top Hændelser" className="mb-6">
        <div className="space-y-3">
          {m.incidents.slice(0, 5).map(inc => (
            <div key={inc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 glass-row">
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

      <Card title="Forslag til Næste Uge">
        <div className="space-y-2">
          {m.suggestions.map((s, i) => (
            <div key={i} className="flex gap-3 py-2 text-sm glass-row">
              <span className="text-apple-blue font-bold">{i + 1}</span>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>{s}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
