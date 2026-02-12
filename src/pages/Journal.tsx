import { useState, useEffect } from 'react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import SearchBar from '../components/SearchBar'
import Icon from '../components/Icon'
import { fetchAllSessionHistory } from '../api/openclaw'
import { useLiveData } from '../api/LiveDataContext'

interface JournalEntry {
  id: string
  timestamp: string
  sessionKey: string
  sessionLabel: string
  role: string
  content: string
  model?: string
  tokens?: { input?: number; output?: number }
}

export default function Journal() {
  const { isConnected, isLoading } = useLiveData()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (isConnected) {
      setLoading(true)
      fetchAllSessionHistory(100)
        .then(history => {
          const mapped = history.map((msg: any, idx: number) => ({
            id: `${msg.sessionKey}-${msg.timestamp || idx}`,
            timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleString('da-DK') : 'Ukendt tid',
            sessionKey: msg.sessionKey || 'unknown',
            sessionLabel: msg.sessionLabel || msg.sessionKey || 'Unavngiven session',
            role: msg.role || 'system',
            content: msg.content || msg.text || '',
            model: msg.model,
            tokens: msg.tokens,
          }))
          setEntries(mapped)
        })
        .catch(err => {
          console.error('Failed to fetch journal:', err)
          setEntries([])
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isConnected])

  const filtered = entries.filter(e => {
    if (search && !e.content.toLowerCase().includes(search.toLowerCase()) && !e.sessionLabel.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'user' && e.role !== 'user') return false
    if (filter === 'assistant' && e.role !== 'assistant') return false
    if (filter === 'system' && e.role !== 'system') return false
    return true
  })

  if (isLoading || loading) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Journal</h1>
        <p className="caption mb-6">Samlet aktivitetstidslinje</p>
        <Card>
          <div className="text-center py-8 text-white/50">Henter journal...</div>
        </Card>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Journal</h1>
        <p className="caption mb-6">Samlet aktivitetstidslinje</p>
        <Card>
          <div className="text-center py-8">
            <p className="text-white/70 mb-2">Ingen forbindelse til Gateway</p>
            <p className="text-sm text-white/50">Gå til Indstillinger for at konfigurere API forbindelse</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Journal</h1>
      <p className="caption mb-6">Samlet aktivitetstidslinje</p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Søg i indlæg..." /></div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {['all', 'user', 'assistant', 'system'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${filter === f ? 'bg-apple-blue text-white' : 'px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white'}`}
              style={{ minHeight: '44px' }}>
              {f === 'all' ? 'Alle' : f === 'user' ? 'Bruger' : f === 'assistant' ? 'Assistent' : 'System'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-white/50">
            {entries.length === 0 ? 'Ingen journalindlæg endnu' : 'Ingen resultater matchede din søgning'}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <Card key={entry.id} className="cursor-pointer">
              <div onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={entry.role === 'user' ? 'active' : entry.role === 'assistant' ? 'running' : 'idle'} />
                    <span className="text-sm font-medium">{entry.sessionLabel}</span>
                    <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>{entry.role}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="caption">{entry.timestamp}</span>
                    <span className={`transition-transform ${expanded === entry.id ? 'rotate-180' : ''}`}>
                      <Icon name="chevron-down" size={16} className="text-white/30" />
                    </span>
                  </div>
                </div>
                <p className="text-sm mt-2 line-clamp-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {entry.content.substring(0, 200)}{entry.content.length > 200 ? '...' : ''}
                </p>
              </div>

              {expanded === entry.id && (
                <div className="mt-4 pt-4 space-y-3 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="caption mb-1">Indhold</p>
                    <div className="p-3 rounded-xl text-sm whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                      {entry.content}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 sm:gap-6">
                    <div><span className="caption">Session:</span> <span className="font-medium font-mono text-xs">{entry.sessionKey}</span></div>
                    {entry.model && <div><span className="caption">Model:</span> <span className="font-medium">{entry.model}</span></div>}
                    {entry.tokens?.input && <div><span className="caption">Tokens in:</span> <span className="font-medium">{entry.tokens.input.toLocaleString()}</span></div>}
                    {entry.tokens?.output && <div><span className="caption">Tokens out:</span> <span className="font-medium">{entry.tokens.output.toLocaleString()}</span></div>}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
