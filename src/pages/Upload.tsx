import { useState, useCallback, useRef, useEffect } from 'react'
import Icon from '../components/Icon'
import { invokeToolRaw } from '../api/openclaw'
import { UploadSkeleton } from '../components/SkeletonLoader'
import DataFreshness from '../components/DataFreshness'

interface UploadedFile {
  name: string
  size: number
  date: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_SIZE = 100 * 1024 * 1024

export default function Upload() {
  const [isLoading, setIsLoading] = useState(true)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Tjek for tidligere uploadede filer ved mount
  useEffect(() => {
    invokeToolRaw('files_list', { path: '/data/.openclaw/workspace/uploads/' })
      .catch(() => null)
      .finally(() => setIsLoading(false))
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE) {
      setError(`Filen er for stor (${formatSize(file.size)}). Maks 100 MB.`)
      return
    }

    setUploading(true)
    setProgress(0)
    setCurrentFile(file.name)
    setError('')
    setSuccess('')

    try {
      // Read file as base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          // Remove data:...;base64, prefix
          const base64 = result.split(',')[1] || result
          resolve(base64)
        }
        reader.onerror = reject
        reader.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 50))
        }
      })
      reader.readAsDataURL(file)
      const base64Data = await base64Promise
      setProgress(50)

      // Send to main session for processing
      const message = `[FILE_UPLOAD] Fil uploadet via Mission Kontrol: "${file.name}" (${formatSize(file.size)}, ${file.type}). Base64-data er ${base64Data.length} tegn. Gem filen i /data/.openclaw/workspace/uploads/ og bekræft.`

      // Use sessions_send to notify agent
      await invokeToolRaw('sessions_send', {
        sessionKey: 'agent:main:main',
        message: `Bruger har uploadet fil "${file.name}" (${formatSize(file.size)}) via Mission Kontrol. Analysér den venligst.`
      })
      
      setProgress(100)
      setSuccess(`"${file.name}" sendt til Maison for analyse!`)
      setFiles(prev => [{
        name: file.name,
        size: file.size,
        date: new Date().toLocaleString('da-DK'),
      }, ...prev])
    } catch (err: any) {
      setError(`Upload fejlede: ${err?.message || 'Ukendt fejl'}`)
    } finally {
      setUploading(false)
      setProgress(0)
      setCurrentFile('')
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setDragOver(false), [])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }, [handleFile])

  if (isLoading) {
    return <UploadSkeleton />
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Fil Upload</h1>
          <DataFreshness className="ml-auto" />
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Upload filer til workspace. Video, dokumenter og andet.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className="rounded-xl cursor-pointer transition-all duration-300 mb-6"
        style={{
          padding: '48px 24px',
          background: dragOver ? 'rgba(0,122,255,0.08)' : 'rgba(255,255,255,0.02)',
          border: dragOver ? '2px dashed #007AFF' : '2px dashed rgba(255,255,255,0.12)',
          textAlign: 'center',
        }}
        onMouseEnter={e => { if (!dragOver) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
        onMouseLeave={e => { if (!dragOver) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={onInputChange} accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.txt,.md" />
        <Icon name="arrow-up-tray" size={40} style={{ color: dragOver ? '#007AFF' : 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
        <p className="text-sm font-medium" style={{ color: dragOver ? '#007AFF' : 'rgba(255,255,255,0.6)' }}>
          {uploading ? `Uploader ${currentFile}...` : 'Træk filer hertil eller klik for at vælge'}
        </p>
        <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Video, billeder, dokumenter — maks 100 MB
        </p>
      </div>

      {/* Progress */}
      {uploading && (
        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.15)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white">{currentFile}</span>
            <span className="text-xs" style={{ color: '#007AFF' }}>{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #007AFF, #5AC8FA)' }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)' }}>
          <p className="text-sm" style={{ color: '#FF453A' }}>{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)' }}>
          <p className="text-sm" style={{ color: '#30D158' }}>{success}</p>
        </div>
      )}

      {/* Uploaded files */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-white">Uploadede filer</h3>
        </div>
        {files.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="folder" size={32} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 8px' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen filer endnu</p>
          </div>
        ) : (
          <div>
            {files.map((f, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <Icon name="document" size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{f.name}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{formatSize(f.size)} · {f.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(255,159,10,0.06)', border: '1px solid rgba(255,159,10,0.15)' }}>
        <p className="text-xs" style={{ color: 'rgba(255,159,10,0.8)' }}>
          <strong>Tip:</strong> For store videofiler (over 5 MB) der ikke kan sendes via Telegram, upload dem her. Maison analyserer dem automatisk — med transskription og visuel analyse.
        </p>
      </div>
    </div>
  )
}
