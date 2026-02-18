import { useEffect, useState } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import { invokeToolRaw } from '../api/openclaw'
import { usePageTitle } from '../hooks/usePageTitle'
import { EvalsSkeleton } from '../components/SkeletonLoader'
import DataFreshness from '../components/DataFreshness'

interface Eval {
  id: string
  name: string
  prompt: string
  category: string
}

export default function Evals() {
  usePageTitle('Evalueringer')
  
  const [evals, setEvals] = useState<Eval[]>([])
  const [isLoadingEvals, setIsLoadingEvals] = useState(true)
  const [evalsError, setEvalsError] = useState<string | null>(null)

  const [selectedEval, setSelectedEval] = useState<Eval | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isRunningAll, setIsRunningAll] = useState(false)
  const [results, setResults] = useState<Record<string, any>>({})

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoadingEvals(true)
      setEvalsError(null)
      try {
        const res = await fetch('/evals-suite.json', { cache: 'no-cache' })
        if (!res.ok) throw new Error(`Kunne ikke hente eval-suite (HTTP ${res.status})`)
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error('Ugyldigt eval-suite format (forventede en liste)')

        const parsed: Eval[] = data
          .filter(Boolean)
          .map((e: any) => ({
            id: String(e.id ?? ''),
            name: String(e.name ?? ''),
            prompt: String(e.prompt ?? ''),
            category: String(e.category ?? '')
          }))
          .filter(e => e.id && e.name && e.prompt)

        if (cancelled) return
        setEvals(parsed)
        setSelectedEval(prev => {
          if (!prev) return parsed[0] ?? null
          return parsed.find(e => e.id === prev.id) ?? (parsed[0] ?? null)
        })
      } catch (err) {
        console.error('Failed to load eval suite:', err)
        if (cancelled) return
        setEvals([])
        setSelectedEval(null)
        setEvalsError(err instanceof Error ? err.message : 'Kunne ikke hente eval-suite')
      } finally {
        if (!cancelled) setIsLoadingEvals(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

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
    for (const evalItem of evals) {
      await runEvaluation(evalItem)
      // Short delay between spawns
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    setIsRunningAll(false)
  }

  return (
    <div className="animate-page-in">
      <PageHeader
        title="Evalueringer"
        description={`Evalueringsdatasæt og kvalitetssporing · ${evals.length} test cases`}
        breadcrumb={[{ label: 'Dashboard', href: '#dashboard' }, { label: 'Evalueringer' }]}
        actions={<DataFreshness />}
      />

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

      {isLoadingEvals && <EvalsSkeleton />}

      {evalsError && (
        <Card>
          <div className="text-center py-12 px-4">
            <Icon name="exclamation-triangle" size={40} className="text-red-400 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Kunne ikke indlæse evalueringer
            </p>
            <p className="caption max-w-md mx-auto mb-4">{evalsError}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                minHeight: '44px',
                background: '#007AFF',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Prøv igen
            </button>
          </div>
        </Card>
      )}

      {!isLoadingEvals && !evalsError && evals.length > 0 && (
        <div className="space-y-3">
          {evals.map((evalItem, evalIdx) => {
            const result = results[evalItem.id]
            const isSelected = selectedEval?.id === evalItem.id

            return (
              <Card key={evalItem.id} style={{ animationDelay: `${evalIdx * 50}ms` }}>
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
      )}

      {!isLoadingEvals && !evalsError && evals.length === 0 && (
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
