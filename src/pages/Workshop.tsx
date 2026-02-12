import { useState, useMemo } from 'react'
import Card from '../components/Card'
import { useLiveData } from '../api/LiveDataContext'
import { runPrompt } from '../api/openclaw'

export default function Workshop() {
  const { gatewayConfig, isLoading } = useLiveData()
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState('')

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
  if (!selectedModel && availableModels.length > 0) {
    setSelectedModel(availableModels[0])
  }

  const handleRun = async () => {
    if (!prompt.trim()) {
      setError('Indtast en prompt')
      return
    }

    setIsRunning(true)
    setError('')
    setOutput('Spawner sub-agent og kører prompt...')

    try {
      const res = await runPrompt(prompt, selectedModel || undefined)
      setOutput(res.result || 'Prompt kørt succesfuldt — session: ' + res.sessionKey)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ukendt fejl'
      setError(errorMsg)
      setOutput('')
    } finally {
      setIsRunning(false)
    }
  }

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

  if (isLoading) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Værksted</h1>
        <p className="caption mb-6">Indlæser...</p>
        <Card>
          <p className="text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Indlæser data...</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Værksted</h1>
      <p className="caption mb-6">Prompt-legeplads og workflow-test</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <Card title="Prompt Editor">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Skriv din prompt her... Sub-agent spawnes og kører opgaven."
              className="w-full h-64 input resize-none font-mono text-sm"
              disabled={isRunning}
            />
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
                className="input text-sm" 
                style={{ minHeight: '44px' }}
                disabled={isRunning}
              >
                {availableModels.map((m: any) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <button 
                onClick={() => setPrompt('')}
                style={{ minHeight: '44px', background: 'rgba(0,122,255,0.1)', color: '#007AFF', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(0,122,255,0.2)', cursor: 'pointer' }}
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
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="caption mt-1">Klik for at indsætte</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Installerede Færdigheder">
            <div className="space-y-2">
              {[
                { name: 'perplexity', desc: 'Websøgning via Sonar Pro', status: 'Aktiv' },
                { name: 'youtube-watcher', desc: 'Video-transskriptioner', status: 'Aktiv' },
              ].map((s, i) => (
                <div key={i} className="flex flex-col gap-1 py-2 glass-row text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium font-mono">{s.name}</span>
                    <span 
                      className="px-2 py-0.5 rounded-lg text-[11px]" 
                      style={{ background: 'rgba(52,199,89,0.1)', color: '#34C759' }}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="caption">{s.desc}</p>
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
