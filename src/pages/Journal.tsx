import { useState, useEffect, useMemo } from 'react'
import Icon from '../components/Icon'
import { fetchMemoryFiles, fetchAllSessions, MemoryEntry, TranscriptSession } from '../api/openclaw'

/* ── Types ───────────────────────────────────── */
interface DayData {
  date: string
  memory?: MemoryEntry
  memories?: MemoryEntry[]
  sessions: TranscriptSession[]
}

/* ── Helpers ─────────────────────────────────── */
const CACHE_KEY_MEMORY = 'openclaw-memory-files'
const CACHE_KEY_SESSIONS = 'openclaw-all-sessions'

function extractDatePart(dateStr: string): string {
  // Extract YYYY-MM-DD from strings like "2026-02-13-c" or "2026-02-12-mission-kontrol"
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : dateStr
}

function formatDate(dateStr: string): string {
  try {
    const clean = extractDatePart(dateStr)
    const date = new Date(clean + 'T12:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('da-DK', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  } catch {
    return dateStr
  }
}

function extractTitle(content: string): string | null {
  // Find first markdown heading
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

function getDateKey(timestamp: string | number): string {
  try {
    const date = new Date(timestamp)
    return date.toISOString().split('T')[0]
  } catch {
    return 'unknown'
  }
}

function renderMarkdown(content: string): JSX.Element {
  // Simple markdown rendering - kunne bruges marked eller remark i produktion
  // For nu: behold markdown som pre-formatted med styling
  return (
    <div 
      className="prose prose-invert max-w-none"
      style={{ 
        color: 'rgba(255,255,255,0.8)',
        fontSize: '14px',
        lineHeight: '1.6',
      }}
    >
      <pre 
        className="whitespace-pre-wrap font-sans"
        style={{ 
          background: 'transparent',
          padding: 0,
          margin: 0,
          border: 'none',
        }}
      >
        {content}
      </pre>
    </div>
  )
}

/* ── Session Card ────────────────────────────── */
function SessionCard({ session }: { session: TranscriptSession }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const agentColor = session.agent === 'main' ? '#007AFF' : '#AF52DE'
  const agentIcon = session.agent === 'main' ? 'brain' : 'robot'
  
  return (
    <div 
      className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      onClick={() => setIsExpanded(!isExpanded)}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${agentColor}20` }}
            >
              <Icon name={agentIcon} size={14} style={{ color: agentColor }} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                {session.label || `${session.agent}/${session.sessionId.substring(0, 8)}`}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span 
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${agentColor}20`, color: agentColor }}
                >
                  {session.agent}
                </span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {session.messageCount} beskeder
                </span>
              </div>
            </div>
          </div>
          <Icon 
            name={isExpanded ? 'chevron-down' : 'chevron-right'} 
            size={16} 
            style={{ color: 'rgba(255,255,255,0.3)' }} 
          />
        </div>
        
        {session.firstMessage && !isExpanded && (
          <p className="text-xs mt-2 line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {session.firstMessage}
          </p>
        )}
        
        {isExpanded && (
          <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {session.firstMessage && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Første besked
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {session.firstMessage}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Session ID
                </p>
                <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {session.sessionId.substring(0, 8)}
                </p>
              </div>
              
              {session.model && (
                <div>
                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Model
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {session.model.split('/').pop()?.split('-')[0]}
                  </p>
                </div>
              )}
              
              {session.spawnedBy && (
                <div>
                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Spawned By
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {session.spawnedBy}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Day Content ─────────────────────────────── */
function DayContent({ day }: { day: DayData }) {
  return (
    <div className="space-y-6">
      {/* Memory content */}
      {day.memories && day.memories.length > 0 && day.memories.map((mem, i) => {
        const title = extractTitle(mem.content) || mem.filename.replace('.md', '').replace(/^\d{4}-\d{2}-\d{2}-?/, '') || 'Daglig Note'
        return (
          <div 
            key={i}
            className="rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Icon name="doc-text" size={18} style={{ color: '#007AFF' }} />
              <h3 className="text-base font-bold text-white">{title}</h3>
            </div>
            {renderMarkdown(mem.content)}
          </div>
        )
      })}
      
      {/* Sessions */}
      {day.sessions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Icon name="checklist" size={18} style={{ color: '#AF52DE' }} />
            <h3 className="text-base font-bold text-white">Aktivitet</h3>
            <span 
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(175,82,222,0.2)', color: '#AF52DE' }}
            >
              {day.sessions.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {day.sessions.map(session => (
              <SessionCard key={session.sessionId} session={session} />
            ))}
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {!day.memory && day.sessions.length === 0 && (
        <div className="text-center py-12">
          <Icon name="calendar-week" size={32} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Ingen aktivitet denne dag
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Date Sidebar ────────────────────────────── */
function DateSidebar({ 
  dates, 
  selectedDate, 
  onSelectDate 
}: { 
  dates: string[]
  selectedDate: string | null
  onSelectDate: (date: string) => void 
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Datoer
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-1">
        {dates.map(date => {
          const isSelected = date === selectedDate
          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className="w-full text-left px-4 py-3 rounded-xl transition-all"
              style={{
                background: isSelected ? 'rgba(0,122,255,0.15)' : 'transparent',
                color: isSelected ? '#007AFF' : 'rgba(255,255,255,0.6)',
                fontWeight: isSelected ? 600 : 400,
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <div className="text-sm">{formatDate(date)}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────── */
export default function Journal() {
  const [memoryFiles, setMemoryFiles] = useState<MemoryEntry[]>([])
  const [allSessions, setAllSessions] = useState<TranscriptSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Hent data ved mount
  useEffect(() => {
    // Prøv cache først
    const cachedMemory = localStorage.getItem(CACHE_KEY_MEMORY)
    const cachedSessions = localStorage.getItem(CACHE_KEY_SESSIONS)
    
    if (cachedMemory) {
      try {
        setMemoryFiles(JSON.parse(cachedMemory))
      } catch (e) {
        console.error('Failed to parse cached memory:', e)
      }
    }
    
    if (cachedSessions) {
      try {
        setAllSessions(JSON.parse(cachedSessions))
      } catch (e) {
        console.error('Failed to parse cached sessions:', e)
      }
    }

    // Hent frisk data
    setLoading(true)
    Promise.all([
      fetchMemoryFiles(),
      fetchAllSessions(),
    ])
      .then(([memory, sessions]) => {
        setMemoryFiles(memory)
        setAllSessions(sessions)
        localStorage.setItem(CACHE_KEY_MEMORY, JSON.stringify(memory))
        localStorage.setItem(CACHE_KEY_SESSIONS, JSON.stringify(sessions))
        
        // Set default selected date til seneste
        if (!selectedDate && memory.length > 0) {
          setSelectedDate(memory[0].date)
        } else if (!selectedDate && sessions.length > 0) {
          const latest = sessions.reduce((latest, s) => {
            const sDate = s.updatedAt || s.startedAt
            const lDate = latest.updatedAt || latest.startedAt
            return (sDate && (!lDate || sDate > lDate)) ? s : latest
          })
          setSelectedDate(getDateKey(latest.updatedAt || latest.startedAt))
        }
      })
      .catch(err => {
        console.error('Failed to fetch journal data:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  // Grupper data efter dato
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>()
    
    // Tilføj memory entries (group by YYYY-MM-DD)
    for (const mem of memoryFiles) {
      const dateKey = extractDatePart(mem.date)
      if (!map.has(dateKey)) {
        map.set(dateKey, { date: dateKey, sessions: [], memories: [] })
      }
      const day = map.get(dateKey)!
      if (!day.memory) day.memory = mem
      if (!day.memories) day.memories = []
      day.memories.push(mem)
    }
    
    // Tilføj sessions grupperet efter dato
    for (const session of allSessions) {
      const dateKey = getDateKey(session.updatedAt || session.startedAt)
      if (!map.has(dateKey)) {
        map.set(dateKey, { date: dateKey, sessions: [] })
      }
      map.get(dateKey)!.sessions.push(session)
    }
    
    return map
  }, [memoryFiles, allSessions])

  // Sorter datoer (nyeste først)
  const sortedDates = useMemo(() => {
    return Array.from(dayDataMap.keys()).sort((a, b) => b.localeCompare(a))
  }, [dayDataMap])

  // Sæt default date hvis ikke valgt
  useEffect(() => {
    if (!selectedDate && sortedDates.length > 0) {
      setSelectedDate(sortedDates[0])
    }
  }, [sortedDates, selectedDate])

  const currentDayData = selectedDate ? dayDataMap.get(selectedDate) : null

  if (loading && memoryFiles.length === 0 && allSessions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div 
            className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4" 
            style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} 
          />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Indlæser journal...
          </p>
        </div>
      </div>
    )
  }

  if (sortedDates.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Journal</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Kronologisk dagbog over sessions og noter
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon name="calendar-week" size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Ingen journalindlæg endnu
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Journal</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {sortedDates.length} dage · {allSessions.length} sessions · {memoryFiles.length} noter
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 min-h-0">
        {/* Sidebar */}
        <div className="md:col-span-1 overflow-y-auto">
          <DateSidebar 
            dates={sortedDates} 
            selectedDate={selectedDate} 
            onSelectDate={setSelectedDate} 
          />
        </div>

        {/* Main content */}
        <div className="md:col-span-3 overflow-y-auto">
          {currentDayData ? (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">
                  {formatDate(currentDayData.date)}
                </h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {currentDayData.sessions.length} sessions
                  {currentDayData.memory && ' · Memory note'}
                </p>
              </div>
              
              <DayContent day={currentDayData} />
            </div>
          ) : (
            <div className="text-center py-12">
              <Icon name="calendar-week" size={32} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Vælg en dato fra sidebaren
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
