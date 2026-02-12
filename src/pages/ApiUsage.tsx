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
      <h1 className="page-title mb-1">API Usage</h1>
      <p className="caption mb-6">Token consumption and cost tracking</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Tokens', value: (totalTokens / 1000).toFixed(0) + 'K', trend: apiUsageData.map(d => d.tokens) },
          { label: 'Total Requests', value: totalRequests.toLocaleString(), trend: apiUsageData.map(d => d.requests) },
          { label: 'Total Cost', value: `$${totalCost.toFixed(2)}`, trend: apiUsageData.map(d => d.cost) },
          { label: 'Errors', value: totalErrors.toString(), trend: apiUsageData.map(d => d.errors) },
        ].map((s, i) => (
          <Card key={i}>
            <p className="caption">{s.label}</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-2xl font-bold">{s.value}</p>
              <MiniLineChart data={s.trend} color={s.label === 'Errors' ? '#FF3B30' : '#007AFF'} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card title="Requests Over Time">
          <BarChart data={apiUsageData.map(d => ({ label: d.date, value: d.requests, color: '#007AFF' }))} height={200} />
        </Card>
        <Card title="Cost Over Time">
          <BarChart data={apiUsageData.map(d => ({ label: d.date, value: Math.round(d.cost * 100) / 100, color: '#34C759' }))} height={200} />
        </Card>
      </div>

      <Card title="Breakdown by Client">
        <div className="space-y-3">
          {[
            { client: 'Acme Corp', tokens: '412K', requests: 3420, cost: 128.40, pct: 40 },
            { client: 'Global Foods', tokens: '289K', requests: 2100, cost: 89.30, pct: 28 },
            { client: 'TechStart Inc', tokens: '178K', requests: 1340, cost: 56.20, pct: 18 },
            { client: 'StyleHouse', tokens: '67K', requests: 520, cost: 28.50, pct: 9 },
            { client: 'Nordic Health', tokens: '42K', requests: 340, cost: 14.80, pct: 5 },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-apple-gray-50 last:border-0">
              <span className="text-sm font-medium w-32">{c.client}</span>
              <div className="flex-1 bg-apple-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-apple-blue h-full rounded-full transition-all" style={{ width: `${c.pct}%` }} />
              </div>
              <span className="text-sm w-16 text-right">{c.tokens}</span>
              <span className="text-sm w-16 text-right">{c.requests}</span>
              <span className="text-sm w-20 text-right font-medium">${c.cost}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Budget Alert" className="mt-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#FF9500] text-lg">⚠️</span>
          <p>Monthly budget: <span className="font-bold">$500.00</span> — Used: <span className="font-bold">${totalCost.toFixed(2)}</span> ({(totalCost / 500 * 100).toFixed(1)}%). On track to exceed by ~15% at current rate.</p>
        </div>
      </Card>
    </div>
  )
}
