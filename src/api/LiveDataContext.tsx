import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { fetchSessions, fetchStatus, fetchCronJobs, fetchConfig, fetchInstalledSkills, getGatewayToken, ApiSession, CronJobApi, SkillInfo } from './openclaw'

interface LiveData {
  isConnected: boolean
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  lastUpdated: Date | null
  consecutiveErrors: number
  sessions: ApiSession[]
  statusText: string | null
  cronJobs: CronJobApi[]
  gatewayConfig: Record<string, any> | null
  skills: SkillInfo[]
  refresh: () => Promise<void>
}

const LiveDataContext = createContext<LiveData>({
  isConnected: false,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastUpdated: null,
  consecutiveErrors: 0,
  sessions: [],
  statusText: null,
  cronJobs: [],
  gatewayConfig: null,
  skills: [],
  refresh: async () => {},
})

export function useLiveData() {
  return useContext(LiveDataContext)
}

const CACHE_KEY = 'openclaw-live-cache'

function loadCache(): { sessions: ApiSession[], statusText: string | null, cronJobs: CronJobApi[], gatewayConfig: Record<string, any> | null, skills: SkillInfo[] } {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        sessions: parsed.sessions || [],
        statusText: parsed.statusText || null,
        cronJobs: parsed.cronJobs || [],
        gatewayConfig: parsed.gatewayConfig || null,
        skills: parsed.skills || [],
      }
    }
  } catch {}
  return { sessions: [], statusText: null, cronJobs: [], gatewayConfig: null, skills: [] }
}

function saveCache(sessions: ApiSession[], statusText: string | null, cronJobs: CronJobApi[], gatewayConfig: Record<string, any> | null, skills: SkillInfo[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ sessions, statusText, cronJobs, gatewayConfig, skills }))
  } catch {}
}

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const cached = useRef(loadCache())
  const [isConnected, setIsConnected] = useState(cached.current.sessions.length > 0)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [sessions, setSessions] = useState<ApiSession[]>(cached.current.sessions)
  const [statusText, setStatusText] = useState<string | null>(cached.current.statusText)
  const [cronJobs, setCronJobs] = useState<CronJobApi[]>(cached.current.cronJobs)
  const [gatewayConfig, setGatewayConfig] = useState<Record<string, any> | null>(cached.current.gatewayConfig)
  const [skills, setSkills] = useState<SkillInfo[]>(cached.current.skills)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  
  // Track previous data hash to only update when data actually changes
  const prevSessionsHash = useRef<string>('')
  const prevStatusHash = useRef<string>('')
  const prevCronHash = useRef<string>('')
  const prevConfigHash = useRef<string>('')
  const prevSkillsHash = useRef<string>('')
  
  // Track if this is first load (show loading only on first load)
  const isFirstLoad = useRef(true)

  const refresh = useCallback(async () => {
    const token = getGatewayToken()
    if (!token) {
      setIsConnected(false)
      return
    }

    setIsRefreshing(true)
    try {
      const [sessionsData, statusData, cronData, configData, skillsData] = await Promise.all([
        fetchSessions().catch(() => null),
        fetchStatus().catch(() => null),
        fetchCronJobs().catch(() => null),
        fetchConfig().catch(() => null),
        fetchInstalledSkills().catch(() => null),
      ])

      const anySuccess = sessionsData || statusData || cronData !== null || configData || skillsData
      if (anySuccess) {
        setIsConnected(true)
        setError(null)
        setLastUpdated(new Date())
        setConsecutiveErrors(0)
        
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

        if (skillsData) {
          const newHash = JSON.stringify(skillsData.map(s => ({ name: s.name, desc: s.description, loc: s.location })))
          if (newHash !== prevSkillsHash.current) {
            prevSkillsHash.current = newHash
            setSkills(skillsData)
          }
        }
        
        // After first successful load, never show loading again
        isFirstLoad.current = false
        
        // Persist to localStorage so data survives refresh
        saveCache(
          sessionsData ? sessionsData.sessions : sessions,
          statusData || statusText,
          cronData || cronJobs,
          configData || gatewayConfig,
          skillsData || skills
        )
      } else {
        setIsConnected(false)
        setError('Kunne ikke oprette forbindelse til Gateway')
        setConsecutiveErrors(prev => prev + 1)
      }
    } catch {
      setIsConnected(false)
      setError('Kunne ikke oprette forbindelse til Gateway')
      setConsecutiveErrors(prev => prev + 1)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    
    // Poll every 15 seconds (reduced from 5s to save resources)
    const id = setInterval(() => {
      // Only poll if page is visible (Page Visibility API)
      if (!document.hidden) {
        refresh()
      }
    }, 15000)
    
    // Also refresh when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
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
      isRefreshing,
      error,
      lastUpdated,
      consecutiveErrors,
      sessions, 
      statusText, 
      cronJobs, 
      gatewayConfig,
      skills,
      refresh 
    }}>
      {children}
    </LiveDataContext.Provider>
  )
}
