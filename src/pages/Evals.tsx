import Card from '../components/Card'
import Table from '../components/Table'
import StatusBadge from '../components/StatusBadge'
import { BarChart } from '../components/Chart'
import { evalDatasets, evalRuns } from '../data/mock'

export default function Evals() {
  return (
    <div>
      <h1 className="page-title mb-1">Evals</h1>
      <p className="caption mb-6">Evaluation datasets and quality tracking</p>

      <div className="flex gap-3 mb-6">
        <button className="btn-primary">New Eval Run</button>
        <button className="btn-secondary">Create Dataset</button>
      </div>

      <Card title="Datasets" className="mb-6">
        <Table
          data={evalDatasets}
          columns={[
            { key: 'name', header: 'Dataset', render: d => <span className="font-medium">{d.name}</span> },
            { key: 'status', header: 'Status', render: d => <StatusBadge status={d.status} /> },
            { key: 'cases', header: 'Test Cases', render: d => d.testCases },
            { key: 'score', header: 'Avg Score', render: d => (
              <span className={d.avgScore >= 90 ? 'text-[#34C759] font-medium' : d.avgScore >= 80 ? 'text-[#FF9500] font-medium' : 'text-[#FF3B30] font-medium'}>
                {d.avgScore}%
              </span>
            )},
            { key: 'pass', header: 'Pass Rate', render: d => `${d.passRate}%` },
            { key: 'lastRun', header: 'Last Run', render: d => <span className="caption">{d.lastRun}</span> },
          ]}
        />
      </Card>

      <Card title="Recent Eval Runs" className="mb-6">
        <div className="space-y-4">
          {evalRuns.map(run => (
            <div key={run.id} className="flex items-center justify-between py-3 border-b border-apple-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium">{run.dataset}</p>
                <p className="caption">{run.agent} · {run.timestamp} · {run.duration}</p>
              </div>
              <div className="flex items-center gap-6">
                {run.comparison && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-apple-gray-400">{run.comparison.before}%</span>
                    <span className="text-apple-gray-300">→</span>
                    <span className={run.comparison.after >= run.comparison.before ? 'text-[#34C759] font-medium' : 'text-[#FF3B30] font-medium'}>
                      {run.comparison.after}%
                    </span>
                    <span className={`text-xs ${run.comparison.after >= run.comparison.before ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                      {run.comparison.after >= run.comparison.before ? '↑' : '↓'}
                      {Math.abs(run.comparison.after - run.comparison.before).toFixed(1)}%
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium">{run.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Score Distribution">
        <BarChart data={[
          { label: '90-100', value: 45, color: '#34C759' },
          { label: '80-89', value: 28, color: '#007AFF' },
          { label: '70-79', value: 12, color: '#FF9500' },
          { label: '60-69', value: 5, color: '#FF9500' },
          { label: '<60', value: 2, color: '#FF3B30' },
        ]} height={160} />
      </Card>
    </div>
  )
}
