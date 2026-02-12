import { useState } from 'react'
import Card from '../components/Card'
import Table from '../components/Table'
import StatusBadge from '../components/StatusBadge'
import SearchBar from '../components/SearchBar'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import { clients } from '../data/mock'
import { Client } from '../types'

export default function Clients() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)

  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <h1 className="page-title mb-1">Klienter</h1>
      <p className="caption mb-6">{clients.length} klient registreret</p>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Søg klienter..." /></div>
        <button className="btn-primary flex items-center gap-1.5"><Icon name="person" size={14} /> Tilføj Klient</button>
      </div>

      <Card>
        <Table
          data={filtered}
          onRowClick={setSelected}
          columns={[
            { key: 'name', header: 'Klient', render: c => <span className="font-medium">{c.name}</span> },
            { key: 'company', header: 'Virksomhed', render: c => <span style={{ color: '#636366' }}>{c.company}</span> },
            { key: 'status', header: 'Status', render: c => <StatusBadge status={c.status} /> },
            { key: 'tasks', header: 'Aktive Opgaver', render: c => c.activeTasks },
            { key: 'spend', header: 'Samlet Forbrug', render: c => c.totalSpend > 0 ? `$${c.totalSpend.toFixed(2)}` : 'API-nøgle' },
            { key: 'role', header: 'Rolle', render: c => <span className="capitalize">{c.role}</span> },
            { key: 'active', header: 'Sidst Aktiv', render: c => <span className="caption">{c.lastActive}</span> },
          ]}
        />
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="caption">Email</p><p className="font-medium">{selected.email}</p></div>
              <div><p className="caption">Virksomhed</p><p className="font-medium">{selected.company}</p></div>
              <div><p className="caption">Status</p><StatusBadge status={selected.status} /></div>
              <div><p className="caption">Rolle</p><p className="font-medium capitalize">{selected.role}</p></div>
              <div><p className="caption">Aktive Opgaver</p><p className="font-medium">{selected.activeTasks}</p></div>
              <div><p className="caption">Dokumenter</p><p className="font-medium">{selected.documents}</p></div>
              <div><p className="caption">Forbindelse</p><p className="font-mono text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.04)' }}>{selected.apiKey}</p></div>
              <div><p className="caption">Samlet Forbrug</p><p className="font-medium">{selected.totalSpend > 0 ? `$${selected.totalSpend.toFixed(2)}` : 'Via API-nøgle'}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
