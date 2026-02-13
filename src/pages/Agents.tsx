import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { createAgent, ApiSession, listAgents, AgentApi, fetchAllSessions, TranscriptSession, readTranscriptMessages, DetailedSessionMessage } from '../api/openclaw'

/* ── Types ──────────────────────────────────────────────────── */
type AgentStatus = 'online' | 'offline' | 'working'
type AgentCategory = 'main' | 'team' | 'sub'

interface AgentEntry {
  id: string
  name: string
  role: string
  directive: string
  status: AgentStatus
  model: string
  icon: string
  iconBg: string
  category: AgentCategory
  contextPercent?: number
  session?: ApiSession
}

/* ── Helper Functions ────────────────────────────────────────── */
function getAgentIcon(name: string): { icon: string; iconBg: string } {
  const lower = name.toLowerCase()
  if (lower.includes('maison')) return { icon: 'brain', iconBg: 'linear-gradient(135deg, #007AFF, #AF52DE)' }
  if (lower.includes('design')) return { icon: 'palette', iconBg: 'linear-gradient(135deg, #BF5AF2, #AF52DE)' }
  if (lower.includes('frontend') || lower.includes('ui')) return { icon: 'code', iconBg: 'linear-gradient(135deg, #FF6B35, #FF3B30)' }
  if (lower.includes('backend') || lower.includes('db') || lower.includes('api')) return { icon: 'server', iconBg: 'linear-gradient(135deg, #30D158, #34C759)' }
  if (lower.includes('projekt') || lower.includes('qa') || lower.includes('manager')) return { icon: 'clipboard', iconBg: 'linear-gradient(135deg, #FF9F0A, #FF6B35)' }
  if (lower.includes('marketing')) return { icon: 'lightbulb', iconBg: 'linear-gradient(135deg, #5AC8FA, #007AFF)' }
  return { icon: 'robot', iconBg: 'linear-gradient(135deg, #636366, #48484A)' }
}

function buildMainAgent(sessions: ApiSession[]): AgentEntry {
  const mainSession = sessions.find(s => s.key === 'agent:main:main')
  const now = Date.now()
  const maxCtx = 200000
  
  if (mainSession) {
    const ctxPct = mainSession.contextTokens ? Math.min(100, Math.round((mainSession.contextTokens / maxCtx) * 100)) : 0
    return {
      id: 'main',
      name: 'Maison',
      role: 'System Orkestrering',
      directive: 'Leder og koordinerer alle agenter i systemet. Ansvarlig for at delegere opgaver på højeste niveau, sikre kvalitet og levere resultater.',
      status: now - mainSession.updatedAt < 120000 ? 'online' : 'offline',
      model: mainSession.model || 'claude-opus-4-6',
      icon: 'brain',
      iconBg: 'linear-gradient(135deg, #007AFF, #AF52DE)',
      category: 'main',
      contextPercent: ctxPct,
      session: mainSession,
    }
  }
  
  return {
    id: 'main',
    name: 'Maison',
    role: 'System Orkestrering',
    directive: 'Leder og koordinerer alle agenter i systemet. Ansvarlig for at delegere opgaver på højeste niveau, sikre kvalitet og levere resultater.',
    status: 'offline',
    model: 'claude-opus-4-6',
    icon: 'brain',
    iconBg: 'linear-gradient(135deg, #007AFF, #AF52DE)',
    category: 'main',
  }
}

const TEAM_AGENTS = [
  { id: 'designer', name: 'Designer', role: 'UI/UX Design', directive: 'Wireframes, prototyper, visuelt design. Apple HIG-inspireret dark mode.', model: 'sonnet' },
  { id: 'frontend', name: 'Frontend', role: 'React Udvikling', directive: 'React + TypeScript + Tailwind CSS implementering.', model: 'sonnet' },
  { id: 'backend', name: 'Backend', role: 'API & Database', directive: 'Supabase, PostgreSQL, Docker, server-administration.', model: 'sonnet' },
  { id: 'projektleder', name: 'Projektleder', role: 'Koordinering & QA', directive: 'Prioritering, QA, koordinering mellem agents. Finder fejl FØR Martin.', model: 'sonnet' },
  { id: 'marketing', name: 'Marketing', role: 'Marketing & Strategi', directive: 'Senior marketing-strateg. OrderFlow restaurant SaaS kontekst.', model: 'sonnet' },
]

function buildTeamAgents(_agents: AgentApi[], sessions: ApiSession[]): AgentEntry[] {
  const now = Date.now()
  return TEAM_AGENTS.map(a => {
    const { icon, iconBg } = getAgentIcon(a.name)
    const agentSessions = sessions.filter(s => {
      const label = (s.label || '').toLowerCase()
      const display = (s.displayName || '').toLowerCase()
      return label.includes(a.id) || display.includes(a.id)
    })
    const activeSession = agentSessions.find(s => now - s.updatedAt < 120000)
    const status: AgentStatus = activeSession ? (now - activeSession.updatedAt < 120000 ? 'online' : 'offline') : 'offline'
    
    return {
      id: `agent-${a.id}`,
      name: a.name,
      role: a.role,
      directive: a.directive,
      status,
      model: a.model,
      icon,
      iconBg,
      category: 'team',
      contextPercent: activeSession?.contextTokens ? Math.min(100, Math.round((activeSession.contextTokens / 200000) * 100)) : undefined,
      session: activeSession,
    }
  })
}

function buildSubAgents(sessions: ApiSession[]): AgentEntry[] {
  const now = Date.now()
  return sessions.filter(s => s.key.includes('subagent')).map(s => {
    const label = s.label || s.key
    const isActive = now - s.updatedAt < 120000
    return {
      id: s.key,
      name: label,
      role: 'Sub-agent',
      directive: `Session: ${s.key}`,
      status: isActive ? 'working' : 'offline',
      model: s.model,
      icon: 'robot',
      iconBg: 'linear-gradient(135deg, #636366, #48484A)',
      category: 'sub',
      contextPercent: s.contextTokens ? Math.min(100, Math.round((s.contextTokens / 200000) * 100)) : undefined,
      session: s,
    }
  })
}

function statusColor(s: AgentStatus) {
  return { online: '#30D158', offline: '#636366', working: '#007AFF' }[s]
}

function statusLabel(s: AgentStatus) {
  return { online: 'Online', offline: 'Offline', working: 'Arbejder' }[s]
}

function estimatePrice(model: string, totalTokens?: number): number {
  if (!totalTokens) return 0
  const pricePerMillion = model.includes('opus') ? 15 : model.includes('sonnet') ? 3 : model.includes('haiku') ? 0.25 : 3
  return (totalTokens / 1_000_000) * pricePerMillion
}

function formatPrice(price: number): string {
  if (price < 0.01) return '<$0.01'
  return `$${price.toFixed(2)}`
}

/* ── Components ──────────────────────────────────────────────── */
function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <div 
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
      style={{ background: `${statusColor(status)}20`, border: `1px solid ${statusColor(status)}40` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(status) }} />
      <span className="text-xs font-semibold" style={{ color: statusColor(status) }}>{statusLabel(status)}</span>
    </div>
  )
}

function ProgressBar({ value, color = '#007AFF' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

/* ── Hero Card (Maison) ──────────────────────────────────────── */
function HeroCard({ agent, onClick }: { agent: AgentEntry; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-8 cursor-pointer transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, rgba(0,122,255,0.08), rgba(175,82,222,0.08))',
        border: '1px solid rgba(0,122,255,0.2)',
        backdropFilter: 'blur(20px)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,122,255,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div 
          className="w-24 h-24 rounded-3xl flex items-center justify-center flex-shrink-0"
          style={{ background: agent.iconBg, boxShadow: '0 8px 24px rgba(0,122,255,0.4)' }}
        >
          <Icon name={agent.icon} size={48} className="text-white" />
        </div>
        
        <div className="flex-1 text-center sm:text-left">
          <StatusBadge status={agent.status} />
          <h2 className="text-3xl font-bold text-white mt-3 mb-1">{agent.name}</h2>
          <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.role}</p>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>{agent.directive}</p>
          
          {agent.session && (
            <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
              <span 
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ background: 'rgba(0,122,255,0.15)', color: '#5AC8FA' }}
              >
                {agent.model.split('/').pop()}
              </span>
              {agent.contextPercent !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Kontekst</span>
                  <span className="text-xs font-mono font-semibold" style={{ 
                    color: agent.contextPercent > 80 ? '#FF453A' : agent.contextPercent > 50 ? '#FF9F0A' : '#30D158' 
                  }}>
                    {agent.contextPercent}%
                  </span>
                </div>
              )}
              {agent.session.totalTokens && (
                <span className="text-xs font-semibold" style={{ color: '#30D158' }}>
                  {formatPrice(estimatePrice(agent.model, agent.session.totalTokens))}
                </span>
              )}
            </div>
          )}
          
          {agent.contextPercent !== undefined && (
            <div className="mt-3">
              <ProgressBar 
                value={agent.contextPercent} 
                color={agent.contextPercent > 80 ? '#FF453A' : agent.contextPercent > 50 ? '#FF9F0A' : '#30D158'} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Agent Card ──────────────────────────────────────────────── */
function AgentCard({ agent, onClick }: { agent: AgentEntry; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-6 cursor-pointer transition-all duration-300 text-center"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div 
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: agent.iconBg }}
      >
        <Icon name={agent.icon} size={28} className="text-white" />
      </div>
      
      <h3 className="text-base font-bold text-white mb-1">{agent.name}</h3>
      <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.role}</p>
      
      <StatusBadge status={agent.status} />
      
      {agent.contextPercent !== undefined && agent.contextPercent > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Kontekst</span>
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{agent.contextPercent}%</span>
          </div>
          <ProgressBar 
            value={agent.contextPercent} 
            color={agent.contextPercent > 80 ? '#FF453A' : agent.contextPercent > 50 ? '#FF9F0A' : '#30D158'} 
          />
        </div>
      )}
      
      {agent.session?.totalTokens && (
        <p className="text-xs font-mono mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {formatPrice(estimatePrice(agent.model, agent.session.totalTokens))}
        </p>
      )}
    </div>
  )
}

/* ── Detail Panel ────────────────────────────────────────────── */
function DetailPanel({ agent, onClose }: { agent: AgentEntry; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose} />
      <div 
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] z-50 overflow-y-auto p-6"
        style={{
          background: 'rgba(10,10,15,0.98)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(40px)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Agent Detaljer</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <Icon name="xmark" size={14} className="text-white/60" />
          </button>
        </div>
        
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: agent.iconBg }}
          >
            <Icon name={agent.icon} size={36} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-1">{agent.name}</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.role}</p>
          </div>
        </div>
        
        <StatusBadge status={agent.status} />
        
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Missions Direktiv
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {agent.directive}
          </p>
        </div>
        
        {agent.session && (
          <>
            <div className="mt-6 rounded-xl p-4" style={{ background: 'rgba(0,122,255,0.04)', border: '1px solid rgba(0,122,255,0.15)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon name="zap" size={14} style={{ color: '#007AFF' }} />
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Budget Forbrug
                  </p>
                </div>
                <span className="text-base font-bold text-white">
                  {formatPrice(estimatePrice(agent.model, agent.session.totalTokens))}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Tokens</p>
                  <p className="font-mono font-semibold text-white">{agent.session.totalTokens?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Context Tokens</p>
                  <p className="font-mono font-semibold text-white">{agent.session.contextTokens?.toLocaleString() || '0'}</p>
                </div>
              </div>
              
              {agent.contextPercent !== undefined && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Budget Ramme (200k tokens)</span>
                    <span className="text-xs font-mono font-semibold" style={{ 
                      color: agent.contextPercent > 80 ? '#FF453A' : agent.contextPercent > 50 ? '#FF9F0A' : '#30D158' 
                    }}>
                      {agent.contextPercent}%
                    </span>
                  </div>
                  <ProgressBar 
                    value={agent.contextPercent} 
                    color={agent.contextPercent > 80 ? '#FF453A' : agent.contextPercent > 50 ? '#FF9F0A' : '#30D158'} 
                  />
                </div>
              )}
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Model
                </p>
                <p className="text-sm text-white">{agent.session.model}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Kanal
                </p>
                <p className="text-sm text-white">{agent.session.lastChannel}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Session ID
                </p>
                <p className="text-xs font-mono break-all" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.session.sessionId}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Sidst Opdateret
                </p>
                <p className="text-sm text-white">
                  {new Date(agent.session.updatedAt).toLocaleString('da-DK', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

/* ── Create Modal (simplified) ───────────────────────────────── */
function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [task, setTask] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || !task.trim()) return
    setCreating(true)
    try {
      await createAgent({ name: name.trim(), task: task.trim(), model: 'sonnet', label: name.trim().toLowerCase().replace(/\s+/g, '-') })
      onClose()
      setName('')
      setTask('')
    } catch (e) {
      console.error('Fejl ved oprettelse:', e)
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose} />
      <div 
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-6 rounded-2xl"
        style={{ background: 'rgba(20,20,24,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Opret Agent</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Icon name="xmark" size={14} className="text-white/60" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Navn</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="f.eks. Research Agent"
              className="w-full px-4 py-2 rounded-xl text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Opgave</label>
            <textarea 
              value={task} 
              onChange={e => setTask(e.target.value)}
              placeholder="Beskriv hvad agenten skal gøre..."
              rows={4}
              className="w-full px-4 py-2 rounded-xl text-sm text-white resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
            />
          </div>
          
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !task.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{ 
              background: creating || !name.trim() || !task.trim() ? 'rgba(0,122,255,0.3)' : 'linear-gradient(135deg, #007AFF, #AF52DE)',
              opacity: creating || !name.trim() || !task.trim() ? 0.6 : 1 
            }}
          >
            {creating ? 'Opretter...' : 'Opret Agent'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Communication View ──────────────────────────────────────── */
function CommunicationView() {
  const [allSessions, setAllSessions] = useState<TranscriptSession[]>([])
  const [selectedSession, setSelectedSession] = useState<TranscriptSession | null>(null)
  const [messages, setMessages] = useState<DetailedSessionMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cached = localStorage.getItem('openclaw-comm-sessions')
    if (cached) {
      try { setAllSessions(JSON.parse(cached)); setLoading(false) } catch {}
    }
    fetchAllSessions().then(sessions => {
      const subagentSessions = sessions
        .filter(s => s.spawnedBy || s.agent !== 'main')
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      setAllSessions(subagentSessions)
      localStorage.setItem('openclaw-comm-sessions', JSON.stringify(subagentSessions))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedSession) { setMessages([]); return }
    setLoadingMessages(true)
    readTranscriptMessages(selectedSession.agent, selectedSession.sessionId, 100)
      .then(msgs => setMessages(msgs))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [selectedSession])

  function timeAgo(ts: number) {
    const mins = Math.floor((Date.now() - ts) / 60000)
    if (mins < 1) return 'lige nu'
    if (mins < 60) return `${mins}m siden`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}t siden`
    return `${Math.floor(hours / 24)}d siden`
  }

  if (loading) {
    return <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Henter kommunikation...</div>
  }

  if (allSessions.length === 0) {
    return (
      <div className="text-center py-16">
        <Icon name="chat" size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-base font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Ingen agent-kommunikation endnu</p>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>Når agenter får opgaver, vises samtaler her</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: '500px' }}>
      {/* Session list */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-2 overflow-y-auto" style={{ maxHeight: '70vh' }}>
        {allSessions.map(s => (
          <div
            key={s.sessionId}
            onClick={() => setSelectedSession(s)}
            className="rounded-2xl p-4 cursor-pointer transition-all duration-200"
            style={{
              background: selectedSession?.sessionId === s.sessionId ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.03)',
              border: selectedSession?.sessionId === s.sessionId ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent',
            }}
            onMouseEnter={e => { if (selectedSession?.sessionId !== s.sessionId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if (selectedSession?.sessionId !== s.sessionId) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(175,82,222,0.15)' }}>
                <Icon name="chat" size={14} style={{ color: '#AF52DE' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{s.label || s.sessionId.slice(0, 8)}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {s.agent} · {s.messageCount} beskeder
                </p>
              </div>
              <span className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ background: s.status === 'active' ? '#30D158' : '#636366' }} />
            </div>
            {s.firstMessage && (
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.firstMessage}</p>
            )}
            <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {s.updatedAt ? timeAgo(s.updatedAt) : s.startedAt?.slice(0, 10) || ''}
            </p>
          </div>
        ))}
      </div>

      {/* Chat view */}
      <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {!selectedSession ? (
          <div className="flex items-center justify-center h-full py-16">
            <div className="text-center">
              <Icon name="chat" size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Vælg en samtale</p>
            </div>
          </div>
        ) : loadingMessages ? (
          <div className="flex items-center justify-center h-full py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-base font-bold text-white">{selectedSession.label || selectedSession.sessionId.slice(0, 8)}</h3>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Agent: {selectedSession.agent} · Model: {selectedSession.model || '?'} · {messages.length} beskeder
              </p>
            </div>
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user'
                const text = msg.text || ''
                if (!text && (!msg.toolCalls || msg.toolCalls.length === 0)) return null
                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%]`}>
                      <p className={`text-[10px] mb-1 ${isUser ? 'text-right' : 'text-left'}`} style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {isUser ? 'Maison' : selectedSession.agent}
                      </p>
                      {text && (
                        <div className="rounded-2xl px-4 py-2.5" style={{
                          background: isUser ? '#007AFF' : 'rgba(255,255,255,0.06)',
                          color: isUser ? '#fff' : 'rgba(255,255,255,0.85)',
                        }}>
                          <p className="text-sm whitespace-pre-wrap break-words">{text.slice(0, 2000)}{text.length > 2000 ? '...' : ''}</p>
                        </div>
                      )}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.toolCalls.map((tc, tIdx) => (
                            <div key={tIdx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,149,0,0.08)' }}>
                              <Icon name="wrench" size={12} className="text-orange-400" />
                              <span className="text-xs text-orange-300">{tc.tool}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {messages.length === 0 && (
                <p className="text-center text-sm py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>Ingen beskeder i denne samtale</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function Agents() {
  const { sessions } = useLiveData()
  const [selectedAgent, setSelectedAgent] = useState<AgentEntry | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [apiAgents, setApiAgents] = useState<AgentApi[]>([])
  const [tab, setTab] = useState<'team' | 'kommunikation'>('team')

  useEffect(() => {
    listAgents()
      .then(agents => setApiAgents(agents))
      .catch(err => console.error('Failed to fetch agents:', err))
  }, [])

  const mainAgent = buildMainAgent(sessions)
  const teamAgents = buildTeamAgents(apiAgents, sessions)
  const subAgents = buildSubAgents(sessions)
  const allAgents = [mainAgent, ...teamAgents, ...subAgents]

  const tabs: { key: typeof tab; label: string; icon: string }[] = [
    { key: 'team', label: 'Team', icon: 'person' },
    { key: 'kommunikation', label: 'Kommunikation', icon: 'chat' },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Agenter</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {allAgents.length} agenter · {allAgents.filter(a => a.status === 'online' || a.status === 'working').length} aktive
          </p>
        </div>
        
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, #007AFF, #AF52DE)' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,122,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          <Icon name="user-plus" size={16} />
          Opret Agent
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? 'rgba(0,122,255,0.2)' : 'transparent',
              color: tab === t.key ? '#5AC8FA' : 'rgba(255,255,255,0.4)',
            }}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'team' ? (
        <>
          {/* Hero Card */}
          <HeroCard agent={mainAgent} onClick={() => setSelectedAgent(mainAgent)} />

          {/* Team Agents */}
          {teamAgents.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-white mb-4">Team Agenter</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamAgents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} onClick={() => setSelectedAgent(agent)} />
                ))}
              </div>
            </div>
          )}

          {/* Sub Agents */}
          {subAgents.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-white mb-4">Sub-Agenter</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {subAgents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} onClick={() => setSelectedAgent(agent)} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <CommunicationView />
      )}

      {selectedAgent && <DetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}
      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
