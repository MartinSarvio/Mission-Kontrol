import Card from '../components/Card'
import { BarChart, MiniLineChart } from '../components/Chart'
import { apiUsageData } from '../data/mock'

export default function ApiUsage() {
  const totalTokens = apiUsageData.reduce((s, d) => s + d.tokens, 0)
  const totalCost = apiUsageData.reduce((s, d) => s + d.cost, 0)
  const totalRequests = apiUsageData.reduce((s, d) => s + d.requests, 0)
  const totalErrors = apiUsageData.reduce((s, d) => s + d.errors, 0)

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">API Forbrug</h1>
      <p className="caption mb-6">Tokenforbrug og omkostningssporing</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Samlet Tokens', value: (totalTokens / 1000).toFixed(0) + 'K', trend: apiUsageData.map(d => d.tokens) },
          { label: 'Samlet Forespørgsler', value: totalRequests.toLocaleString(), trend: apiUsageData.map(d => d.requests) },
          { label: 'Samlet Omkostning', value: `$${totalCost.toFixed(2)}`, trend: apiUsageData.map(d => d.cost) },
          { label: 'Fejl', value: totalErrors.toString(), trend: apiUsageData.map(d => d.errors) },
        ].map((s, i) => (
          <Card key={i}>
            <p className="caption">{s.label}</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-2xl font-bold">{s.value}</p>
              <MiniLineChart data={s.trend} color={s.label === 'Fejl' ? '#FF3B30' : '#007AFF'} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card title="Forespørgsler Over Tid">
          <BarChart data={apiUsageData.map(d => ({ label: d.date, value: d.requests, color: '#007AFF' }))} height={200} />
        </Card>
        <Card title="Tokens Over Tid">
          <BarChart data={apiUsageData.map(d => ({ label: d.date, value: d.tokens, color: '#34C759' }))} height={200} />
        </Card>
      </div>

      <Card title="Modeller i Brug">
        <div className="space-y-3">
          {[
            { model: 'claude-opus-4-6', role: 'Primær model', status: 'Aktiv' },
            { model: 'claude-sonnet-4-5', role: 'Fallback 1', status: 'Klar' },
            { model: 'claude-opus-4-5', role: 'Fallback 2', status: 'Klar' },
            { model: 'claude-opus-4-1', role: 'Fallback 3', status: 'Klar' },
            { model: 'claude-haiku-4-5', role: 'Fallback 4', status: 'Klar (under anbefalet)' },
          ].map((m, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 glass-row">
              <div>
                <p className="text-sm font-medium font-mono break-all">{m.model}</p>
                <p className="caption">{m.role}</p>
              </div>
              <span className="text-sm whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>{m.status}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Autentificeringsprofiler" className="mt-4">
        <div className="space-y-2">
          {[
            { name: 'anthropic:default', type: 'API-nøgle', desc: 'Primær autentificering' },
            { name: 'anthropic:flow-agent', type: 'Token', desc: 'Flow agent profil' },
          ].map((p, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 glass-row text-sm">
              <div>
                <p className="font-medium font-mono break-all">{p.name}</p>
                <p className="caption">{p.desc}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{p.type}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
