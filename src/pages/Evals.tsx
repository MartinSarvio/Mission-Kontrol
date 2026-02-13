import { useState } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import { invokeToolRaw } from '../api/openclaw'

interface Eval {
  id: string
  name: string
  prompt: string
  category: string
}

const EXAMPLE_EVALS: Eval[] = [
  {
    id: 'code-review',
    name: 'Code Review Kvalitet',
    prompt: 'Gennemgå følgende TypeScript kode og giv konstruktiv feedback på læsbarhed, performance og best practices:\n\n```typescript\nfunction fibonacci(n: number): number {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n```\n\nVurder svar på: Konstruktiv tone, korrekt analyse, anvendelige forslag.',
    category: 'Kodekvalitet'
  },
  {
    id: 'research',
    name: 'Research Dybde',
    prompt: 'Lav et research om AI agents i restaurant industrien. Find mindst 3 konkrete use cases med kilder.\n\nVurder svar på: Antal kilder, relevans, dybde af analyse.',
    category: 'Research'
  },
  {
    id: 'dansk-tone',
    name: 'Dansk Tone & Sprog',
    prompt: 'Forklar hvad en REST API er på dansk til en ikke-teknisk person.\n\nVurder svar på: Korrekt dansk, forståelig tone, ingen teknisk jargon.',
    category: 'Kommunikation'
  },
]

export default function Evals() {
  const [selectedEval, setSelectedEval] = useState<Eval | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isRunningAll, setIsRunningAll] = useState(false)
  const [results, setResults] = useState<Record<string, any>>({})

  const runEvaluation = async (evalItem: Eval) => {
    setIsRunning(true)
    try {
      const result = await invokeToolRaw('sessions_spawn', { 
        task: evalItem.prompt,
        label: `eval:${evalItem.id}`
      }) as any
      
      setResults(prev => ({
        ...prev,
        [evalItem.id]: {
          status: 'success',
          sessionKey: result?.result?.sessionKey || 'N/A',
          timestamp: new Date().toISOString()
        }
      }))
    } catch (err) {
      console.error('Eval failed:', err)
      setResults(prev => ({
        ...prev,
        [evalItem.id]: {
          status: 'error',
          error: err instanceof Error ? err.message : 'Ukendt fejl',
          timestamp: new Date().toISOString()
        }
      }))
    } finally {
      setIsRunning(false)
    }
  }

  const runAllEvaluations = async () => {
    setIsRunningAll(true)
    for (const evalItem of EXAMPLE_EVALS) {
      await runEvaluation(evalItem)
      // Short delay between spawns
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    setIsRunningAll(false)
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Evalueringer</h1>
      <p className="caption mb-6">
        Evalueringsdatasæt og kvalitetssporing · {EXAMPLE_EVALS.length} test cases
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <button 
          onClick={() => selectedEval && runEvaluation(selectedEval)}
          disabled={!selectedEval || isRunning || isRunningAll}
          style={{ 
            minHeight: '44px', 
            background: !selectedEval || isRunning || isRunningAll ? 'rgba(0,122,255,0.4)' : '#007AFF', 
            color: '#fff', 
            padding: '8px 16px', 
            borderRadius: '12px', 
            fontSize: '14px', 
            fontWeight: 500, 
            border: 'none', 
            cursor: !selectedEval || isRunning || isRunningAll ? 'not-allowed' : 'pointer',
            opacity: !selectedEval ? 0.5 : 1
          }}
        >
          {isRunning ? 'Kører...' : 'Kør Evaluering'}
        </button>
        <button 
          onClick={runAllEvaluations}
          disabled={isRunningAll || isRunning}
          style={{ 
            minHeight: '44px', 
            background: isRunningAll || isRunning ? 'rgba(0,122,255,0.05)' : 'rgba(0,122,255,0.1)', 
            color: '#007AFF', 
            padding: '8px 16px', 
            borderRadius: '12px', 
            fontSize: '14px', 
            fontWeight: 500, 
            border: '1px solid rgba(0,122,255,0.2)', 
            cursor: isRunningAll || isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {isRunningAll ? 'Kører Alle...' : 'Kør Alle'}
        </button>
      </div>

      <div className="space-y-3">
        {EXAMPLE_EVALS.map(evalItem => {
          const result = results[evalItem.id]
          const isSelected = selectedEval?.id === evalItem.id

          return (
            <Card key={evalItem.id}>
              <div 
                className="cursor-pointer"
                onClick={() => setSelectedEval(evalItem)}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: isSelected ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.06)',
                        border: isSelected ? '2px solid #007AFF' : 'none'
                      }}
                    >
                      <Icon 
                        name="gauge" 
                        size={20} 
                        style={{ color: isSelected ? '#007AFF' : 'rgba(255,255,255,0.4)' }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold">{evalItem.name}</p>
                        <span 
                          className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{ 
                            background: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.4)'
                          }}
                        >
                          {evalItem.category}
                        </span>
                      </div>
                      <p className="caption line-clamp-2 mb-2">{evalItem.prompt}</p>
                      
                      {result && (
                        <div className="mt-2 p-2 rounded-lg text-xs" style={{ 
                          background: result.status === 'success' 
                            ? 'rgba(52,199,89,0.08)' 
                            : 'rgba(255,59,48,0.08)',
                          border: `1px solid ${result.status === 'success' 
                            ? 'rgba(52,199,89,0.2)' 
                            : 'rgba(255,59,48,0.2)'}`
                        }}>
                          <div className="flex items-center gap-2">
                            <span style={{ 
                              color: result.status === 'success' ? '#34C759' : '#FF3B30' 
                            }}>
                              {result.status === 'success' ? '✓' : '✗'}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                              {result.status === 'success' 
                                ? `Session: ${result.sessionKey}` 
                                : `Fejl: ${result.error}`}
                            </span>
                          </div>
                          <p className="mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {new Date(result.timestamp).toLocaleString('da-DK')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Icon 
                    name="chevron-right" 
                    size={16} 
                    className="text-white/30 flex-shrink-0" 
                  />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {EXAMPLE_EVALS.length === 0 && (
        <Card>
          <div className="text-center py-16 px-4">
            <Icon name="gauge" size={40} className="text-white/30 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Ingen evalueringer endnu
            </p>
            <p className="caption max-w-md mx-auto">
              Evalueringer giver dig mulighed for at måle agentkvalitet over tid med standardiserede testdatasæt.
              Opret et datasæt og kør din første evaluering for at komme i gang.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
