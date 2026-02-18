import { useState, useCallback, useMemo, useEffect } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import Table, { Column } from '../components/Table'
import StatusBadge from '../components/StatusBadge'
import { useLiveData } from '../api/LiveDataContext'
import { fetchCronRuns, invokeToolRaw } from '../api/openclaw'
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

interface CronJobRow {
  id: string
  name: string
  enabled: boolean
  schedule: unknown
  lastRun?: string
  nextRun?: string
  [key: string]: unknown
}

/** Beregn næste kørsel fra schedule-feltet hvis API ikke angiver nextRun */
function calcNextRun(job: { schedule?: any; lastRun?: string; nextRun?: string }): string | null {
  if (job.nextRun) return job.nextRun

  const s = job.schedule
  if (!s) return null

  if (typeof s === 'object' && s.everyMs) {
    const base = job.lastRun ? new Date(job.lastRun).getTime() : Date.now()
    return new Date(base + (s.everyMs as number)).toISOString()
  }

  const expr: string | undefined = typeof s === 'string' ? s : s.expr
  if (expr) {
    const parts = expr.trim().split(/\s+/)
    if (parts.length >= 5) {
      const now = new Date()
      const minutePart = parts[0]
      const hourPart = parts[1]

      const everyMinMatch = minutePart.match(/^\*\/(\d+)$/)
      if (everyMinMatch && hourPart === '*') {
        const n = parseInt(everyMinMatch[1], 10)
        const nowMs = now.getTime()
        const nextMs = nowMs + (n - (now.getMinutes() % n)) * 60_000 - now.getSeconds() * 1000
        return new Date(nextMs).toISOString()
      }

      const fixedMin = minutePart === '*' ? null : parseInt(minutePart, 10)
      if (!isNaN(fixedMin as number) && hourPart === '*') {
        const next = new Date(now)
        next.setSeconds(0, 0)
        next.setMinutes((fixedMin as number))
        if (next <= now) next.setHours(next.getHours() + 1)
        return next.toISOString()
      }
    }
  }

  return null
}

function formatSchedule(schedule: unknown): string {
  if (!schedule) return 'Ukendt'
  if (typeof schedule === 'string') return schedule
  if (typeof schedule === 'object' && schedule !== null) {
    const s = schedule as Record<string, unknown>
    if (s.everyMs) {
      const ms = s.everyMs as number
      if (ms < 60_000) return `Hvert ${ms / 1000}s`
      if (ms < 3_600_000) return `Hvert ${ms / 60_000} min`
      if (ms < 86_400_000) return `Hver ${ms / 3_600_000} time`
      return `Hver ${ms / 86_400_000} dag`
    }
    return (s.expr as string) || (s.kind as string) || JSON.stringify(s)
  }
  return String(schedule)
}

/* ── History Side Panel ─────────────────────── */
function JobHistoryPanel({
  job,
  runs,
  loadingRuns,
  onClose,
  onRunNow,
  onToggle,
  isRunning,
  isToggling,
}: {
  job: CronJobRow
  runs: CronRun[]
  loadingRuns: boolean
  onClose: () => void
  onRunNow: () => void
  onToggle: () => void
  isRunning: boolean
  isToggling: boolean
}) {
  const isEnabled = job.enabled !== false
  const nextRun = calcNextRun(job)

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] z-50 flex flex-col overflow-y-auto"
        style={{ background: 'rgba(10,10,15,0.98)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isEnabled ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.06)' }}
              >
                <Icon name="clock" size={18} style={{ color: isEnabled ? '#34C759' : 'rgba(255,255,255,0.3)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white truncate">{job.name || job.id}</h2>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {formatSchedule(job.schedule)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <Icon name="xmark" size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {job.lastRun && (
              <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Sidst kørt</p>
                <p className="text-xs text-white">{formatRelativeTime(job.lastRun)}</p>
              </div>
            )}
            {nextRun && (
              <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Næste kørsel</p>
                <p className="text-xs" style={{ color: '#34C759' }}>{formatRelativeTime(nextRun)}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onRunNow}
              disabled={isRunning}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid rgba(52,199,89,0.3)',
                background: isRunning ? 'rgba(52,199,89,0.05)' : 'rgba(52,199,89,0.1)',
                color: '#34C759',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                opacity: isRunning ? 0.6 : 1,
              }}
            >
              <Icon name={isRunning ? 'arrow-path' : 'play'} size={14} className={isRunning ? 'animate-spin' : ''} />
              Kør nu
            </button>
            <button
              onClick={onToggle}
              disabled={isToggling}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                border: `1px solid ${isEnabled ? 'rgba(255,255,255,0.12)' : 'rgba(0,122,255,0.3)'}`,
                background: isEnabled ? 'rgba(255,255,255,0.06)' : 'rgba(0,122,255,0.1)',
                color: isEnabled ? 'rgba(255,255,255,0.5)' : '#007AFF',
                cursor: isToggling ? 'not-allowed' : 'pointer',
                opacity: isToggling ? 0.6 : 1,
              }}
            >
              {isToggling
                ? <Icon name="arrow-path" size={14} className="animate-spin" />
                : <Icon name={isEnabled ? 'pause' : 'play'} size={14} />
              }
              {isEnabled ? 'Deaktiver' : 'Aktiver'}
            </button>
          </div>
        </div>

        {/* History */}
        <div className="flex-1 p-6">
          <p className="caption mb-3" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="clock" size={12} />
            Seneste 5 kørsler
          </p>

          {loadingRuns ? (
            <div className="text-center py-10">
              <Icon name="arrow-path" size={20} className="text-white/30 animate-spin mx-auto" />
              <p className="caption mt-2">Indlæser historik...</p>
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Icon name="clock" size={20} className="text-white/20 mx-auto mb-2" />
              <p className="caption">Ingen kørsler registreret endnu</p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run, ri) => (
                <div
                  key={ri}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <Icon
                      name={run.status === 'success' ? 'check-circle' : 'exclamation-triangle'}
                      size={14}
                      style={{ color: run.status === 'success' ? '#34C759' : '#FF453A', flexShrink: 0 }}
                    />
                    <span className="font-mono text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {run.timestamp ? formatRelativeTime(run.timestamp) : '—'}
                    </span>
                    {run.error && (
                      <span className="text-xs truncate" style={{ color: '#FF453A' }}>{run.error}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {run.duration != null && (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{run.duration}ms</span>
                    )}
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: run.status === 'success' ? 'rgba(52,199,89,0.1)' : 'rgba(255,69,58,0.1)',
                        color: run.status === 'success' ? '#34C759' : '#FF453A',
                      }}
                    >
                      {run.status === 'success' ? 'OK' : run.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function CronJobs() {
  usePageTitle('Planlagte Jobs')

  const { isConnected, cronJobs, isLoading, refresh } = useLiveData()
  const { showToast } = useToast()

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [runs, setRuns] = useState<Record<string, CronRun[]>>({})
  const [loadingRuns, setLoadingRuns] = useState<Record<string, boolean>>({})
  const [runningJobs, setRunningJobs] = useState<Record<string, boolean>>({})
  const [togglingJobs, setTogglingJobs] = useState<Record<string, boolean>>({})

  // Auto-refresh hvert 10. sekund — kun når siden er synlig
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) {
        refresh()
      }
    }, 10_000)
    return () => clearInterval(id)
  }, [refresh])

  const rawJobs = Array.isArray(cronJobs) ? cronJobs : []
  const jobs: CronJobRow[] = useMemo(() =>
    rawJobs.map((j: any) => ({
      ...j,
      id: String(j.id ?? j.jobId ?? j.name ?? Math.random()),
      name: j.name || j.id || 'Unavngiven',
      enabled: j.enabled !== false,
    })),
    [rawJobs]
  )

  const selectedJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) ?? null : null

  const openHistory = useCallback(async (jobId: string) => {
    setSelectedJobId(jobId)
    if (!runs[jobId]) {
      setLoadingRuns(prev => ({ ...prev, [jobId]: true }))
      try {
        const data = await fetchCronRuns(jobId)
        setRuns(prev => ({ ...prev, [jobId]: (data || []).slice(0, 5) }))
      } catch {
        setRuns(prev => ({ ...prev, [jobId]: [] }))
      } finally {
        setLoadingRuns(prev => ({ ...prev, [jobId]: false }))
      }
    }
  }, [runs])

  const runJobNow = useCallback(async (jobId: string) => {
    if (runningJobs[jobId]) return
    setRunningJobs(prev => ({ ...prev, [jobId]: true }))
    try {
      await invokeToolRaw('cron', { action: 'run', jobId })
      showToast('success', 'Job startet')
      setRuns(prev => ({ ...prev, [jobId]: [] }))
      setTimeout(() => {
        fetchCronRuns(jobId)
          .then(data => setRuns(prev => ({ ...prev, [jobId]: (data || []).slice(0, 5) })))
          .catch(() => {})
        refresh()
      }, 1500)
    } catch (err: any) {
      showToast('error', `Kunne ikke starte job: ${err?.message || 'Ukendt fejl'}`)
    } finally {
      setRunningJobs(prev => ({ ...prev, [jobId]: false }))
    }
  }, [runningJobs, showToast, refresh])

  const toggleEnabled = useCallback(async (jobId: string, currentEnabled: boolean) => {
    if (togglingJobs[jobId]) return
    setTogglingJobs(prev => ({ ...prev, [jobId]: true }))
    try {
      await invokeToolRaw('cron', { action: 'update', jobId, enabled: !currentEnabled })
      showToast('success', currentEnabled ? 'Job deaktiveret' : 'Job aktiveret')
      refresh()
    } catch (err: any) {
      showToast('error', `Kunne ikke opdatere job: ${err?.message || 'Ukendt fejl'}`)
    } finally {
      setTogglingJobs(prev => ({ ...prev, [jobId]: false }))
    }
  }, [togglingJobs, showToast, refresh])

  const columns: Column<CronJobRow>[] = useMemo(() => [
    {
      key: 'status',
      header: 'Status',
      exportValue: (job) => job.enabled !== false ? 'Aktiv' : 'Inaktiv',
      render: (job) => (
        <StatusBadge status={job.enabled !== false ? 'active' : 'paused'} />
      ),
    },
    {
      key: 'name',
      header: 'Navn',
      sortable: true,
      sortKey: (job) => job.name,
      exportValue: (job) => job.name,
      render: (job) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{job.name}</p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Interval',
      exportValue: (job) => formatSchedule(job.schedule),
      render: (job) => (
        <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {formatSchedule(job.schedule)}
        </span>
      ),
    },
    {
      key: 'lastRun',
      header: 'Sidst kørt',
      sortable: true,
      sortKey: (job) => job.lastRun ? new Date(job.lastRun) : null,
      exportValue: (job) => job.lastRun ? formatRelativeTime(job.lastRun) : '',
      render: (job) => (
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {job.lastRun ? formatRelativeTime(job.lastRun) : '—'}
        </span>
      ),
    },
    {
      key: 'nextRun',
      header: 'Næste kørsel',
      sortable: true,
      sortKey: (job) => {
        const nr = calcNextRun(job)
        return nr ? new Date(nr) : null
      },
      exportValue: (job) => {
        const nr = calcNextRun(job)
        return nr ? formatRelativeTime(nr) : ''
      },
      render: (job) => {
        const nextRun = calcNextRun(job)
        return (
          <span className="text-xs" style={{ color: nextRun ? '#34C759' : 'rgba(255,255,255,0.3)' }}>
            {nextRun ? formatRelativeTime(nextRun) : '—'}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Handlinger',
      render: (job) => {
        const isRunning = !!runningJobs[job.id]
        const isToggling = !!togglingJobs[job.id]
        const isEnabled = job.enabled !== false
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
            {/* Kør nu */}
            <button
              type="button"
              onClick={() => runJobNow(job.id)}
              disabled={isRunning}
              title="Kør nu"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                height: '32px',
                padding: '0 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                border: '1px solid rgba(52,199,89,0.3)',
                background: isRunning ? 'rgba(52,199,89,0.05)' : 'rgba(52,199,89,0.1)',
                color: '#34C759',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                opacity: isRunning ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <Icon name={isRunning ? 'arrow-path' : 'play'} size={12} className={isRunning ? 'animate-spin' : ''} />
              Kør nu
            </button>
            {/* Enable/Disable */}
            <button
              type="button"
              onClick={() => toggleEnabled(job.id, isEnabled)}
              disabled={isToggling}
              title={isEnabled ? 'Deaktiver' : 'Aktiver'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                height: '32px',
                padding: '0 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                border: `1px solid ${isEnabled ? 'rgba(255,255,255,0.12)' : 'rgba(0,122,255,0.3)'}`,
                background: isEnabled ? 'rgba(255,255,255,0.06)' : 'rgba(0,122,255,0.1)',
                color: isEnabled ? 'rgba(255,255,255,0.5)' : '#007AFF',
                cursor: isToggling ? 'not-allowed' : 'pointer',
                opacity: isToggling ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {isToggling
                ? <Icon name="arrow-path" size={12} className="animate-spin" />
                : <Icon name={isEnabled ? 'pause' : 'play'} size={12} />
              }
              {isEnabled ? 'Deaktiver' : 'Aktiver'}
            </button>
            {/* Historik */}
            <button
              type="button"
              onClick={() => openHistory(job.id)}
              title="Seneste kørsler"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
              }}
            >
              <Icon name="clock" size={14} />
            </button>
          </div>
        )
      },
    },
  ], [runningJobs, togglingJobs, runJobNow, toggleEnabled, openHistory])

  return (
    <div className="animate-page-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold">Planlagte Jobs</h1>
        {!isConnected && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-orange-400"
            style={{ background: 'rgba(255,149,0,0.1)' }}
          >
            Offline
          </span>
        )}
        <DataFreshness className="ml-auto" />
      </div>
      <p className="caption mb-6">
        {isLoading ? 'Indlæser...' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`}
        {isConnected && <span className="text-green-400 ml-1">(live)</span>}
      </p>

      {/* Handlingsknapper */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => showToast('info', 'Denne funktion kommer snart')}
          style={{
            minHeight: '44px',
            background: '#007AFF',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Opret Job
        </button>
        <button
          onClick={() => showToast('info', 'Denne funktion kommer snart')}
          style={{
            minHeight: '44px',
            background: 'rgba(0,122,255,0.1)',
            color: '#007AFF',
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid rgba(0,122,255,0.2)',
            cursor: 'pointer',
          }}
        >
          Alarmregler
        </button>
      </div>

      {/* Indlæsnings-skeleton */}
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
              Planlagte jobs giver dig mulighed for at automatisere gentagne opgaver som rapporter,
              sundhedstjek, backups og mere. Klik "Opret Job" for at komme i gang.
            </p>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0, animationDelay: '0ms' }}>
          <Table<CronJobRow>
            data={jobs}
            columns={columns}
            searchable={true}
            exportable={true}
            exportFilename="planlagte-jobs"
            pageSize={25}
            onRowClick={(job) => openHistory(job.id)}
          />
        </Card>
      )}

      {/* History side panel */}
      {selectedJob && (
        <JobHistoryPanel
          job={selectedJob}
          runs={runs[selectedJob.id] || []}
          loadingRuns={!!loadingRuns[selectedJob.id]}
          onClose={() => setSelectedJobId(null)}
          onRunNow={() => runJobNow(selectedJob.id)}
          onToggle={() => toggleEnabled(selectedJob.id, selectedJob.enabled !== false)}
          isRunning={!!runningJobs[selectedJob.id]}
          isToggling={!!togglingJobs[selectedJob.id]}
        />
      )}
    </div>
  )
}
