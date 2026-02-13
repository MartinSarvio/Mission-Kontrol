import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { fetchSessions, fetchStatus, fetchCronJobs, fetchConfig, getGatewayToken, ApiSession, CronJobApi } from './openclaw'

export type PollingSpeed = 'fast' | 'normal' | 'slow'

interface LiveData {
  isConnected: boolean
  isLoading: boolean
  lastUpdated: Date | null
  sessions: ApiSession[]
  statusText: string | null
  cronJobs: CronJobApi[]
  gatewayConfig: Record<string, any> | null
  pollingSpeed: PollingSpeed
  refresh: () => Promise<void>
}

const LiveDataContext = createContext<LiveData>({
  isConnected: false,
  isLoading: false,
  lastUpdated: null,
  sessions: [],
  statusText: null,
  cronJobs: [],
  gatewayConfig: null,
  pollingSpeed: 'normal',
  refresh: async () => {},
})

export function useLiveData() {
  return useContext(LiveDataContext)
}

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [statusText, setStatusText] = useState<string | null>(null)
  const [cronJobs, setCronJobs] = useState<CronJobApi[]>([])
  const [gatewayConfig, setGatewayConfig] = useState<Record<string, any> | null>(null)
  const [pollingSpeed, setPollingSpeed] = useState<PollingSpeed>('normal')
  const [currentInterval, setCurrentInterval] = useState(3000)

  const refresh = useCallback(async () => {
    const token = getGatewayToken()
    if (!token) {
      setIsConnected(false)
      return
    }

    setIsLoading(true)
    try {
      const [sessionsData, statusData, cronData, configData] = await Promise.all([
        fetchSessions().catch(() => null),
        fetchStatus().catch(() => null),
        fetchCronJobs().catch(() => null),
        fetchConfig().catch(() => null),
      ])

      const anySuccess = sessionsData || statusData || cronData !== null || configData
      if (anySuccess) {
        setIsConnected(true)
        setLastUpdated(new Date())
        if (sessionsData) setSessions(sessionsData.sessions)
        if (statusData) setStatusText(statusData)
        if (cronData) setCronJobs(cronData)
        if (configData) setGatewayConfig(configData)
        
        // Smart polling: Beregn næste interval baseret på aktivitet
        const now = Date.now()
        const hasRecentActivity = sessionsData?.sessions.some(s => 
          (now - s.updatedAt) < 30000 // opdateret inden for 30 sekunder
        )
        const hasAnyActivity = sessionsData?.sessions.some(s => 
          (now - s.updatedAt) < 60000 // opdateret inden for 60 sekunder
        )
        
        if (hasRecentActivity) {
          setPollingSpeed('fast')
          setCurrentInterval(1000) // 1 sekund
        } else if (hasAnyActivity) {
          setPollingSpeed('normal')
          setCurrentInterval(3000) // 3 sekunder
        } else {
          setPollingSpeed('slow')
          setCurrentInterval(5000) // 5 sekunder
        }
      } else {
        setIsConnected(false)
      }
    } catch {
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, currentInterval)
    return () => clearInterval(id)
  }, [refresh, currentInterval])

  // Listen for storage changes (when settings are updated)
  useEffect(() => {
    const handler = () => { refresh() }
    window.addEventListener('openclaw-settings-changed', handler)
    return () => window.removeEventListener('openclaw-settings-changed', handler)
  }, [refresh])

  return (
    <LiveDataContext.Provider value={{ isConnected, isLoading, lastUpdated, sessions, statusText, cronJobs, gatewayConfig, pollingSpeed, refresh }}>
      {children}
    </LiveDataContext.Provider>
  )
}
