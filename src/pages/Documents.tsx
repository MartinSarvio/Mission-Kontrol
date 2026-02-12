import { useState, useEffect } from 'react'
import Card from '../components/Card'
import Table from '../components/Table'
import SearchBar from '../components/SearchBar'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import { fetchWorkspaceFiles } from '../api/openclaw'
import { useLiveData } from '../api/LiveDataContext'

interface WorkspaceFile {
  id: string
  name: string
  path: string
  size: string
  modified: string
  type: string
}

export default function Documents() {
  const { isConnected } = useLiveData()
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<WorkspaceFile | null>(null)

  useEffect(() => {
    if (isConnected) {
      setLoading(true)
      fetchWorkspaceFiles()
        .then(fileList => {
          const mapped = fileList.map((f: any, i: number) => ({
            id: `f${i}`,
            name: f.name || f.path?.split('/').pop() || 'Unavngiven',
            path: f.path || '',
            size: f.size || 'N/A',
            modified: f.modified || 'Ukendt',
            type: f.type || detectFileType(f.name || f.path || ''),
          }))
          setFiles(mapped)
        })
        .catch(err => {
          console.error('Failed to fetch workspace files:', err)
          setFiles([])
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isConnected])

  const filtered = files.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.type.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Dokumenter</h1>
        <p className="caption mb-6">Videnbase og filhåndtering</p>
        <Card>
          <div className="text-center py-8 text-white/50">Henter filer...</div>
        </Card>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Dokumenter</h1>
        <p className="caption mb-6">Videnbase og filhåndtering</p>
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
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Dokumenter</h1>
      <p className="caption mb-6">Videnbase og filhåndtering</p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Søg i dokumenter..." /></div>
        <button className="flex items-center justify-center gap-1.5" style={{ minHeight: '44px', background: '#007AFF', color: '#fff', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', opacity: 0.5 }} disabled>
          <Icon name="upload" size={14} /> Upload Dokument
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-white/50">
            {files.length === 0 ? 'Ingen filer fundet i workspace' : 'Ingen filer matchede din søgning'}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table
              data={filtered}
              onRowClick={setSelected}
              columns={[
                { key: 'name', header: 'Navn', render: d => (
                  <div className="flex items-center gap-2">
                    <Icon name={getIconForFile(d.name)} size={14} className="text-white/40" />
                    <span className="font-medium whitespace-nowrap">{d.name}</span>
                  </div>
                )},
                { key: 'type', header: 'Type', render: d => <span className="whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>{d.type}</span> },
                { key: 'size', header: 'Størrelse', render: d => <span className="whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>{d.size}</span> },
                { key: 'modified', header: 'Ændret', render: d => <span className="caption whitespace-nowrap">{d.modified}</span> },
                { key: 'path', header: 'Sti', render: d => <span className="caption whitespace-nowrap font-mono text-xs">{d.path}</span> },
              ]}
            />
          </div>
        </Card>
      )}

      <div className="mt-6 border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-colors" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <Icon name="upload" size={24} className="text-white/30 mx-auto mb-2" />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Upload funktion kommer snart</p>
        <p className="caption mt-1">PDF, Markdown, CSV, Excel, SQL</p>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><p className="caption">Type</p><p className="font-medium">{selected.type}</p></div>
              <div><p className="caption">Størrelse</p><p className="font-medium">{selected.size}</p></div>
              <div><p className="caption">Sidst Ændret</p><p className="font-medium">{selected.modified}</p></div>
              <div><p className="caption">Sti</p><p className="font-medium font-mono text-xs">{selected.path}</p></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button style={{ minHeight: '44px', background: '#007AFF', color: '#fff', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: 'none', opacity: 0.5 }} disabled>Download</button>
              <button style={{ minHeight: '44px', background: 'rgba(0,122,255,0.1)', color: '#007AFF', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(0,122,255,0.2)', opacity: 0.5 }} disabled>Se Indhold</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function detectFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext) return 'Ukendt'
  
  const types: Record<string, string> = {
    md: 'Markdown',
    txt: 'Tekst',
    json: 'JSON',
    js: 'JavaScript',
    ts: 'TypeScript',
    jsx: 'React JSX',
    tsx: 'React TSX',
    css: 'CSS',
    html: 'HTML',
    pdf: 'PDF',
    csv: 'CSV',
    xlsx: 'Excel',
    sql: 'SQL',
    sh: 'Shell Script',
    yml: 'YAML',
    yaml: 'YAML',
    toml: 'TOML',
  }
  
  return types[ext] || ext.toUpperCase()
}

function getIconForFile(filename: string): 'doc' | 'doc-text' | 'folder' {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext) return 'doc'
  
  const textTypes = ['md', 'txt', 'json', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'yml', 'yaml', 'toml', 'sh']
  if (textTypes.includes(ext)) return 'doc-text'
  
  return 'doc'
}
