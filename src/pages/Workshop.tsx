import { useState, useMemo, useEffect, useCallback, type KeyboardEvent } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { runPrompt } from '../api/openclaw'
import { usePageTitle } from '../hooks/usePageTitle'
import { WorkshopSkeleton } from '../components/SkeletonLoader'
import DataFreshness from '../components/DataFreshness'

const HISTORY_KEY = 'mk-workshop-history'
const HISTORY_LIMIT = 10

type PromptHistoryItem = {
  text: string
  ts: number
}

function loadHistory(): PromptHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x: any) => x && typeof x.text === 'string')
      .map((x: any) => ({ text: String(x.text), ts: typeof x.ts === 'number' ? x.ts : Date.now() }))
      .slice(0, HISTORY_LIMIT)
  } catch {
    return []
  }
}

function saveHistory(items: PromptHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)))
  } catch {
    // ignore
  }
}

export default function Workshop() {
  usePageTitle('Værksted')

  const { gatewayConfig, isLoading, skills } = useLiveData() as any
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<PromptHistoryItem[]>([])

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const persistHistory = useCallback((next: PromptHistoryItem[]) => {
    setHistory(next)
    saveHistory(next)
  }, [])

  const addToHistory = useCallback((text: string) => {
    const clean = text.trim()
    if (!clean) return
    const next: PromptHistoryItem[] = [
      { text: clean, ts: Date.now() },
      ...history.filter(h => h.text !== clean),
    ].slice(0, HISTORY_LIMIT)
    persistHistory(next)
  }, [history, persistHistory])

  const clearHistory = useCallback(() => {
    persistHistory([])
  }, [persistHistory])

  // Hent modeller fra config eller hardcode kendte modeller
  const availableModels = useMemo(() => {
    const configModels = gatewayConfig?.models || []
    if (configModels.length > 0) return configModels

    // Fallback til kendte modeller
    return [
      'claude-opus-4-6',
      'claude-sonnet-4-5',
      'claude-opus-4-5',
      'claude-haiku-4-5'
    ]
  }, [gatewayConfig])

  // Sæt default model
  useEffect(() => {
    if (!selectedModel && availableModels.length > 0) {
      setSelectedModel(availableModels[0])
    }
  }, [availableModels, selectedModel])

  const handleRun = useCallback(async () => {
    const clean = prompt.trim()
    if (!clean) {
      setError('Indtast en prompt')
      return
    }

    addToHistory(clean)

    setIsRunning(true)
    setError('')
    setOutput('Spawner sub-agent og kører prompt...')

    try {
      const res = await runPrompt(clean, selectedModel || undefined)
      setOutput(res.result || 'Prompt kørt succesfuldt — session: ' + res.sessionKey)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ukendt fejl'
      setError(errorMsg)
      setOutput('')
    } finally {
      setIsRunning(false)
    }
  }, [addToHistory, prompt, selectedModel])

  const handleTextareaKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return
    if (!(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    if (isRunning) return
    if (!prompt.trim()) return
    void handleRun()
  }, [handleRun, isRunning, prompt])

  // Skabeloner (kunne udvides til at gemme i localStorage eller backend)
  const templates = [
    {
      id: 'websearch',
      name: 'Websøgning',
      prompt: 'Lav et deep research om: [EMNE]\n\nBrug Perplexity til at finde de seneste kilder og opsummer resultatet.'
    },
    {
      id: 'codereview',
      name: 'Code Review',
      prompt: 'Gennemgå følgende kode og giv feedback på:\n- Læsbarhed\n- Performance\n- Best practices\n\n```\n[KØD]\n```'
    },
    {
      id: 'summarize',
      name: 'Opsummer Dokument',
      prompt: 'Læs følgende dokument og lav en koncis opsummering med key takeaways:\n\n[DOKUMENT]'
    }
  ]

  const fallbackSkills = useMemo(() => (
    [
      { name: 'perplexity', description: 'Websøgning via Sonar Pro', status: 'Installeret' },
      { name: 'youtube-watcher', description: 'Video-transskriptioner', status: 'Installeret' },
    ]
  ), [])

  const liveSkills = useMemo(() => {
    if (Array.isArray(skills) && skills.length > 0) {
      return skills.map((s: any) => ({
        name: s?.name || 'ukendt',
        description: s?.description || 'Ingen beskrivelse',
        status: 'Installeret',
      }))
    }
    return fallbackSkills
  }, [skills, fallbackSkills])

  if (isLoading) {
    return <WorkshopSkeleton />
  }

  return (
    <div>
      <PageHeader
        title="Værksted"
        description="Prompt-legeplads og workflow-test"
        breadcrumb={[{ label: 'Dashboard', href: '#dashboard' }, { label: 'Værksted' }]}
        actions={<DataFreshness />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <Card title="Prompt Editor">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Skriv din prompt her... Sub-agent spawnes og kører opgaven."
              className="w-full h-64 resize-none font-mono text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '12px', padding: '12px', outline: 'none' }}
              disabled={isRunning}
            />
            <div className="mt-2 flex items-center gap-8" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Icon name="command" size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
                </span>
                <span>Tip: Tryk Ctrl+Enter (Cmd+Enter på Mac) for at køre</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
              <button
                onClick={handleRun}
                disabled={isRunning || !prompt.trim()}
                style={{
                  minHeight: '44px', background: '#007AFF', color: '#fff', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: 'none',
                  opacity: (isRunning || !prompt.trim()) ? 0.5 : 1,
                  cursor: (isRunning || !prompt.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {isRunning ? 'Kører...' : 'Kør Prompt'}
              </button>

              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="text-sm"
                style={{ minHeight: '44px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '12px', padding: '8px 16px', outline: 'none', cursor: 'pointer' }}
                disabled={isRunning}
              >
                {availableModels.map((m: any) => (
                  <option key={m} value={m} style={{ background: '#0a0a0f', color: 'rgba(255,255,255,0.9)' }}>{m}</option>
                ))}
              </select>

              <button
                onClick={() => setPrompt('')}
                style={{ minHeight: '44px', background: 'rgba(0,122,255,0.15)', color: '#007AFF', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(0,122,255,0.3)', cursor: 'pointer', opacity: isRunning ? 0.5 : 1 }}
                disabled={isRunning}
              >
                Nulstil
              </button>
            </div>
          </Card>

          <Card title="Output">
            {error && (
              <div className="rounded-xl p-4 mb-3 text-sm" style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}>
                Fejl: {error}
              </div>
            )}
            <div
              className="rounded-xl p-4 min-h-[120px] max-h-[400px] overflow-y-auto text-sm font-mono whitespace-pre-wrap"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: output ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'
              }}
            >
              {output || 'Kør en prompt for at se output her...'}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card
            title="Historik"
            subtitle={history.length > 0 ? `${history.length} seneste` : 'Ingen gemte prompts'}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-8" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Icon name="clock" size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  </span>
                  <span>Klik for at genindlæse</span>
                </span>
              </div>

              <button
                onClick={clearHistory}
                disabled={history.length === 0}
                style={{
                  minHeight: '36px',
                  background: 'rgba(255,59,48,0.12)',
                  color: '#FF3B30',
                  padding: '6px 10px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid rgba(255,59,48,0.25)',
                  cursor: history.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: history.length === 0 ? 0.5 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Icon name="xmark" size={14} style={{ color: '#FF3B30' }} />
                Ryd historik
              </button>
            </div>

            {history.length === 0 ? (
              <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Din prompt-historik gemmes automatisk lokalt, når du kører en prompt.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div
                    key={`${h.ts}-${i}`}
                    onClick={() => !isRunning && setPrompt(h.text)}
                    className="p-3 rounded-xl cursor-pointer transition-all hover:bg-white/10"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      minHeight: '44px',
                      opacity: isRunning ? 0.5 : 1,
                      cursor: isRunning ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <p className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.92)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.text}
                    </p>
                    <p className="mt-1" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Klik for at indsætte</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Skabeloner" subtitle={`${templates.length} tilgængelige`}>
            <div className="space-y-2">
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => !isRunning && setPrompt(t.prompt)}
                  className="p-3 rounded-xl cursor-pointer transition-all hover:bg-white/10"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    minHeight: '44px',
                    opacity: isRunning ? 0.5 : 1,
                    cursor: isRunning ? 'not-allowed' : 'pointer'
                  }}
                >
                  <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.92)' }}>{t.name}</p>
                  <p className="mt-1" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Klik for at indsætte</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Installerede Færdigheder" subtitle={`${liveSkills.length} fundet`}>
            <div className="space-y-2">
              {liveSkills.map((s: any, i: number) => (
                <div key={i} className="flex flex-col gap-1 py-2 glass-row text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium font-mono" style={{ color: 'rgba(255,255,255,0.92)' }}>{s.name}</span>
                    <span
                      className="px-2 py-0.5 rounded-lg text-[11px]"
                      style={{ background: 'rgba(52,199,89,0.1)', color: '#34C759' }}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>{s.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Info">
            <div className="text-xs space-y-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <p>• runPrompt() spawner en sub-agent</p>
              <p>• Sub-agent kører prompten isoleret</p>
              <p>• Output returneres når færdig</p>
              <p>• Brug [PLADSHOLDERE] til variabler</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
