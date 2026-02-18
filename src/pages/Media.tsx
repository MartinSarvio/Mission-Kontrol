import { useState, useEffect, useCallback } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { invokeToolRaw, runPrompt } from '../api/openclaw'
import { usePageTitle } from '../hooks/usePageTitle'

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

type Tab = 'gallery' | 'video' | 'image' | 'tts'

interface MediaFile {
  name: string
  path: string
  size: string
  modified: string
  type: 'video' | 'image' | 'audio'
}

interface VideoTemplate {
  id: string
  label: string
  file: string
}

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  createdAt: number
}

// ─────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────

const VIDEO_TEMPLATES: VideoTemplate[] = [
  { id: 'FlowAd', label: 'Flow Ad (standard)', file: 'FlowAd.tsx' },
  { id: 'FlowAdV5', label: 'Flow Ad V5', file: 'FlowAdV5.tsx' },
  { id: 'FlowAdV7', label: 'Flow Ad V7', file: 'FlowAdV7.tsx' },
  { id: 'FlowAdV7a', label: 'Flow Ad V7a', file: 'FlowAdV7a.tsx' },
  { id: 'FlowAdV7b', label: 'Flow Ad V7b', file: 'FlowAdV7b.tsx' },
  { id: 'FlowAdV7c', label: 'Flow Ad V7c', file: 'FlowAdV7c.tsx' },
  { id: 'FlowAdV7d', label: 'Flow Ad V7d', file: 'FlowAdV7d.tsx' },
  { id: 'FlowAdV8', label: 'Flow Ad V8', file: 'FlowAdV8.tsx' },
  { id: 'HoursLogoAnim', label: 'Hours Logo Animation', file: 'HoursLogoAnim.tsx' },
  { id: 'RestaurantAd', label: 'Restaurant Ad', file: 'RestaurantAd.tsx' },
  { id: 'RestaurantAdV2', label: 'Restaurant Ad V2', file: 'RestaurantAdV2.tsx' },
]

const IMAGE_SIZES = ['1024x1024', '1792x1024', '1024x1792']
const IMAGE_STYLES = ['vivid', 'natural']

// ─────────────────────────────────────────────────
// Inline style helpers
// ─────────────────────────────────────────────────

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
  transition: 'all 150ms',
  background: active ? 'rgba(0,122,255,0.2)' : 'transparent',
  color: active ? '#007AFF' : 'rgba(255,255,255,0.5)',
})

const primaryBtn = (disabled?: boolean): React.CSSProperties => ({
  minHeight: 40,
  background: disabled ? 'rgba(0,122,255,0.3)' : '#007AFF',
  color: '#fff',
  padding: '8px 18px',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 500,
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
})

const ghostBtn = (disabled?: boolean): React.CSSProperties => ({
  minHeight: 40,
  background: 'rgba(0,122,255,0.12)',
  color: '#007AFF',
  padding: '8px 14px',
  borderRadius: '12px',
  fontSize: '13px',
  fontWeight: 500,
  border: '1px solid rgba(0,122,255,0.25)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
})

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '8px 14px',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: 6,
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

// ─────────────────────────────────────────────────
// Gallery Section
// ─────────────────────────────────────────────────

function GallerySection() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadFiles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await invokeToolRaw('exec', {
        command: `ls -lh /data/.openclaw/workspace/video-generator/output/*.mp4 2>/dev/null || echo "TOM"`
      }) as any
      const text: string = result.result?.content?.[0]?.text || ''

      if (text.includes('TOM') || !text.trim()) {
        setFiles([])
        return
      }

      const lines = text.trim().split('\n').filter(Boolean)
      const parsed: MediaFile[] = []

      for (const line of lines) {
        // ls -lh format: -rw-r--r-- 1 root root 4.2M Feb 14 12:00 /path/to/file.mp4
        const match = line.match(/\S+\s+\S+\s+\S+\s+\S+\s+([\d.]+[KMGTP]?)\s+(\w+\s+\d+\s+[\d:]+)\s+(.+)$/)
        if (match) {
          const [, size, modified, fullPath] = match
          const name = fullPath.trim().split('/').pop() || fullPath.trim()
          const ext = name.split('.').pop()?.toLowerCase() || ''
          const type = ext === 'mp4' || ext === 'mov' || ext === 'webm' ? 'video'
            : ext === 'mp3' || ext === 'wav' || ext === 'ogg' ? 'audio'
            : 'image'
          parsed.push({ name, path: fullPath.trim(), size, modified, type })
        }
      }

      setFiles(parsed)
    } catch (e: any) {
      setError(e?.message || 'Kunne ikke hente mediefiler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadFiles() }, [loadFiles])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={loadFiles} style={ghostBtn(loading)} disabled={loading}>
          <Icon name="refresh" size={14} />
          Genindlæs
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.4)' }}>
          Henter mediefiler...
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,59,48,0.1)', color: '#FF3B30', fontSize: 13 }}>
          Fejl: {error}
        </div>
      )}

      {!loading && !error && files.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Icon name="play" size={40} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 12, display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Ingen mediefiler fundet</p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 4 }}>
            Generer en video eller et billede for at se det her
          </p>
        </div>
      )}

      {!loading && files.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {files.map(file => (
            <div
              key={file.path}
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.07)',
                overflow: 'hidden',
              }}
            >
              {/* Thumbnail placeholder */}
              <div style={{
                width: '100%',
                aspectRatio: '16/9',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon
                  name={file.type === 'video' ? 'play' : file.type === 'audio' ? 'megaphone' : 'sparkle'}
                  size={36}
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                  {file.name}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                  {file.size} · {file.modified}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────
// Video Generator Section
// ─────────────────────────────────────────────────

function VideoGeneratorSection() {
  const [selectedTemplate, setSelectedTemplate] = useState(VIDEO_TEMPLATES[0].id)
  const [outputName, setOutputName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#007AFF')
  const [secondaryColor, setSecondaryColor] = useState('#5856D6')
  const [titleText, setTitleText] = useState('')
  const [subtitleText, setSubtitleText] = useState('')
  const [duration, setDuration] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<{ type: 'idle' | 'running' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' })

  const handleGenerate = useCallback(async () => {
    const template = VIDEO_TEMPLATES.find(t => t.id === selectedTemplate)
    if (!template) return

    setIsGenerating(true)
    setStatus({ type: 'running', msg: 'Spawner render-agent...' })

    const outFile = outputName.trim()
      ? outputName.trim().replace(/\.mp4$/i, '') + '.mp4'
      : `${selectedTemplate.toLowerCase()}-${Date.now()}.mp4`

    const prompt = `Du er en video-render agent. Kør følgende Remotion render task:

Fil der skal renderes: ${template.file}
Komponentnavn: ${template.id}
Output: /data/.openclaw/workspace/video-generator/output/${outFile}
Duration (sekunder): ${duration}
Primærfarve: ${primaryColor}
Sekundærfarve: ${secondaryColor}
${titleText ? `Titel: ${titleText}` : ''}
${subtitleText ? `Undertitel: ${subtitleText}` : ''}

Kør kommandoen:
cd /data/.openclaw/workspace/video-generator && npx remotion render src/index.ts ${template.id} /data/.openclaw/workspace/video-generator/output/${outFile} --props='{"primaryColor":"${primaryColor}","secondaryColor":"${secondaryColor}","title":"${titleText}","subtitle":"${subtitleText}"}'

Rapporter om renderingen lykkedes.`

    try {
      const res = await runPrompt(prompt, 'sonnet')
      setStatus({
        type: 'success',
        msg: `Video-render startet. Session: ${res.sessionKey || 'ukendt'}. Tjek galleri om lidt.`,
      })
    } catch (e: any) {
      setStatus({ type: 'error', msg: e?.message || 'Ukendt fejl' })
    } finally {
      setIsGenerating(false)
    }
  }, [selectedTemplate, outputName, primaryColor, secondaryColor, titleText, subtitleText, duration])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Left: Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Template">
          <label style={labelStyle}>Vælg template</label>
          <select
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
            style={{ ...selectStyle, width: '100%' }}
            disabled={isGenerating}
          >
            {VIDEO_TEMPLATES.map(t => (
              <option key={t.id} value={t.id} style={{ background: '#0a0a0f' }}>
                {t.label}
              </option>
            ))}
          </select>
        </Card>

        <Card title="Parametre">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Output filnavn</label>
              <input
                type="text"
                value={outputName}
                onChange={e => setOutputName(e.target.value)}
                placeholder="min-video (automatisk hvis tom)"
                style={inputStyle}
                disabled={isGenerating}
              />
            </div>
            <div>
              <label style={labelStyle}>Titel</label>
              <input
                type="text"
                value={titleText}
                onChange={e => setTitleText(e.target.value)}
                placeholder="Overskrift i videoen"
                style={inputStyle}
                disabled={isGenerating}
              />
            </div>
            <div>
              <label style={labelStyle}>Undertitel</label>
              <input
                type="text"
                value={subtitleText}
                onChange={e => setSubtitleText(e.target.value)}
                placeholder="Undertekst i videoen"
                style={inputStyle}
                disabled={isGenerating}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Primærfarve</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    style={{ width: 40, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }}
                    disabled={isGenerating}
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    disabled={isGenerating}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Sekundærfarve</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    style={{ width: 40, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }}
                    disabled={isGenerating}
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Varighed: {duration} sekunder</label>
              <input
                type="range"
                min={3}
                max={60}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#007AFF' }}
                disabled={isGenerating}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                <span>3s</span><span>60s</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Right: Generate + Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Generer Video">
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            En sub-agent spawnes til at rendere videoen med Remotion. Renderingen kører i baggrunden — tjek galleri-fanen, når den er færdig.
          </p>

          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Oversigt
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Template:</span>
                <span>{VIDEO_TEMPLATES.find(t => t.id === selectedTemplate)?.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Varighed:</span>
                <span>{duration} sekunder</span>
              </div>
              {titleText && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Titel:</span>
                  <span style={{ maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleText}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Farver:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: primaryColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: secondaryColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={primaryBtn(isGenerating)}
          >
            {isGenerating ? (
              <>
                <Icon name="clock" size={16} />
                Genererer...
              </>
            ) : (
              <>
                <Icon name="play" size={16} />
                Generer Video
              </>
            )}
          </button>
        </Card>

        {status.type !== 'idle' && (
          <Card title="Status">
            <div style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: status.type === 'error'
                ? 'rgba(255,59,48,0.1)'
                : status.type === 'success'
                  ? 'rgba(52,199,89,0.1)'
                  : 'rgba(0,122,255,0.1)',
              border: `1px solid ${status.type === 'error' ? 'rgba(255,59,48,0.2)' : status.type === 'success' ? 'rgba(52,199,89,0.2)' : 'rgba(0,122,255,0.2)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Icon
                  name={status.type === 'error' ? 'exclamation-triangle' : status.type === 'success' ? 'check-circle' : 'clock'}
                  size={16}
                  style={{
                    color: status.type === 'error' ? '#FF3B30' : status.type === 'success' ? '#34C759' : '#007AFF',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <p style={{
                  fontSize: 13,
                  color: status.type === 'error' ? '#FF3B30' : status.type === 'success' ? '#34C759' : '#007AFF',
                  lineHeight: 1.5,
                  margin: 0,
                }}>
                  {status.msg}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card title="Om Video Generator">
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
            <p>• Bygget på Remotion + React + TypeScript</p>
            <p>• Templates er React-komponenter i video-generator/src/</p>
            <p>• Rendering sker via en sub-agent i baggrunden</p>
            <p>• Færdige videoer gemmes i video-generator/output/</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Image Generation Section
// ─────────────────────────────────────────────────

function ImageGenSection() {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState(IMAGE_SIZES[0])
  const [style, setStyle] = useState(IMAGE_STYLES[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)

  const handleGenerate = useCallback(async () => {
    const clean = prompt.trim()
    if (!clean) { setError('Skriv en beskrivelse af billedet'); return }

    setIsGenerating(true)
    setError('')

    try {
      const result = await invokeToolRaw('openai-image-gen', {
        prompt: clean,
        size,
        style,
        n: 1,
      }) as any

      const text = result.result?.content?.[0]?.text || ''
      let imageUrl = ''

      // Try to parse URL from result
      try {
        const parsed = JSON.parse(text)
        imageUrl = parsed.url || parsed.data?.[0]?.url || parsed.images?.[0] || ''
      } catch {
        // Try direct URL match
        const urlMatch = text.match(/https?:\/\/[^\s"]+/)
        if (urlMatch) imageUrl = urlMatch[0]
        // Try base64
        const b64Match = text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/)
        if (b64Match) imageUrl = b64Match[0]
      }

      if (!imageUrl) {
        // Fallback: show raw output as message
        setError(`Billedet blev genereret, men URL ikke fundet. Output: ${text.slice(0, 200)}`)
        return
      }

      const newImg: GeneratedImage = {
        id: `img-${Date.now()}`,
        url: imageUrl,
        prompt: clean,
        createdAt: Date.now(),
      }
      setImages(prev => [newImg, ...prev])
      setSelectedImage(newImg)
    } catch (e: any) {
      setError(e?.message || 'Kunne ikke generere billede')
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, size, style])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
      {/* Left: Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Billedprompt">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Beskriv billedet</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="En minimalistisk restaurant med skandinavisk design, bløde farver, dagslys..."
                style={{ ...inputStyle, height: 120, resize: 'vertical', fontFamily: 'inherit' }}
                disabled={isGenerating}
              />
            </div>

            <div>
              <label style={labelStyle}>Størrelse</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {IMAGE_SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 12,
                      cursor: 'pointer',
                      background: size === s ? 'rgba(0,122,255,0.2)' : 'rgba(255,255,255,0.06)',
                      color: size === s ? '#007AFF' : 'rgba(255,255,255,0.5)',
                      transition: 'all 150ms',
                    }}
                    disabled={isGenerating}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Stil</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {IMAGE_STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 12,
                      cursor: 'pointer',
                      background: style === s ? 'rgba(0,122,255,0.2)' : 'rgba(255,255,255,0.06)',
                      color: style === s ? '#007AFF' : 'rgba(255,255,255,0.5)',
                      transition: 'all 150ms',
                      textTransform: 'capitalize',
                    }}
                    disabled={isGenerating}
                  >
                    {s === 'vivid' ? 'Levende' : 'Naturlig'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,59,48,0.1)', color: '#FF3B30', fontSize: 12 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              style={primaryBtn(isGenerating || !prompt.trim())}
            >
              {isGenerating ? (
                <><Icon name="clock" size={16} /> Genererer...</>
              ) : (
                <><Icon name="sparkle" size={16} /> Generer Billede</>
              )}
            </button>
          </div>
        </Card>
      </div>

      {/* Right: Gallery */}
      <div>
        <Card
          title="Genererede Billeder"
          subtitle={images.length > 0 ? `${images.length} billede${images.length !== 1 ? 'r' : ''}` : 'Ingen billeder endnu'}
        >
          {images.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Icon name="sparkle" size={40} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 12, display: 'block' }} />
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                Generede billeder vises her
              </p>
            </div>
          ) : (
            <>
              {/* Selected image preview */}
              {selectedImage && (
                <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.prompt}
                    style={{ width: '100%', display: 'block', objectFit: 'cover' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)' }}>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineClamp: 2, overflow: 'hidden' }}>
                      {selectedImage.prompt}
                    </p>
                    <a
                      href={selectedImage.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: '#007AFF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}
                    >
                      <Icon name="download" size={12} />
                      Download
                    </a>
                  </div>
                </div>
              )}

              {/* Grid of thumbnails */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                {images.map(img => (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    style={{
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: selectedImage?.id === img.id
                        ? '2px solid #007AFF'
                        : '2px solid transparent',
                      transition: 'border-color 150ms',
                      aspectRatio: '1',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.prompt}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// TTS Section
// ─────────────────────────────────────────────────

function TTSSection() {
  const [text, setText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [audioFiles, setAudioFiles] = useState<{ id: string; text: string; path?: string; ts: number }[]>([])

  const handleGenerate = useCallback(async () => {
    const clean = text.trim()
    if (!clean) { setError('Skriv teksten der skal læses op'); return }

    setIsGenerating(true)
    setError('')

    try {
      const result = await invokeToolRaw('tts', { text: clean }) as any
      const resultText: string = result.result?.content?.[0]?.text || ''

      // Try to find a MEDIA: path or file path in the result
      const mediaMatch = resultText.match(/MEDIA:\s*(.+)/i)
      const pathMatch = resultText.match(/\/[^\s]+\.(mp3|wav|ogg|m4a)/i)
      const filePath = mediaMatch?.[1]?.trim() || pathMatch?.[0] || undefined

      setAudioFiles(prev => [{
        id: `tts-${Date.now()}`,
        text: clean,
        path: filePath,
        ts: Date.now(),
      }, ...prev])
    } catch (e: any) {
      setError(e?.message || 'Kunne ikke generere lyd')
    } finally {
      setIsGenerating(false)
    }
  }, [text])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Left: Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Tekst til Lyd">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Tekst der skal oplæses</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Skriv den tekst du vil omdanne til lyd..."
                style={{ ...inputStyle, height: 160, resize: 'vertical', fontFamily: 'inherit' }}
                disabled={isGenerating}
              />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                {text.length} tegn
              </p>
            </div>

            {error && (
              <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,59,48,0.1)', color: '#FF3B30', fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                style={primaryBtn(isGenerating || !text.trim())}
              >
                {isGenerating ? (
                  <><Icon name="clock" size={16} /> Genererer...</>
                ) : (
                  <><Icon name="megaphone" size={16} /> Generer Lyd</>
                )}
              </button>
              <button
                onClick={() => setText('')}
                disabled={isGenerating || !text}
                style={ghostBtn(isGenerating || !text)}
              >
                <Icon name="xmark" size={14} />
                Ryd
              </button>
            </div>
          </div>
        </Card>

        <Card title="Hurtige Skabeloner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Godmorgen! Her er dit daglige overblik fra Mission Kontrol.',
              'Alle systemer kører normalt. Ingen kritiske advarsler.',
              'Din nye opgave er klar til gennemgang. Tjek opgave-fanen for detaljer.',
            ].map((tpl, i) => (
              <div
                key={i}
                onClick={() => !isGenerating && setText(tpl)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.5,
                  opacity: isGenerating ? 0.5 : 1,
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => !isGenerating && ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)')}
              >
                {tpl}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right: Generated audio */}
      <div>
        <Card
          title="Genererede Lydfiler"
          subtitle={audioFiles.length > 0 ? `${audioFiles.length} fil${audioFiles.length !== 1 ? 'er' : ''}` : 'Ingen lydfiler endnu'}
        >
          {audioFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Icon name="megaphone" size={40} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 12, display: 'block' }} />
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                Genererede lydfiler vises her
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {audioFiles.map(af => (
                <div
                  key={af.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8, lineHeight: 1.5 }}>
                    {af.text.slice(0, 100)}{af.text.length > 100 ? '...' : ''}
                  </p>
                  {af.path ? (
                    <audio
                      controls
                      src={af.path}
                      style={{ width: '100%', height: 36, borderRadius: 8, accentColor: '#007AFF' }}
                    />
                  ) : (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                      Lyd genereret — ingen lokal fil (afspil via agent)
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
                    {new Date(af.ts).toLocaleTimeString('da-DK')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Main Media Page
// ─────────────────────────────────────────────────

export default function Media() {
  usePageTitle('Medier')

  const [activeTab, setActiveTab] = useState<Tab>('gallery')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'gallery', label: 'Galleri', icon: 'grid' },
    { id: 'video', label: 'Video Generator', icon: 'play' },
    { id: 'image', label: 'Billedgenerering', icon: 'sparkle' },
    { id: 'tts', label: 'Lyd / TTS', icon: 'megaphone' },
  ]

  return (
    <div>
      <PageHeader
        title="Medier"
        description="Generer og administrer videoer, billeder og lyd"
        breadcrumb={[{ label: 'Dashboard', href: '#dashboard' }, { label: 'Medier' }]}
      />

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          padding: '4px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          width: 'fit-content',
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={tabStyle(activeTab === tab.id)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name={tab.icon} size={14} />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'gallery' && <GallerySection />}
      {activeTab === 'video' && <VideoGeneratorSection />}
      {activeTab === 'image' && <ImageGenSection />}
      {activeTab === 'tts' && <TTSSection />}
    </div>
  )
}
