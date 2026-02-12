import Card from '../components/Card'
import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import { useLiveData } from '../api/LiveDataContext'

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-orange-600" style={{ background: 'rgba(255,149,0,0.1)' }}>
      Demo data
    </span>
  )
}

export default function CronJobs() {
  const { isConnected, cronJobs } = useLiveData()

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="page-title">Planlagte Jobs</h1>
        {!isConnected && <DemoBadge />}
      </div>
      <p className="caption mb-6">{cronJobs.length} planlagte jobs{isConnected ? ' (live)' : ''}</p>

      <div className="flex gap-3 mb-6">
        <button className="btn-primary">Opret Job</button>
        <button className="btn-secondary">Alarmregler</button>
      </div>

      {cronJobs.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <Icon name="clock" size={40} className="text-apple-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2" style={{ color: '#636366' }}>Ingen planlagte jobs endnu</p>
            <p className="caption max-w-md mx-auto">
              Planlagte jobs giver dig mulighed for at automatisere gentagne opgaver som rapporter, sundhedstjek, backups og mere.
              Klik &quot;Opret Job&quot; for at komme i gang.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {cronJobs.map((job, i) => (
            <Card key={job.id || i}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <StatusBadge status={job.enabled !== false ? 'active' : 'paused'} />
                  <div>
                    <p className="text-sm font-medium">{job.name || job.id}</p>
                    <p className="caption font-mono">{job.schedule}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  {job.lastRun && <div className="text-right"><p className="font-medium">{job.lastRun}</p><p className="caption">sidst kørt</p></div>}
                  {job.nextRun && <div className="text-right"><p className="font-medium">{job.nextRun}</p><p className="caption">næste kørsel</p></div>}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${job.enabled !== false ? 'text-green-600' : 'text-gray-500'}`}
                    style={{ background: job.enabled !== false ? 'rgba(52,199,89,0.1)' : 'rgba(0,0,0,0.04)' }}>
                    {job.enabled !== false ? 'Aktiv' : 'Deaktiveret'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
