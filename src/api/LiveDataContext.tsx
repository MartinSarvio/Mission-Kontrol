import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
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

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [statusText, setStatusText] = useState<string | null>(null)
  const [cronJobs, setCronJobs] = useState<CronJobApi[]>([])
  const [gatewayConfig, setGatewayConfig] = useState<Record<string, any> | null>(null)
  
  // Track previous data hash to only update when data actually changes
  const prevSessionsHash = useRef<string>('')
  const prevStatusHash = useRef<string>('')
  const prevCronHash = useRef<string>('')
  const prevConfigHash = useRef<string>('')
  
  // Track if this is first load (show loading only on first load)
  const isFirstLoad = useRef(true)

  const refresh = useCallback(async () => {
    const token = getGatewayToken()
    if (!token) {
      setIsConnected(false)
      return
    }

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
        
        // Only update state if data has actually changed (using hash)
        if (sessionsData) {
          const newHash = JSON.stringify(sessionsData.sessions.map(s => ({
            key: s.key,
            updated: s.updatedAt,
            ctx: s.contextTokens,
            total: s.totalTokens
          })))
          if (newHash !== prevSessionsHash.current) {
            prevSessionsHash.current = newHash
            setSessions(sessionsData.sessions)
          }
        }
        
        if (statusData) {
          const newHash = String(statusData)
          if (newHash !== prevStatusHash.current) {
            prevStatusHash.current = newHash
            setStatusText(statusData)
          }
        }
        
        if (cronData) {
          const newHash = JSON.stringify(cronData.map(c => ({ id: c.id, enabled: c.enabled, lastRun: c.lastRun })))
          if (newHash !== prevCronHash.current) {
            prevCronHash.current = newHash
            setCronJobs(cronData)
          }
        }
        
        if (configData) {
          const newHash = JSON.stringify(configData)
          if (newHash !== prevConfigHash.current) {
            prevConfigHash.current = newHash
            setGatewayConfig(configData)
          }
        }
        
        // After first successful load, never show loading again
        isFirstLoad.current = false
      } else {
        setIsConnected(false)
      }
    } catch {
      setIsConnected(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    // Fixed 5-second interval - no adaptive polling
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  // Listen for storage changes (when settings are updated)
  useEffect(() => {
    const handler = () => { refresh() }
    window.addEventListener('openclaw-settings-changed', handler)
    return () => window.removeEventListener('openclaw-settings-changed', handler)
  }, [refresh])

  return (
    <LiveDataContext.Provider value={{ 
      isConnected,
      isLoading,
      lastUpdated, 
      sessions, 
      statusText, 
      cronJobs, 
      gatewayConfig, 
      refresh 
    }}>
      {children}
    </LiveDataContext.Provider>
  )
}
