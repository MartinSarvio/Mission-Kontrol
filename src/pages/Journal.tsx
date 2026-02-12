import { useState } from 'react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import SearchBar from '../components/SearchBar'
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-apple-blue text-white' : 'bg-white text-apple-gray-500 hover:bg-apple-gray-100'}`}>
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
                  {entry.pinned && <span className="text-apple-blue text-xs">📌</span>}
                  <StatusBadge status={entry.severity} />
                  <span className="text-sm font-medium">{entry.task}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="caption">{entry.agent}</span>
                  <span className="caption">{entry.timestamp}</span>
                  <svg className={`w-4 h-4 text-apple-gray-300 transition-transform ${expanded === entry.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-apple-gray-500 mt-2">{entry.output}</p>
            </div>

            {expanded === entry.id && (
              <div className="mt-4 pt-4 border-t border-apple-gray-100 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="caption mb-1">Prompt / Input</p>
                    <p className="bg-apple-gray-50 p-3 rounded-lg text-apple-gray-600">{entry.prompt}</p>
                  </div>
                  <div>
                    <p className="caption mb-1">Output</p>
                    <p className="bg-apple-gray-50 p-3 rounded-lg text-apple-gray-600">{entry.output}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div><span className="caption">Klient:</span> <span className="font-medium">{entry.client}</span></div>
                  <div><span className="caption">Latens:</span> <span className="font-medium">{entry.latencyMs}ms</span></div>
                  <div><span className="caption">Omkostning:</span> <span className="font-medium">${entry.cost.toFixed(3)}</span></div>
                  <div><span className="caption">Værktøjer:</span> <span className="font-medium">{entry.tools.join(', ')}</span></div>
                </div>
                {entry.error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">⚠️ {entry.error}</div>
                )}
                {entry.notes && (
                  <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">📝 {entry.notes}</div>
                )}
                <div className="flex gap-2">
                  {entry.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-apple-gray-100 text-apple-gray-500 rounded text-xs">{t}</span>
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
