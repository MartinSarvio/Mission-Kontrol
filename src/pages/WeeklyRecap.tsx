import { useMemo } from 'react'
import Card from '../components/Card'
import { useLiveData } from '../api/LiveDataContext'

export default function WeeklyRecap() {
  const { sessions, cronJobs, isLoading } = useLiveData()

  // Beregn metrics fra live data
  const metrics = useMemo(() => {
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    // Sessions sidst 7 dage
    const recentSessions = sessions.filter(s => {
      const updated = new Date(s.updatedAt).getTime()
      return updated >= sevenDaysAgo
    })

    // Cron jobs
    const activeCronJobs = cronJobs.filter(j => j.enabled).length
    const totalCronJobs = cronJobs.length

    // Seneste aktivitet
    const latestSession = sessions.length > 0 
      ? sessions.reduce((latest, s) => 
          new Date(s.updatedAt) > new Date(latest.updatedAt) ? s : latest
        )
      : null

    const lastActivity = latestSession 
      ? new Date(latestSession.updatedAt).toLocaleString('da-DK', { 
          day: 'numeric', 
          month: 'short', 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      : 'Ingen aktivitet'

    // Token forbrug (rough cost estimate)
    const totalTokens = recentSessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0)
    const estimatedCost = (totalTokens * 10) / 1_000_000 // $10 avg per M tokens

    // Session status
    const activeCount = recentSessions.filter(s => new Date(s.updatedAt).getTime() > Date.now() - 300000).length
    const completedCount = recentSessions.filter(s => new Date(s.updatedAt).getTime() <= Date.now() - 300000).length
    const errorCount = recentSessions.filter(s => false).length

    return {
      recentSessions: recentSessions.length,
      activeSessions: activeCount,
      completedSessions: completedCount,
      errorSessions: errorCount,
      activeCronJobs,
      totalCronJobs,
      lastActivity,
      estimatedCost,
      totalTokens
    }
  }, [sessions, cronJobs])

  // Ugentlig dato range
  const weekRange = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const start = sevenDaysAgo.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })
    const end = now.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${start} – ${end}`
  }, [])

  if (isLoading) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Ugerapport</h1>
        <p className="caption mb-6">Indlæser...</p>
        <Card>
          <p className="text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Indlæser data...</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Ugerapport</h1>
      <p className="caption mb-6">{weekRange}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Fuldført', value: metrics.completedSessions.toString(), color: 'text-[#34C759]' },
          { label: 'Aktive', value: metrics.activeSessions.toString(), color: 'text-apple-blue' },
          { label: 'Fejl', value: metrics.errorSessions.toString(), color: 'text-[#FF3B30]' },
          { label: 'Est. Omkostning', value: `$${metrics.estimatedCost.toFixed(2)}`, color: 'text-white' },
        ].map((s, i) => (
          <Card key={i}>
            <p className="caption">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card title="Aktivitetsoversigt">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 glass-row">
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Sessions Sidst 7 Dage</span>
              <span className="font-bold text-apple-blue">{metrics.recentSessions}</span>
            </div>
            <div className="flex items-center justify-between py-2 glass-row">
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Cron Jobs</span>
              <span className="font-bold">{metrics.activeCronJobs} / {metrics.totalCronJobs}</span>
            </div>
            <div className="flex items-center justify-between py-2 glass-row">
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Seneste Aktivitet</span>
              <span className="font-bold text-sm">{metrics.lastActivity}</span>
            </div>
            <div className="flex items-center justify-between py-2 glass-row">
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Total Tokens</span>
              <span className="font-bold">{(metrics.totalTokens / 1000).toFixed(0)}K</span>
            </div>
          </div>
        </Card>

        <Card title="Planlagte Jobs">
          {cronJobs.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Ingen planlagte jobs</p>
          ) : (
            <div className="space-y-2">
              {cronJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between py-2 glass-row text-sm">
                  <div>
                    <p className="font-medium">{job.name}</p>
                    <p className="caption">{job.schedule}</p>
                  </div>
                  <span 
                    className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap" 
                    style={{ 
                      background: job.enabled ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.06)', 
                      color: job.enabled ? '#34C759' : 'rgba(255,255,255,0.4)' 
                    }}
                  >
                    {job.enabled ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Seneste Sessions">
        {sessions.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Ingen sessions</p>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 8).map((s) => (
              <div key={s.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 glass-row">
                <div>
                  <p className="text-sm font-medium font-mono break-all">{s.key}</p>
                  <p className="caption">
                    {s.label || 'Ingen label'} · {new Date(s.updatedAt).toLocaleString('da-DK', { 
                      day: 'numeric', 
                      month: 'short', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {s.totalTokens ? `${(s.totalTokens / 1000).toFixed(1)}K` : 'N/A'}
                  </span>
                  <span 
                    className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap" 
                    style={{ 
                      background: new Date(s.updatedAt).getTime() > Date.now() - 300000 ? 'rgba(52,199,89,0.1)' : 
                                 false ? 'rgba(255,59,48,0.1)' : 
                                 'rgba(255,255,255,0.06)', 
                      color: new Date(s.updatedAt).getTime() > Date.now() - 300000 ? '#34C759' : 
                             false ? '#FF3B30' : 
                             'rgba(255,255,255,0.4)' 
                    }}
                  >
                    {'Live'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Notater" className="mt-4">
        <div className="text-sm space-y-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <p>• Live data vises fra Gateway API</p>
          <p>• Tokens og omkostninger er estimater baseret på session data</p>
          <p>• Sessions grupperes efter opdateringstidspunkt (sidst 7 dage)</p>
          {metrics.recentSessions === 0 && (
            <p className="text-[#FF9500]">• Ingen aktivitet registreret i den seneste uge</p>
          )}
        </div>
      </Card>
    </div>
  )
}
