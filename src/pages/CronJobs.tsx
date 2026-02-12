import Card from '../components/Card'
import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import { useLiveData } from '../api/LiveDataContext'

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-orange-400" style={{ background: 'rgba(255,149,0,0.1)' }}>
      Demo data
    </span>
  )
}

export default function CronJobs() {
  const { isConnected, cronJobs } = useLiveData()

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold">Planlagte Jobs</h1>
        {!isConnected && <DemoBadge />}
      </div>
      <p className="caption mb-6">{cronJobs.length} planlagte jobs{isConnected ? ' (live)' : ''}</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <button className="btn-primary" style={{ minHeight: '44px' }}>Opret Job</button>
        <button className="px-4 py-2 text-sm font-medium rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", minHeight: '44px' }}>Alarmregler</button>
      </div>

      {cronJobs.length === 0 ? (
        <Card>
          <div className="text-center py-16 px-4">
            <Icon name="clock" size={40} className="text-white/30 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Ingen planlagte jobs endnu</p>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <StatusBadge status={job.enabled !== false ? 'active' : 'paused'} />
                  <div>
                    <p className="text-sm font-medium">{job.name || job.id}</p>
                    <p className="caption font-mono">{job.schedule}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                  {job.lastRun && <div className="text-left sm:text-right"><p className="font-medium">{job.lastRun}</p><p className="caption">sidst kørt</p></div>}
                  {job.nextRun && <div className="text-left sm:text-right"><p className="font-medium">{job.nextRun}</p><p className="caption">næste kørsel</p></div>}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${job.enabled !== false ? 'text-green-400' : 'text-white/50'}`}
                    style={{ background: job.enabled !== false ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.06)' }}>
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
