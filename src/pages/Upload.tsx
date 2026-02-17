import { useState, useCallback, useRef, useEffect } from 'react'
import Icon from '../components/Icon'
import { invokeToolRaw } from '../api/openclaw'

interface UploadedFile {
  name: string
  size: number
  date: string
  path: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_SIZE = 100 * 1024 * 1024 // 100MB
const CHUNK_SIZE = 768 * 1024 // 768KB raw → ~1MB base64
const ACCEPTED_VIDEO = '.mp4,.mov,.webm,.avi'
const UPLOAD_DIR = '/data/.openclaw/workspace/uploads'

export default function Upload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load existing files
  const loadFiles = useCallback(async () => {
    try {
      const data = await invokeToolRaw('exec', {
        command: `mkdir -p ${UPLOAD_DIR} && find ${UPLOAD_DIR} -maxdepth 1 -type f -printf '%f\\t%s\\t%T@\\n' 2>/dev/null | sort -t$'\\t' -k3 -rn`
      }) as any
      const text = data.result?.content?.[0]?.text || ''
      const parsed: UploadedFile[] = []
      for (const line of text.split('\n').filter(Boolean)) {
        const [name, sizeStr, tsStr] = line.split('\t')
        if (!name) continue
        parsed.push({
          name,
          size: parseInt(sizeStr) || 0,
          date: new Date(parseFloat(tsStr) * 1000).toLocaleString('da-DK'),
          path: `${UPLOAD_DIR}/${name}`,
        })
      }
      setFiles(parsed)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE) {
      setError(`Filen "${file.name}" er for stor (max 100MB)`)
      return
    }
    setError('')
    setUploading(true)
    setCurrentFile(file.name)
    setProgress(0)

    try {
      // Sanitize filename
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const destPath = `${UPLOAD_DIR}/${safeName}`

      // Ensure directory exists and clear target
      await invokeToolRaw('exec', {
        command: `mkdir -p ${UPLOAD_DIR} && rm -f "${destPath}"`
      })

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const slice = file.slice(start, end)

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1] || '')
          }
          reader.onerror = reject
          reader.readAsDataURL(slice)
        })

        await invokeToolRaw('exec', {
          command: `echo '${base64}' | base64 -d >> "${destPath}"`
        })

        setProgress(Math.round(((i + 1) / totalChunks) * 100))
      }

      await loadFiles()
    } catch (e: any) {
      setError(`Upload fejlede: ${e?.message || 'Ukendt fejl'}`)
    } finally {
      setUploading(false)
      setCurrentFile('')
      setProgress(0)
    }
  }, [loadFiles])

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    // Upload first file (could extend to multiple)
    uploadFile(fileList[0])
  }, [uploadFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDelete = useCallback(async (file: UploadedFile) => {
    try {
      await invokeToolRaw('exec', { command: `rm -f "${file.path}"` })
      await loadFiles()
    } catch { /* ignore */ }
  }, [loadFiles])

  const handleAnalyse = useCallback(async (file: UploadedFile) => {
    try {
      await invokeToolRaw('sessions_spawn', {
        task: `Analysér videofilen: ${file.path}\n\nBrug ffprobe til at hente metadata, og beskriv hvad du finder. Hvis muligt, tag screenshots og beskriv indholdet.`,
        model: 'sonnet',
        label: `analyse-${file.name}`,
      })
      setError('')
      alert(`Analyse startet for "${file.name}" — tjek Agenter-siden.`)
    } catch (e: any) {
      setError(`Kunne ikke starte analyse: ${e?.message || 'Ukendt fejl'}`)
    }
  }, [])

  const isVideo = (name: string) => /\.(mp4|mov|webm|avi)$/i.test(name)

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 24,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Fil Upload</h1>
        <p className="text-sm text-white/40 mt-1">Upload filer til workspace. Video, dokumenter og andet.</p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          ...cardStyle,
          border: dragOver
            ? '2px dashed rgba(0,122,255,0.6)'
            : '2px dashed rgba(255,255,255,0.12)',
          cursor: uploading ? 'default' : 'pointer',
          textAlign: 'center',
          padding: '48px 24px',
          transition: 'border-color 200ms, background 200ms',
          background: dragOver ? 'rgba(0,122,255,0.05)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={`${ACCEPTED_VIDEO},.pdf,.txt,.md,.json,.zip,.tar.gz,.png,.jpg,.jpeg,.gif,.webp`}
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="upload" size={24} className="text-white/40" />
          </div>
          <div>
            <p className="text-white/70 font-medium">
              {dragOver ? 'Slip filen her' : 'Træk filer hertil eller klik for at vælge'}
            </p>
            <p className="text-white/30 text-xs mt-1">
              Video (MP4, MOV, WebM, AVI) + andre filer — maks 100 MB
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div style={cardStyle}>
          <div className="flex items-center gap-3 mb-3">
            <Icon name="upload" size={16} className="text-blue-400" />
            <span className="text-sm text-white/70">Uploader {currentFile}...</span>
            <span className="text-sm text-white/40 ml-auto">{progress}%</span>
          </div>
          <div style={{
            height: 6, borderRadius: 3,
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #007AFF, #30D158)',
              transition: 'width 300ms ease-out',
            }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          ...cardStyle,
          borderColor: 'rgba(255,59,48,0.3)',
          background: 'rgba(255,59,48,0.05)',
        }}>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* File list */}
      <div style={cardStyle}>
        <h2 className="text-lg font-semibold text-white mb-4">Uploadede filer</h2>
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton-pulse h-10" />
            <div className="skeleton-pulse h-10" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">Ingen filer endnu</p>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <Icon
                  name={isVideo(f.name) ? 'sparkle' : 'doc'}
                  size={18}
                  className={isVideo(f.name) ? 'text-blue-400' : 'text-white/40'}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{f.name}</p>
                  <p className="text-xs text-white/30">{formatSize(f.size)} — {f.date}</p>
                </div>
                {isVideo(f.name) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAnalyse(f) }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 8,
                      background: 'rgba(0,122,255,0.15)',
                      color: '#007AFF',
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid rgba(0,122,255,0.2)',
                      cursor: 'pointer',
                    }}
                  >
                    Analysér
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(f) }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    background: 'rgba(255,59,48,0.1)',
                    border: '1px solid rgba(255,59,48,0.15)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Icon name="xmark" size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
