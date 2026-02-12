import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { fetchSessions, fetchStatus, fetchCronJobs, fetchConfig, getGatewayToken, ApiSession, CronJobApi } from './openclaw'

interface LiveData {
  isConnected: boolean
  isLoading: boolean
  lastUpdated: Date | null
  sessions: ApiSession[]
  statusText: string | null
  cronJobs: CronJobApi[]
  gatewayConfig: Record<string, any> | null
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
  refresh: async () => {},
})

export function useLiveData() {
  return useContext(LiveDataContext)
}

export function LiveDataProvider({ children, pollInterval = 10000 }: { children: ReactNode; pollInterval?: number }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [statusText, setStatusText] = useState<string | null>(null)
  const [cronJobs, setCronJobs] = useState<CronJobApi[]>([])
  const [gatewayConfig, setGatewayConfig] = useState<Record<string, any> | null>(null)

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
    const id = setInterval(refresh, pollInterval)
    return () => clearInterval(id)
  }, [refresh, pollInterval])

  // Listen for storage changes (when settings are updated)
  useEffect(() => {
    const handler = () => { refresh() }
    window.addEventListener('openclaw-settings-changed', handler)
    return () => window.removeEventListener('openclaw-settings-changed', handler)
  }, [refresh])

  return (
    <LiveDataContext.Provider value={{ isConnected, isLoading, lastUpdated, sessions, statusText, cronJobs, gatewayConfig, refresh }}>
      {children}
    </LiveDataContext.Provider>
  )
}
