import { useMemo } from 'react'
import Card from '../components/Card'
import { BarChart, MiniLineChart } from '../components/Chart'
import { useLiveData } from '../api/LiveDataContext'

export default function ApiUsage() {
  const { sessions, statusText, gatewayConfig, isLoading } = useLiveData()

  // Parse token info fra statusText (session_status output)
  const tokenInfo = useMemo(() => {
    if (!statusText) return { totalTokens: 0, contextTokens: 0, costEstimate: 0 }
    
    // Parse "Tokens: X context, Y total" format
    const tokenMatch = statusText.match(/Tokens:\s*(\d+)\s*context,\s*(\d+)\s*total/i)
    const contextTokens = tokenMatch ? parseInt(tokenMatch[1]) : 0
    const totalTokens = tokenMatch ? parseInt(tokenMatch[2]) : 0
    
    // Rough cost estimate: $3/M input, $15/M output for Opus
    const costEstimate = (contextTokens * 3 + (totalTokens - contextTokens) * 15) / 1_000_000
    
    return { totalTokens, contextTokens, costEstimate }
  }, [statusText])

  // Beregn metrics fra sessions
  const sessionMetrics = useMemo(() => {
    if (!sessions.length) return { 
      totalSessions: 0, 
      activeSessions: 0, 
      totalMessages: 0,
      sessionTokens: [] as number[],
      recentActivity: [] as { label: string; value: number }[]
    }

    const nowTs = Date.now()
    const activeSessions = sessions.filter(s => nowTs - new Date(s.updatedAt).getTime() < 300000).length
    const totalMessages = sessions.length
    const sessionTokens = sessions.map(s => s.totalTokens || 0).slice(0, 10)

    // Aggreger aktivitet per dag (sidst 7 dage)
    const dayMap = new Map<string, number>()
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    sessions.forEach(s => {
      const updated = new Date(s.updatedAt).getTime()
      if (updated >= sevenDaysAgo) {
        const day = new Date(s.updatedAt).toLocaleDateString('da-DK', { month: 'short', day: 'numeric' })
        dayMap.set(day, (dayMap.get(day) || 0) + 1)
      }
    })

    const recentActivity = Array.from(dayMap.entries())
      .map(([label, value]) => ({ label, value, color: '#007AFF' }))
      .slice(-7)

    return { 
      totalSessions: sessions.length, 
      activeSessions, 
      totalMessages,
      sessionTokens,
      recentActivity
    }
  }, [sessions])

  // Model fallbacks fra gateway config eller hardcoded
  const models = useMemo(() => {
    const configModels = gatewayConfig?.models || []
    if (configModels.length > 0) {
      return configModels.map((m: string, i: number) => ({
        model: m,
        role: i === 0 ? 'Primær model' : `Fallback ${i}`,
        status: i === 0 ? 'Aktiv' : 'Klar'
      }))
    }
    // Fallback til kendte modeller
    return [
      { model: 'claude-opus-4-6', role: 'Primær model', status: 'Aktiv' },
      { model: 'claude-sonnet-4-5', role: 'Fallback 1', status: 'Klar' },
      { model: 'claude-opus-4-5', role: 'Fallback 2', status: 'Klar' },
      { model: 'claude-opus-4-1', role: 'Fallback 3', status: 'Klar' },
      { model: 'claude-haiku-4-5', role: 'Fallback 4', status: 'Klar' },
    ]
  }, [gatewayConfig])

  if (isLoading) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">API Forbrug</h1>
        <p className="caption mb-6">Tokenforbrug og omkostningssporing</p>
        <Card>
          <p className="text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Indlæser data...</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">API Forbrug</h1>
      <p className="caption mb-6">Tokenforbrug og omkostningssporing</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { 
            label: 'Samlet Tokens', 
            value: tokenInfo.totalTokens > 0 ? `${(tokenInfo.totalTokens / 1000).toFixed(0)}K` : '0', 
            trend: sessionMetrics.sessionTokens.slice(0, 7)
          },
          { 
            label: 'Aktive Sessions', 
            value: sessionMetrics.activeSessions.toString(), 
            trend: [sessionMetrics.activeSessions, sessionMetrics.activeSessions, sessionMetrics.activeSessions] 
          },
          { 
            label: 'Est. Omkostning', 
            value: `$${tokenInfo.costEstimate.toFixed(2)}`, 
            trend: [tokenInfo.costEstimate * 0.7, tokenInfo.costEstimate * 0.9, tokenInfo.costEstimate] 
          },
          { 
            label: 'Total Sessions', 
            value: sessionMetrics.totalSessions.toString(), 
            trend: [sessionMetrics.totalSessions * 0.6, sessionMetrics.totalSessions * 0.8, sessionMetrics.totalSessions] 
          },
        ].map((s, i) => (
          <Card key={i}>
            <p className="caption">{s.label}</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-2xl font-bold">{s.value}</p>
              {s.trend.length > 0 && <MiniLineChart data={s.trend} color="#007AFF" />}
            </div>
          </Card>
        ))}
      </div>

      {sessionMetrics.recentActivity.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card title="Sessions Sidst 7 Dage">
            <BarChart data={sessionMetrics.recentActivity} height={200} />
          </Card>
          <Card title="Token Distribution">
            <BarChart 
              data={sessionMetrics.sessionTokens.map((t, i) => ({ 
                label: `S${i + 1}`, 
                value: t, 
                color: '#34C759' 
              }))} 
              height={200} 
            />
          </Card>
        </div>
      )}

      <Card title="Modeller i Brug">
        <div className="space-y-3">
          {models.map((m: any, i: number) => (
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

      <Card title="Live Session Oversigt" className="mt-4">
        {sessions.length === 0 ? (
          <p className="text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Ingen aktive sessions</p>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 10).map((s) => (
              <div key={s.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 glass-row text-sm">
                <div>
                  <p className="font-medium font-mono break-all">{s.key}</p>
                  <p className="caption">{s.label || 'Ingen label'} · {s.contextTokens ? Math.round((s.contextTokens || 0) / 1000) : 0} beskeder</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {s.totalTokens ? `${(s.totalTokens / 1000).toFixed(1)}K tokens` : 'N/A'}
                  </span>
                  <span 
                    className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap" 
                    style={{ 
                      background: new Date(s.updatedAt).getTime() > Date.now() - 300000 ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.06)', 
                      color: new Date(s.updatedAt).getTime() > Date.now() - 300000 ? '#34C759' : 'rgba(255,255,255,0.4)' 
                    }}
                  >
                    {"Live"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
