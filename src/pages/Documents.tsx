import { useState } from 'react'
import Card from '../components/Card'
import Table from '../components/Table'
import SearchBar from '../components/SearchBar'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
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
      <h1 className="page-title mb-1">Dokumenter</h1>
      <p className="caption mb-6">Videnbase og filhåndtering</p>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Søg i dokumenter..." /></div>
        <button className="btn-primary flex items-center gap-1.5"><Icon name="upload" size={14} /> Upload Dokument</button>
      </div>

      <Card>
        <Table
          data={filtered}
          onRowClick={setSelected}
          columns={[
            { key: 'name', header: 'Navn', render: d => (
              <div className="flex items-center gap-2">
                <Icon name="doc" size={14} className="text-white/40" />
                <span className="font-medium">{d.name}</span>
                {d.doNotUse && <span className="px-1.5 py-0.5 text-red-400 text-[10px] rounded-full font-medium" style={{ background: 'rgba(255,59,48,0.1)' }}>BRUG IKKE</span>}
              </div>
            )},
            { key: 'type', header: 'Type', render: d => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{d.type}</span> },
            { key: 'size', header: 'Størrelse', render: d => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{d.size}</span> },
            { key: 'version', header: 'Version', render: d => <span>v{d.version}</span> },
            { key: 'used', header: 'Brugt i', render: d => <span>{d.usedInRuns} kørsler</span> },
            { key: 'modified', header: 'Ændret', render: d => <span className="caption">{d.lastModified}</span> },
            { key: 'tags', header: 'Tags', render: d => (
              <div className="flex gap-1">{d.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded-lg text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{t}</span>)}</div>
            )},
          ]}
        />
      </Card>

      <div className="mt-6 border-2 border-dashed rounded-2xl p-12 text-center transition-colors" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <Icon name="upload" size={24} className="text-white/30 mx-auto mb-2" />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Træk og slip filer her eller klik Upload</p>
        <p className="caption mt-1">PDF, Markdown, CSV, Excel, SQL</p>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="caption">Type</p><p className="font-medium">{selected.type}</p></div>
              <div><p className="caption">Størrelse</p><p className="font-medium">{selected.size}</p></div>
              <div><p className="caption">Version</p><p className="font-medium">v{selected.version}</p></div>
              <div><p className="caption">Uploadet af</p><p className="font-medium">{selected.uploadedBy}</p></div>
              <div><p className="caption">Sidst Ændret</p><p className="font-medium">{selected.lastModified}</p></div>
              <div><p className="caption">Brugt i Kørsler</p><p className="font-medium">{selected.usedInRuns}</p></div>
            </div>
            <div>
              <p className="caption mb-1">Tags</p>
              <div className="flex gap-1">{selected.tags.map(t => <span key={t} className="px-2 py-0.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{t}</span>)}</div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="btn-primary">Download</button>
              <button className="px-4 py-2 text-sm font-medium rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>{selected.doNotUse ? 'Aktivér' : 'Markér Brug Ikke'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
