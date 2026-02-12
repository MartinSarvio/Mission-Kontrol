import { useState } from 'react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import SearchBar from '../components/SearchBar'
import Icon from '../components/Icon'
import { journalEntries } from '../data/mock'

export default function Journal() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const filtered = journalEntries.filter(e => {
    if (search && !e.task.toLowerCase().includes(search.toLowerCase()) && !e.agent.toLowerCase().includes(search.toLowerCase())) return false
    if (filter !== 'all' && e.severity !== filter) return false
    return true
  })

  return (
    <div>
      <h1 className="page-title mb-1">Journal</h1>
      <p className="caption mb-6">Samlet aktivitetstidslinje</p>

      <div className="flex items-center gap-3 mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Søg i indlæg..." />
        <div className="flex gap-1">
          {['all', 'info', 'warning', 'error', 'critical'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === f ? 'bg-apple-blue text-white' : 'px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white'}`}>
              {f === 'all' ? 'Alle' : f === 'info' ? 'Info' : f === 'warning' ? 'Advarsel' : f === 'error' ? 'Fejl' : 'Kritisk'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(entry => (
          <Card key={entry.id} className={`cursor-pointer ${entry.pinned ? 'ring-1 ring-apple-blue/30' : ''}`}>
            <div onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {entry.pinned && <Icon name="pin" size={14} className="text-apple-blue" />}
                  <StatusBadge status={entry.severity} />
                  <span className="text-sm font-medium">{entry.task}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="caption">{entry.agent}</span>
                  <span className="caption">{entry.timestamp}</span>
                  <span className={`transition-transform ${expanded === entry.id ? 'rotate-180' : ''}`}>
                    <Icon name="chevron-down" size={16} className="text-white/30" />
                  </span>
                </div>
              </div>
              <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>{entry.output}</p>
            </div>

            {expanded === entry.id && (
              <div className="mt-4 pt-4 space-y-3 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="caption mb-1">Prompt / Input</p>
                    <p className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>{entry.prompt}</p>
                  </div>
                  <div>
                    <p className="caption mb-1">Output</p>
                    <p className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>{entry.output}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div><span className="caption">Klient:</span> <span className="font-medium">{entry.client}</span></div>
                  <div><span className="caption">Latens:</span> <span className="font-medium">{entry.latencyMs}ms</span></div>
                  <div><span className="caption">Omkostning:</span> <span className="font-medium">${entry.cost.toFixed(3)}</span></div>
                  <div><span className="caption">Værktøjer:</span> <span className="font-medium">{entry.tools.join(', ')}</span></div>
                </div>
                {entry.error && (
                  <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,59,48,0.06)', color: '#FF3B30' }}>
                    <span className="flex items-center gap-1.5"><Icon name="exclamation" size={14} /> {entry.error}</span>
                  </div>
                )}
                {entry.notes && (
                  <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(0,122,255,0.06)', color: '#007AFF' }}>
                    <span className="flex items-center gap-1.5"><Icon name="doc-text" size={14} /> {entry.notes}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  {entry.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
