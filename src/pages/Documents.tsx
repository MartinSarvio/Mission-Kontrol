import { useState } from 'react'
import Card from '../components/Card'
import Table from '../components/Table'
import SearchBar from '../components/SearchBar'
import Modal from '../components/Modal'
import { documents } from '../data/mock'
import { Document } from '../types'

export default function Documents() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Document | null>(null)

  const filtered = documents.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.tags.some(t => t.includes(search.toLowerCase()))
  )

  return (
    <div>
      <h1 className="page-title mb-1">Documents</h1>
      <p className="caption mb-6">Knowledge base and file management</p>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search documents..." /></div>
        <button className="btn-primary">Upload Document</button>
      </div>

      <Card>
        <Table
          data={filtered}
          onRowClick={setSelected}
          columns={[
            { key: 'name', header: 'Name', render: d => (
              <div className="flex items-center gap-2">
                <span className="font-medium">{d.name}</span>
                {d.doNotUse && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] rounded font-medium">DO NOT USE</span>}
              </div>
            )},
            { key: 'type', header: 'Type', render: d => <span className="text-apple-gray-500">{d.type}</span> },
            { key: 'size', header: 'Size', render: d => <span className="text-apple-gray-500">{d.size}</span> },
            { key: 'version', header: 'Version', render: d => <span>v{d.version}</span> },
            { key: 'used', header: 'Used In', render: d => <span>{d.usedInRuns} runs</span> },
            { key: 'modified', header: 'Modified', render: d => <span className="caption">{d.lastModified}</span> },
            { key: 'tags', header: 'Tags', render: d => (
              <div className="flex gap-1">{d.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-apple-gray-50 text-apple-gray-500 rounded text-[11px]">{t}</span>)}</div>
            )},
          ]}
        />
      </Card>

      {/* Upload drop zone */}
      <div className="mt-6 border-2 border-dashed border-apple-gray-200 rounded-card p-12 text-center hover:border-apple-blue/40 transition-colors">
        <p className="text-apple-gray-400 text-sm">Drag & drop files here or click Upload</p>
        <p className="caption mt-1">PDF, Markdown, CSV, Excel, SQL</p>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="caption">Type</p><p className="font-medium">{selected.type}</p></div>
              <div><p className="caption">Size</p><p className="font-medium">{selected.size}</p></div>
              <div><p className="caption">Version</p><p className="font-medium">v{selected.version}</p></div>
              <div><p className="caption">Uploaded By</p><p className="font-medium">{selected.uploadedBy}</p></div>
              <div><p className="caption">Last Modified</p><p className="font-medium">{selected.lastModified}</p></div>
              <div><p className="caption">Used in Runs</p><p className="font-medium">{selected.usedInRuns}</p></div>
            </div>
            <div>
              <p className="caption mb-1">Tags</p>
              <div className="flex gap-1">{selected.tags.map(t => <span key={t} className="px-2 py-0.5 bg-apple-gray-100 text-apple-gray-500 rounded text-xs">{t}</span>)}</div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="btn-primary">Download</button>
              <button className="btn-secondary">{selected.doNotUse ? 'Enable' : 'Mark Do Not Use'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
