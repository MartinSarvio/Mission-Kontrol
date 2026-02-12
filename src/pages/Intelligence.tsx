import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { BarChart } from '../components/Chart'
import { incidents, agents } from '../data/mock'

export default function Intelligence() {
  const activeIncidents = incidents.filter(i => i.status === 'active')

  return (
    <div>
      <h1 className="page-title mb-1">Intelligence</h1>
      <p className="caption mb-6">Anomaly detection and insights</p>

      <Card title="What Changed" subtitle="Recent anomalies and regressions" className="mb-6">
        <div className="space-y-3">
          {activeIncidents.map(inc => (
            <div key={inc.id} className="flex items-center justify-between py-3 border-b border-apple-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <StatusBadge status={inc.severity} />
                <div>
                  <p className="text-sm font-medium">{inc.title}</p>
                  <p className="caption">{inc.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm">{inc.agent}</p>
                <p className="caption">{inc.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card title="Success Rate by Agent">
          <BarChart data={agents.map(a => ({
            label: a.name.split(' ')[0],
            value: a.status === 'failed' ? 78 : a.status === 'paused' ? 89 : 95 + Math.floor(Math.random() * 5),
            color: a.status === 'failed' ? '#FF3B30' : a.status === 'paused' ? '#FF9500' : '#34C759'
          }))} height={160} />
        </Card>
        <Card title="Cost by Client (This Week)">
          <BarChart data={[
            { label: 'Acme', value: 128, color: '#007AFF' },
            { label: 'Global', value: 89, color: '#007AFF' },
            { label: 'Tech', value: 56, color: '#007AFF' },
            { label: 'Style', value: 29, color: '#007AFF' },
            { label: 'Nordic', value: 15, color: '#007AFF' },
          ]} height={160} />
        </Card>
      </div>

      <Card title="Top Failure Modes" subtitle="Patterns detected this week">
        <div className="space-y-3">
          {[
            { mode: 'Connection Timeout', count: 12, trend: '↑ 3x', severity: 'error' as const },
            { mode: 'Rate Limit Exceeded', count: 8, trend: '↑ 2x', severity: 'warning' as const },
            { mode: 'Invalid API Response', count: 5, trend: '→ stable', severity: 'warning' as const },
            { mode: 'Context Window Exceeded', count: 3, trend: '↓ 50%', severity: 'info' as const },
          ].map((f, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <StatusBadge status={f.severity} />
                <span className="text-sm font-medium">{f.mode}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm">{f.count} occurrences</span>
                <span className="caption">{f.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Root Cause Hints" className="mt-4">
        <div className="space-y-2">
          {[
            'Database connection pool exhaustion correlates with peak traffic (4-5 AM UTC). Consider increasing pool size or adding connection queuing.',
            'SSO failures started after the Feb 8 deployment. Check SAML configuration diff.',
            'Rate limits on Content Agent consistently hit during bulk operations. Recommend batch processing with delays.',
          ].map((hint, i) => (
            <div key={i} className="flex gap-2 py-2 text-sm">
              <span className="text-apple-blue">💡</span>
              <p className="text-apple-gray-600">{hint}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
