import Card from '../components/Card'
import Table from '../components/Table'
import StatusBadge from '../components/StatusBadge'
import { cronJobs } from '../data/mock'

export default function CronJobs() {
  return (
    <div>
      <h1 className="page-title mb-1">Cron Jobs</h1>
      <p className="caption mb-6">{cronJobs.length} scheduled jobs</p>

      <div className="flex gap-3 mb-6">
        <button className="btn-primary">Create Job</button>
        <button className="btn-secondary">Alarm Rules</button>
      </div>

      <Card>
        <Table
          data={cronJobs}
          columns={[
            { key: 'name', header: 'Job Name', render: j => <span className="font-medium">{j.name}</span> },
            { key: 'status', header: 'Status', render: j => <StatusBadge status={j.status} /> },
            { key: 'schedule', header: 'Schedule', render: j => <code className="text-xs bg-apple-gray-50 px-2 py-0.5 rounded">{j.schedule}</code> },
            { key: 'agent', header: 'Agent', render: j => j.agent },
            { key: 'lastRun', header: 'Last Run', render: j => <span className="caption">{j.lastRun}</span> },
            { key: 'nextRun', header: 'Next Run', render: j => <span className="caption">{j.nextRun}</span> },
            { key: 'duration', header: 'Duration', render: j => j.duration },
            { key: 'retries', header: 'Retries', render: j => (
              <span className={j.retries > 0 ? 'text-[#FF9500] font-medium' : ''}>{j.retries}/{j.maxRetries}</span>
            )},
            { key: 'actions', header: '', render: j => (
              <button className="text-xs text-apple-blue hover:underline">
                {j.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
            )},
          ]}
        />
      </Card>

      {cronJobs.filter(j => j.errorLog).map(j => (
        <Card key={j.id} title={`Error: ${j.name}`} className="mt-4">
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-mono">{j.errorLog}</div>
          <p className="caption mt-2">Retried {j.retries} of {j.maxRetries} times</p>
        </Card>
      ))}
    </div>
  )
}
