import { useState } from 'react'
import Card from '../components/Card'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'
import { agents, clients, documents, journalEntries, cronJobs } from '../data/mock'

type Category = 'all' | 'agents' | 'clients' | 'documents' | 'journal' | 'cron'

const categoryLabels: Record<Category, string> = {
  all: 'Alle', agents: 'Agenter', clients: 'Klienter',
  documents: 'Dokumenter', journal: 'Journal', cron: 'Jobs'
}

const typeLabels: Record<string, string> = {
  Agent: 'Agent', Client: 'Klient', Document: 'Dokument', Journal: 'Journal', 'Cron Job': 'Planlagt Job'
}

export default function Index() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')

  const q = search.toLowerCase()
  const results: { type: string; title: string; subtitle: string; status?: string }[] = []

  if (q) {
    if (category === 'all' || category === 'agents') {
      agents.filter(a => a.name.toLowerCase().includes(q)).forEach(a =>
        results.push({ type: 'Agent', title: a.name, subtitle: a.purpose, status: a.status }))
    }
    if (category === 'all' || category === 'clients') {
      clients.filter(c => c.name.toLowerCase().includes(q)).forEach(c =>
        results.push({ type: 'Klient', title: c.name, subtitle: c.company, status: c.status }))
    }
    if (category === 'all' || category === 'documents') {
      documents.filter(d => d.name.toLowerCase().includes(q)).forEach(d =>
        results.push({ type: 'Dokument', title: d.name, subtitle: `${d.type} · v${d.version}` }))
    }
    if (category === 'all' || category === 'journal') {
      journalEntries.filter(j => j.task.toLowerCase().includes(q) || j.output.toLowerCase().includes(q)).forEach(j =>
        results.push({ type: 'Journal', title: j.task, subtitle: `${j.agent} · ${j.timestamp}`, status: j.severity }))
    }
    if (category === 'all' || category === 'cron') {
      cronJobs.filter(c => c.name.toLowerCase().includes(q)).forEach(c =>
        results.push({ type: 'Planlagt Job', title: c.name, subtitle: c.schedule, status: c.status }))
    }
  }

  return (
    <div>
      <h1 className="page-title mb-1">Søgning</h1>
      <p className="caption mb-6">Universel søgning på tværs af alle enheder</p>

      <div className="max-w-2xl mx-auto">
        <SearchBar value={search} onChange={setSearch} placeholder="Søg i alt..." />

        <div className="flex gap-1 mt-4 mb-6">
          {(['all', 'agents', 'clients', 'documents', 'journal', 'cron'] as Category[]).map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === c ? 'bg-apple-blue text-white' : 'bg-white text-apple-gray-500 hover:bg-apple-gray-100'}`}>
              {categoryLabels[c]}
            </button>
          ))}
        </div>

        {!search && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-apple-gray-400">Begynd at skrive for at søge på tværs af agenter, klienter, dokumenter, journalindlæg og planlagte jobs</p>
          </div>
        )}

        {search && results.length === 0 && (
          <div className="text-center py-16">
            <p className="text-apple-gray-400">Ingen resultater fundet for "{search}"</p>
          </div>
        )}

        <div className="space-y-2">
          {results.map((r, i) => (
            <Card key={i} className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-apple-gray-100 text-apple-gray-500 rounded text-[11px] font-medium">{r.type}</span>
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="caption">{r.subtitle}</p>
                  </div>
                </div>
                {r.status && <StatusBadge status={r.status} />}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
