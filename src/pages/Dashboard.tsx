import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import ConnectionStatus from '../components/ConnectionStatus'
import DataFreshness from '../components/DataFreshness'
import { DashboardSkeleton } from '../components/SkeletonLoader'
import { useLiveData } from '../api/LiveDataContext'
import { fetchSystemInfo } from '../api/openclaw'
import { usePageTitle } from '../hooks/usePageTitle'
import { useResourceHistory } from '../hooks/useResourceHistory'

// Dashboard-widgets
import StatCards from '../components/dashboard/StatCards'
import SystemPuls from '../components/dashboard/SystemPuls'
import HurtigeHandlinger from '../components/dashboard/HurtigeHandlinger'
import DagensForbrug from '../components/dashboard/DagensForbrug'
import SystemhelbRed from '../components/dashboard/SystemhelbRed'
import SystemInfoGrid from '../components/dashboard/SystemInfoGrid'
import KanalerOgJobs from '../components/dashboard/KanalerOgJobs'
import LiveAktivitetOgSessioner from '../components/dashboard/LiveAktivitetOgSessioner'
import QuickActions from '../components/dashboard/QuickActions'
import RecentActivity from '../components/dashboard/RecentActivity'

import { parseStatusText, deriveChannelsFromConfig, getTimeGreeting } from '../components/dashboard/utils'
import type { SystemInfo } from '../components/dashboard/types'

// ── Drag & Drop Layout ───────────────────────────────────────────
const LAYOUT_KEY = 'mk-dashboard-layout'

const DEFAULT_WIDGET_ORDER = [
  'stat-cards',
  'system-puls',
  'hurtige-handlinger',
  'dagens-forbrug',
  'systemhelb-red',
  'system-info-grid',
  'kanaler-og-jobs',
  'live-aktivitet',
  'quick-actions',
  'recent-activity',
]

function loadLayout(): string[] {
  try {
    const stored = localStorage.getItem(LAYOUT_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      // Validate: must contain all default widgets (handles new widgets added later)
      const valid = DEFAULT_WIDGET_ORDER.every(id => parsed.includes(id))
      if (valid && parsed.length === DEFAULT_WIDGET_ORDER.length) return parsed
    }
  } catch {
    // ignore parse errors
  }
  return [...DEFAULT_WIDGET_ORDER]
}

function saveLayout(order: string[]) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(order))
  } catch {
    // ignore storage errors
  }
}

export default function Dashboard() {
  usePageTitle('Dashboard')

  const {
    isConnected, isLoading, error, lastUpdated,
    consecutiveErrors, sessions, statusText, cronJobs, gatewayConfig,
  } = useLiveData()

  const [systemInfo, setSystemInfo] = useState<SystemInfo>({})
  const [minuteTick, setMinuteTick] = useState(() => Math.floor(Date.now() / 60000))

  // ── Drag & Drop state ────────────────────────────────────────────
  const [widgetOrder, setWidgetOrder] = useState<string[]>(loadLayout)
  const draggedId = useRef<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = useCallback((id: string) => {
    draggedId.current = id
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedId.current && draggedId.current !== id) {
      setDropTargetId(id)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the widget entirely (not a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTargetId(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = draggedId.current
    if (!sourceId || sourceId === targetId) return

    setWidgetOrder(prev => {
      const next = [...prev]
      const fromIdx = next.indexOf(sourceId)
      const toIdx = next.indexOf(targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, sourceId)
      saveLayout(next)
      return next
    })

    setDropTargetId(null)
    draggedId.current = null
    setIsDragging(false)
  }, [])

  const handleDragEnd = useCallback(() => {
    draggedId.current = null
    setDropTargetId(null)
    setIsDragging(false)
  }, [])

  const handleResetLayout = useCallback(() => {
    const defaultOrder = [...DEFAULT_WIDGET_ORDER]
    setWidgetOrder(defaultOrder)
    saveLayout(defaultOrder)
  }, [])

  // ── Opdater hilsen hvert minut ───────────────────────────────────
  useEffect(() => {
    const now = Date.now()
    const msToNextMinute = 60000 - (now % 60000)
    let intervalId: ReturnType<typeof setInterval>
    const timeoutId = setTimeout(() => {
      setMinuteTick(Math.floor(Date.now() / 60000))
      intervalId = setInterval(() => setMinuteTick(Math.floor(Date.now() / 60000)), 60000)
    }, msToNextMinute)
    return () => { clearTimeout(timeoutId); clearInterval(intervalId) }
  }, [])

  const greeting = useMemo(() => getTimeGreeting(), [minuteTick])

  useEffect(() => {
    if (isConnected) {
      fetchSystemInfo().then(info => setSystemInfo(info || {})).catch(() => {})
    }
  }, [isConnected])

  const handleReload = useCallback(() => { window.location.reload() }, [])

  // ── Tidlig retur: indlæser ───────────────────────────────────────
  if (isLoading && sessions.length === 0) {
    return <DashboardSkeleton />
  }

  if (error && !isConnected && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-white/70 mb-2">Kunne ikke hente data</p>
          <p className="text-sm text-white/40 mb-4">{error}</p>
          <button
            onClick={handleReload}
            style={{ background: '#007AFF', color: '#fff', padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            Prøv igen
          </button>
        </div>
      </div>
    )
  }

  // ── Afledte værdier ──────────────────────────────────────────────
  const parsedStatus = useMemo(
    () => (statusText ? parseStatusText(statusText) : {}),
    [statusText]
  )

  const channels = useMemo(
    () => (gatewayConfig ? deriveChannelsFromConfig(gatewayConfig as Record<string, unknown>) : []),
    [gatewayConfig]
  )

  const { runningCount, completedCount } = useMemo(() => {
    const now = Date.now()
    return {
      runningCount:   sessions.filter(s => (now - s.updatedAt) < 120000).length,
      completedCount: sessions.filter(s => (now - s.updatedAt) >= 120000).length,
    }
  }, [sessions])

  const cronActiveCount = useMemo(
    () => cronJobs.filter((j: { enabled?: boolean }) => j.enabled !== false).length,
    [cronJobs]
  )

  const ramPct = useMemo(() => {
    return systemInfo.ramUsed && systemInfo.ramTotal
      ? Math.round((parseFloat(systemInfo.ramUsed) / parseFloat(systemInfo.ramTotal)) * 100)
      : null
  }, [systemInfo.ramUsed, systemInfo.ramTotal])

  const diskPctValue = systemInfo.diskPercent ?? null

  const { ramHistory, diskHistory } = useResourceHistory(ramPct, diskPctValue)

  const dailySpend = useMemo(() => {
    const today = new Date()
    const isSameLocalDay = (ts: number) => {
      const d = new Date(ts)
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      )
    }

    const extractInOut = (s: Record<string, unknown>): { input: number; output: number } | null => {
      const directIn  = (s?.inputTokens ?? s?.promptTokens ?? s?.tokensIn ?? s?.inTokens) as number | undefined
      const directOut = (s?.outputTokens ?? s?.completionTokens ?? s?.tokensOut ?? s?.outTokens) as number | undefined
      if (Number.isFinite(directIn) && Number.isFinite(directOut)) {
        return { input: Number(directIn), output: Number(directOut) }
      }
      const usage = s?.usage as Record<string, unknown> | undefined
      const usageIn  = (usage?.input_tokens ?? usage?.prompt_tokens ?? usage?.inputTokens) as number | undefined
      const usageOut = (usage?.output_tokens ?? usage?.completion_tokens ?? usage?.outputTokens) as number | undefined
      if (Number.isFinite(usageIn) && Number.isFinite(usageOut)) {
        return { input: Number(usageIn), output: Number(usageOut) }
      }
      return null
    }

    let totalInput = 0, totalOutput = 0, rowsWithTokens = 0
    for (const s of sessions as unknown as Record<string, unknown>[]) {
      if (!s?.updatedAt || !isSameLocalDay(s.updatedAt as number)) continue
      const io = extractInOut(s)
      if (!io) continue
      rowsWithTokens++
      totalInput  += io.input
      totalOutput += io.output
    }

    if (rowsWithTokens === 0) return { hasData: false, dkk: 0, inputTokens: 0, outputTokens: 0 }
    const usd = (totalInput / 1_000_000 * 15) + (totalOutput / 1_000_000 * 75)
    return { hasData: true, dkk: usd * 7, inputTokens: totalInput, outputTokens: totalOutput }
  }, [sessions])

  const { tokensValue, formattedCost, tokensIn, tokensOut, costUSD } = useMemo(() => {
    const tokensText = parsedStatus.tokens || '0 in / 0 out'

    function parseTokenValue(val: string): number {
      const match = val.match(/([\d.]+)([kM]?)/)
      if (!match) return 0
      const num = parseFloat(match[1])
      if (match[2] === 'M') return num * 1_000_000
      if (match[2] === 'k') return num * 1_000
      return num
    }

    const inMatch  = tokensText.match(/([\d.]+[kM]?)\s*in/)
    const outMatch = tokensText.match(/([\d.]+[kM]?)\s*out/)
    const tIn  = inMatch  ? parseTokenValue(inMatch[1])  : 0
    const tOut = outMatch ? parseTokenValue(outMatch[1]) : 0

    const cUSD = (tIn / 1_000_000 * 15) + (tOut / 1_000_000 * 75)
    const cDKK = cUSD * 7
    const fCost = cDKK < 1 ? `${(cDKK * 100).toFixed(0)} øre` : `${cDKK.toFixed(2)} kr`

    return {
      tokensValue:   inMatch ? inMatch[1] : '0',
      formattedCost: fCost,
      tokensIn:  tIn,
      tokensOut: tOut,
      costUSD:   cUSD,
    }
  }, [parsedStatus.tokens])

  // ── Widget render map ────────────────────────────────────────────
  const widgetMap: Record<string, React.ReactNode> = {
    'stat-cards': (
      <StatCards
        sessionsCount={sessions.length}
        runningCount={runningCount}
        completedCount={completedCount}
        tokensValue={tokensValue}
        parsedTokens={parsedStatus.tokens || ''}
        parsedModel={parsedStatus.model || ''}
        parsedContext={parsedStatus.context || ''}
        dailySpend={dailySpend}
        cronActiveCount={cronActiveCount}
        cronJobsTotal={cronJobs.length}
      />
    ),
    'system-puls': <SystemPuls />,
    'hurtige-handlinger': <HurtigeHandlinger />,
    'dagens-forbrug': <DagensForbrug sessions={sessions} />,
    'systemhelb-red': (
      <SystemhelbRed
        systemInfo={systemInfo}
        ramPct={ramPct}
        diskPctValue={diskPctValue}
        ramHistory={ramHistory}
        diskHistory={diskHistory}
        consecutiveErrors={consecutiveErrors}
      />
    ),
    'system-info-grid': (
      <SystemInfoGrid
        parsedStatus={parsedStatus}
        systemInfo={systemInfo}
        runningCount={runningCount}
        completedCount={completedCount}
        formattedCost={formattedCost}
        tokensIn={tokensIn}
        tokensOut={tokensOut}
        costUSD={costUSD}
      />
    ),
    'kanaler-og-jobs': (
      <KanalerOgJobs
        channels={channels}
        cronJobs={cronJobs}
        cronActiveCount={cronActiveCount}
      />
    ),
    'live-aktivitet': <LiveAktivitetOgSessioner sessions={sessions} />,
    'quick-actions': (
      <QuickActions
        onHealthcheck={() => {
          fetchSystemInfo().then(info => setSystemInfo(info || {})).catch(() => {})
        }}
      />
    ),
    'recent-activity': <RecentActivity sessions={sessions} cronJobs={cronJobs} />,
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="animate-page-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold text-white">{greeting}</h1>
        <ConnectionStatus />
        {!isConnected && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-orange-400"
            style={{ background: 'rgba(255,149,0,0.1)' }}
          >
            Ikke forbundet
          </span>
        )}
        <DataFreshness className="ml-auto" />

        {/* Reset layout knap */}
        <button
          onClick={handleResetLayout}
          title="Nulstil widget-rækkefølge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.55)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.background = 'rgba(255,255,255,0.1)'
            el.style.color = 'rgba(255,255,255,0.85)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.background = 'rgba(255,255,255,0.05)'
            el.style.color = 'rgba(255,255,255,0.55)'
          }}
        >
          <Icon name="arrow-counterclockwise" size={13} />
          Nulstil layout
        </button>
      </div>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Oversigt &mdash; {new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {!isConnected ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-white/70 mb-2">Ingen forbindelse til Gateway</p>
            <p className="text-sm text-white/50">Gå til Indstillinger for at konfigurere API forbindelse</p>
          </div>
        </Card>
      ) : (
        <div
          style={{
            userSelect: isDragging ? 'none' : 'auto',
          }}
        >
          {widgetOrder.map(id => {
            const widget = widgetMap[id]
            if (!widget) return null

            const isBeingDragged = draggedId.current === id
            const isDropTarget = dropTargetId === id

            return (
              <div
                key={id}
                draggable
                onDragStart={() => handleDragStart(id)}
                onDragOver={e => handleDragOver(e, id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, id)}
                onDragEnd={handleDragEnd}
                style={{
                  opacity: isBeingDragged ? 0.35 : 1,
                  transition: 'opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                  transform: isDropTarget ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: isDropTarget
                    ? '0 0 0 2px rgba(0, 122, 255, 0.6), 0 8px 32px rgba(0, 122, 255, 0.15)'
                    : 'none',
                  borderRadius: isDropTarget ? 14 : 0,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  position: 'relative',
                }}
              >
                {/* Drop-target indikator-bjælke øverst */}
                {isDropTarget && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: 'linear-gradient(90deg, #007AFF, #5AC8FA)',
                      borderRadius: '3px 3px 0 0',
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Drag-håndtag hint — vises kun ved hover */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 5,
                    opacity: 0,
                    pointerEvents: 'none',
                    color: 'rgba(255,255,255,0.3)',
                    transition: 'opacity 0.15s ease',
                  }}
                  className="drag-handle-hint"
                >
                  <Icon name="drag-handle" size={14} />
                </div>

                {widget}
              </div>
            )
          })}

          {/* Global drag CSS */}
          <style>{`
            [draggable="true"]:hover .drag-handle-hint {
              opacity: 1 !important;
            }
            [draggable="true"] {
              outline: none;
            }
            [draggable="true"]:focus {
              outline: none;
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
