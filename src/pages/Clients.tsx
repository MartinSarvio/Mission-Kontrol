import { useState } from 'react'
import Card from '../components/Card'
import Table from '../components/Table'
import StatusBadge from '../components/StatusBadge'
import SearchBar from '../components/SearchBar'
import Modal from '../components/Modal'
import { clients } from '../data/mock'
import { Client } from '../types'

export default function Clients() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)

  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <h1 className="page-title mb-1">Clients</h1>
      <p className="caption mb-6">{clients.length} clients registered</p>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search clients..." /></div>
        <button className="btn-primary">Add Client</button>
      </div>

      <Card>
        <Table
          data={filtered}
          onRowClick={setSelected}
          columns={[
            { key: 'name', header: 'Client', render: c => <span className="font-medium">{c.name}</span> },
            { key: 'company', header: 'Company', render: c => <span className="text-apple-gray-500">{c.company}</span> },
            { key: 'status', header: 'Status', render: c => <StatusBadge status={c.status} /> },
            { key: 'tasks', header: 'Active Tasks', render: c => c.activeTasks },
            { key: 'spend', header: 'Total Spend', render: c => `$${c.totalSpend.toFixed(2)}` },
            { key: 'role', header: 'Role', render: c => <span className="capitalize">{c.role}</span> },
            { key: 'active', header: 'Last Active', render: c => <span className="caption">{c.lastActive}</span> },
          ]}
        />
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="caption">Email</p><p className="font-medium">{selected.email}</p></div>
              <div><p className="caption">Company</p><p className="font-medium">{selected.company}</p></div>
              <div><p className="caption">Status</p><StatusBadge status={selected.status} /></div>
              <div><p className="caption">Role</p><p className="font-medium capitalize">{selected.role}</p></div>
              <div><p className="caption">Active Tasks</p><p className="font-medium">{selected.activeTasks}</p></div>
              <div><p className="caption">Documents</p><p className="font-medium">{selected.documents}</p></div>
              <div><p className="caption">API Key</p><p className="font-mono text-xs bg-apple-gray-50 px-2 py-1 rounded">{selected.apiKey}</p></div>
              <div><p className="caption">Total Spend</p><p className="font-medium">${selected.totalSpend.toFixed(2)}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
