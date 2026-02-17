import { useState } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { useLiveData } from '../api/LiveDataContext'
import { fetchCronRuns } from '../api/openclaw'
import { useToast } from '../components/Toast'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatRelativeTime } from '../hooks/useRelativeTime'
import DataFreshness from '../components/DataFreshness'
import { SkeletonRow, shimmerStyle } from '../components/SkeletonLoader'

interface CronRun {
  timestamp: string
  status: string
  duration?: number
  error?: string
}

export default function CronJobs() {
  usePageTitle('Planlagte Jobs')
  
  const { isConnected, cronJobs, isLoading } = useLiveData()
  const { showToast } = useToast()
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [runs, setRuns] = useState<CronRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)

  async function viewJobRuns(jobId: string) {
    try {
      setSelectedJobId(jobId)
      setLoadingRuns(true)
      try {
        const runsData = await fetchCronRuns(jobId)
        setRuns(runsData || [])
      } catch (err) {
        console.error('Failed to load cron runs:', err)
        setRuns([])
      } finally {
        setLoadingRuns(false)
      }
    } catch (err) {
      console.error('Failed to view job runs:', err)
      setRuns([])
      setLoadingRuns(false)
    }
  }
  
  function formatSchedule(schedule: any): string {
    if (!schedule) return 'Ukendt'
    if (typeof schedule === 'string') return schedule
    if (typeof schedule === 'object') {
      return schedule.expr || schedule.kind || JSON.stringify(schedule)
    }
    return String(schedule)
  }

  const jobs = Array.isArray(cronJobs) ? cronJobs : []
  const selectedJob = jobs.find(j => j.id === selectedJobId)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold">Planlagte Jobs</h1>
        {!isConnected && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-orange-400" 
            style={{ background: 'rgba(255,149,0,0.1)' }}>
            Offline
          </span>
        )}
        <DataFreshness className="ml-auto" />
      </div>
      <p className="caption mb-6">
        {isLoading ? 'Indlæser...' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`}
        {isConnected && <span className="text-green-400 ml-1">(live)</span>}
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <button 
          onClick={() => showToast('info', 'Denne funktion kommer snart')}
          style={{ minHeight: '44px', background: '#007AFF', color: '#fff', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
        >
          Opret Job
        </button>
        <button 
          onClick={() => showToast('info', 'Denne funktion kommer snart')}
          style={{ minHeight: '44px', background: 'rgba(0,122,255,0.1)', color: '#007AFF', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(0,122,255,0.2)', cursor: 'pointer' }}
        >
          Alarmregler
        </button>
      </div>

      {isLoading ? (
        <Card>
          <style>{shimmerStyle}</style>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
          </div>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <div className="text-center py-16 px-4">
            <Icon name="clock" size={40} className="text-white/30 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Ingen planlagte jobs endnu
            </p>
            <p className="caption max-w-md mx-auto">
              Planlagte jobs giver dig mulighed for at automatisere gentagne opgaver som rapporter, sundhedstjek, backups og mere.
              Klik "Opret Job" for at komme i gang.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <Card key={job.id || i}>
              <div 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                onClick={() => viewJobRuns(job.id)}
              >
                <div className="flex items-center gap-4">
                  <StatusBadge status={job.enabled !== false ? 'active' : 'paused'} />
                  <div>
                    <p className="text-sm font-medium">{job.name || job.id}</p>
                    <p className="caption font-mono">{formatSchedule(job.schedule)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                  {job.lastRun && (
                    <div className="text-left sm:text-right">
                      <p className="font-medium">{formatRelativeTime(job.lastRun)}</p>
                      <p className="caption">sidst kørt</p>
                    </div>
                  )}
                  {job.nextRun && (
                    <div className="text-left sm:text-right">
                      <p className="font-medium">{formatRelativeTime(job.nextRun)}</p>
                      <p className="caption">næste kørsel</p>
                    </div>
                  )}
                  <span 
                    className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{
                      background: job.enabled !== false ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.06)',
                      color: job.enabled !== false ? '#34C759' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {job.enabled !== false ? 'Aktiv' : 'Deaktiveret'}
                  </span>
                  <Icon name="chevron-right" size={16} className="text-white/30" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal 
        open={!!selectedJob} 
        onClose={() => { setSelectedJobId(null); setRuns([]) }}
        title={selectedJob?.name || selectedJob?.id || ''}
      >
        {selectedJob && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="caption">Schedule</p>
                <p className="font-mono text-xs">{formatSchedule(selectedJob.schedule)}</p>
              </div>
              <div>
                <p className="caption">Status</p>
                <span 
                  className="text-xs font-medium px-2.5 py-1 rounded-full inline-block"
                  style={{
                    background: selectedJob.enabled !== false ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.06)',
                    color: selectedJob.enabled !== false ? '#34C759' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {selectedJob.enabled !== false ? 'Aktiv' : 'Deaktiveret'}
                </span>
              </div>
              {selectedJob.lastRun && (
                <div>
                  <p className="caption">Sidst kørt</p>
                  <p className="font-medium">{formatRelativeTime(selectedJob.lastRun)}</p>
                </div>
              )}
              {selectedJob.nextRun && (
                <div>
                  <p className="caption">Næste kørsel</p>
                  <p className="font-medium">{formatRelativeTime(selectedJob.nextRun)}</p>
                </div>
              )}
              {selectedJob.command && (
                <div className="sm:col-span-2">
                  <p className="caption">Kommando</p>
                  <p className="font-mono text-xs px-2 py-1 rounded-lg break-all" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {selectedJob.command}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="caption mb-2">Kørselhistorik</p>
              {loadingRuns ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin text-white/30">
                    <Icon name="arrow-path" size={20} />
                  </div>
                  <p className="caption mt-2">Indlæser historik...</p>
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <Icon name="clock" size={24} className="text-white/20 mx-auto mb-2" />
                  <p className="caption">Ingen kørsler registreret endnu</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {runs.map((run, i) => (
                    <div 
                      key={i}
                      className="p-3 rounded-lg"
                      style={{ 
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {run.timestamp}
                        </span>
                        <span 
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: run.status === 'success' 
                              ? 'rgba(52,199,89,0.1)' 
                              : 'rgba(255,69,58,0.1)',
                            color: run.status === 'success' ? '#34C759' : '#FF453A',
                          }}
                        >
                          {run.status}
                        </span>
                      </div>
                      {run.duration && (
                        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Varighed: {run.duration}ms
                        </p>
                      )}
                      {run.error && (
                        <p className="text-xs mt-1 text-red-400">{run.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
