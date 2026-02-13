import { useState, useMemo } from 'react'
import Card from '../components/Card'
import SearchBar from '../components/SearchBar'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { searchWorkspace } from '../api/openclaw'

type Category = 'all' | 'workspace' | 'sessions' | 'cron'

const categoryLabels: Record<Category, string> = {
  all: 'Alle',
  workspace: 'Workspace',
  sessions: 'Sessions',
  cron: 'Cron Jobs'
}

interface SearchResult {
  type: string
  title: string
  subtitle: string
  status?: string
  content?: string
}

export default function Index() {
  const { sessions, cronJobs } = useLiveData()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [workspaceResults, setWorkspaceResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Søg i workspace files når search opdateres
  const performWorkspaceSearch = async (query: string) => {
    if (!query.trim() || (category !== 'all' && category !== 'workspace')) {
      setWorkspaceResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchWorkspace(query)
      
      const parsed: SearchResult[] = results
        .filter((r: any) => r.file)
        .slice(0, 20)
        .map((r: any) => ({
          type: 'Workspace',
          title: r.file.split('/').pop() || r.file,
          subtitle: `Linje ${r.line}`,
          content: r.text
        }))
      
      setWorkspaceResults(parsed)
    } catch (err) {
      console.error('Workspace search error:', err)
      setWorkspaceResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced workspace search
  useMemo(() => {
    const timer = setTimeout(() => {
      performWorkspaceSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, category])

  // Søg i sessions
  const sessionResults = useMemo(() => {
    if (!search.trim() || (category !== 'all' && category !== 'sessions')) return []
    
    const q = search.toLowerCase()
    return sessions
      .filter(s => 
        s.key.toLowerCase().includes(q) || 
        (s.label && s.label.toLowerCase().includes(q))
      )
      .slice(0, 10)
      .map(s => ({
        type: 'Session',
        title: s.key,
        subtitle: `${s.label || 'Ingen label'} · ${'N/A'} beskeder`,
        status: s.kind
      }))
  }, [search, sessions, category])

  // Søg i cron jobs
  const cronResults = useMemo(() => {
    if (!search.trim() || (category !== 'all' && category !== 'cron')) return []
    
    const q = search.toLowerCase()
    return cronJobs
      .filter(c => 
        c.name.toLowerCase().includes(q) || 
        (typeof c.schedule === 'string' ? c.schedule : c.schedule?.expr || '').toLowerCase().includes(q)
      )
      .slice(0, 10)
      .map(c => ({
        type: 'Cron Job',
        title: c.name,
        subtitle: typeof c.schedule === 'object' ? (c.schedule?.expr || c.schedule?.kind || 'Planlagt') : (c.schedule || ''),
        status: String(c.enabled)
      }))
  }, [search, cronJobs, category])

  // Kombiner alle resultater
  const allResults = useMemo(() => {
    const combined: SearchResult[] = []
    
    if (category === 'all' || category === 'workspace') {
      combined.push(...workspaceResults)
    }
    if (category === 'all' || category === 'sessions') {
      combined.push(...sessionResults)
    }
    if (category === 'all' || category === 'cron') {
      combined.push(...cronResults)
    }
    
    return combined
  }, [workspaceResults, sessionResults, cronResults, category])

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Søgning</h1>
      <p className="caption mb-6">Universel søgning på tværs af workspace, sessions og jobs</p>

      <div className="w-full">
        <SearchBar value={search} onChange={setSearch} placeholder="Søg i workspace filer, sessions, cron jobs..." />

        <div className="flex flex-wrap gap-1 mt-4 mb-6">
          {(['all', 'workspace', 'sessions', 'cron'] as Category[]).map(c => (
            <button 
              key={c} 
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap`}
              style={{
                minHeight: '44px',
                background: category === c ? '#007AFF' : 'rgba(255,255,255,0.05)',
                border: category === c ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: category === c ? '#fff' : 'rgba(255,255,255,0.7)'
              }}
            >
              {categoryLabels[c]}
            </button>
          ))}
        </div>

        {!search && (
          <div className="text-center py-16 px-4">
            <Icon name="magnifying-glass" size={40} className="text-white/30 mx-auto mb-4" />
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>
              Begynd at skrive for at søge på tværs af workspace filer, sessions og planlagte jobs
            </p>
            <p className="caption mt-2">
              Workspace søgning bruger grep til at finde matches i alle filer
            </p>
          </div>
        )}

        {search && isSearching && (
          <div className="text-center py-8">
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Søger...</p>
          </div>
        )}

        {search && !isSearching && allResults.length === 0 && (
          <div className="text-center py-16 px-4">
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Ingen resultater fundet for &quot;{search}&quot;</p>
          </div>
        )}

        <div className="space-y-2">
          {allResults.map((r, i) => (
            <Card key={i} className="cursor-pointer hover:bg-white/5 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span 
                    className="px-2 py-0.5 rounded-lg text-[11px] font-medium whitespace-nowrap mt-0.5" 
                    style={{ 
                      background: 'rgba(255,255,255,0.06)', 
                      color: 'rgba(255,255,255,0.4)' 
                    }}
                  >
                    {r.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-mono break-all">{r.title}</p>
                    <p className="caption mt-0.5">{r.subtitle}</p>
                    {r.content && (
                      <p 
                        className="text-xs font-mono mt-2 p-2 rounded overflow-x-auto" 
                        style={{ 
                          background: 'rgba(255,255,255,0.03)', 
                          color: 'rgba(255,255,255,0.6)' 
                        }}
                      >
                        {r.content}
                      </p>
                    )}
                  </div>
                </div>
                {r.status && (
                  <span 
                    className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap" 
                    style={{ 
                      background: r.status === 'active' ? 'rgba(52,199,89,0.1)' : 
                                 r.status === 'error' ? 'rgba(255,59,48,0.1)' : 
                                 'rgba(255,255,255,0.06)', 
                      color: r.status === 'active' ? '#34C759' : 
                             r.status === 'error' ? '#FF3B30' : 
                             'rgba(255,255,255,0.4)' 
                    }}
                  >
                    {r.status}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>

        {search && allResults.length > 0 && (
          <div className="mt-6 p-4 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>
              Fundet {allResults.length} resultat{allResults.length !== 1 ? 'er' : ''} 
              {category !== 'all' && ` i ${categoryLabels[category]}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
