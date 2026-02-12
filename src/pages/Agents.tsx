import { useState } from 'react'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { createAgent, ApiSession } from '../api/openclaw'

/* ── Agent type for display ─────────────────────────────────── */
interface AgentCard {
  id: string
  name: string
  role: string
  directive: string
  status: 'online' | 'offline' | 'working' | 'completed'
  model: string
  icon: string
  iconBg: string
  contextPercent?: number
  activeTask?: string
  taskProgress?: number
  isMain?: boolean
  session?: ApiSession
}

/* ── Static sub-agent definitions ───────────────────────────── */
const KNOWN_SUBAGENTS: Record<string, Partial<AgentCard>> = {
  'mission-kontrol-builder': { name: 'Builder', role: 'Frontend Udvikler', directive: 'Bygger og implementerer UI-komponenter til Mission Kontrol dashboardet.', icon: 'code', iconBg: 'linear-gradient(135deg, #FF6B35, #FF3B30)' },
  'mission-kontrol-danish': { name: 'Dansk', role: 'Lokalisering', directive: 'Oversætter al tekst til dansk og sikrer konsistent sprogbrug.', icon: 'globe', iconBg: 'linear-gradient(135deg, #30D158, #34C759)' },
  'mission-kontrol-kanban': { name: 'Kanban', role: 'UI Specialist', directive: 'Designer og implementerer kanban-board og opgavestyring.', icon: 'grid', iconBg: 'linear-gradient(135deg, #FF9F0A, #FF6B35)' },
  'mission-kontrol-glass': { name: 'Glass', role: 'Design System', directive: 'Udvikler glassmorphism design system med mørk æstetik.', icon: 'palette', iconBg: 'linear-gradient(135deg, #BF5AF2, #AF52DE)' },
  'mission-kontrol-live': { name: 'Live', role: 'API Integration', directive: 'Integrerer live data fra OpenClaw Gateway API\'et.', icon: 'zap', iconBg: 'linear-gradient(135deg, #007AFF, #5AC8FA)' },
  'mission-kontrol-intel': { name: 'Intel', role: 'Intelligens Design', directive: 'Designer intelligence og analytics dashboards.', icon: 'lightbulb', iconBg: 'linear-gradient(135deg, #FFD60A, #FF9F0A)' },
  'mission-kontrol-intel-dark': { name: 'Intel Dark', role: 'Dark Mode Designer', directive: 'Optimerer dark mode for intelligence-siderne.', icon: 'moon', iconBg: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)' },
  'mission-kontrol-darkmode': { name: 'Darkmode', role: 'Theme Arkitekt', directive: 'Arkitekt for det gennemgående mørke tema og farvesystem.', icon: 'moon', iconBg: 'linear-gradient(135deg, #1C1C1E, #636366)' },
  'mission-kontrol-agents': { name: 'Agents', role: 'Agent Designer', directive: 'Designer og implementerer agent-oversigten med hero cards.', icon: 'robot', iconBg: 'linear-gradient(135deg, #007AFF, #AF52DE)' },
}

function buildAgentCards(sessions: ApiSession[]): AgentCard[] {
  const cards: AgentCard[] = []
  const mainSession = sessions.find(s => s.key === 'agent:main:main')
  const now = Date.now()

  // Main agent card
  if (mainSession) {
    const maxCtx = 200000
    const ctxPct = mainSession.contextTokens ? Math.min(100, Math.round((mainSession.contextTokens / maxCtx) * 100)) : 0
    cards.push({
      id: 'main',
      name: 'Maison',
      role: 'Hovedagent — System Orkestrering & Strategi',
      directive: 'Leder og koordinerer alle agenter. Ansvarlig for at delegere opgaver, sikre kvalitet og levere resultater til Martin.',
      status: now - mainSession.updatedAt < 120000 ? 'online' : 'offline',
      model: mainSession.model || 'claude-opus-4-6',
      icon: 'brain',
      iconBg: 'linear-gradient(135deg, #007AFF, #AF52DE)',
      contextPercent: ctxPct,
      activeTask: 'System orkestrering',
      taskProgress: ctxPct,
      isMain: true,
      session: mainSession,
    })
  } else {
    cards.push({
      id: 'main',
      name: 'Maison',
      role: 'Hovedagent — System Orkestrering & Strategi',
      directive: 'Leder og koordinerer alle agenter. Ansvarlig for at delegere opgaver, sikre kvalitet og levere resultater til Martin.',
      status: 'offline',
      model: 'claude-opus-4-6',
      icon: 'brain',
      iconBg: 'linear-gradient(135deg, #007AFF, #AF52DE)',
      isMain: true,
    })
  }

  // Sub-agent sessions
  const subSessions = sessions.filter(s => s.key !== 'agent:main:main')
  const usedLabels = new Set<string>()

  for (const s of subSessions) {
    const label = s.label || s.key
    usedLabels.add(label)
    const known = KNOWN_SUBAGENTS[label]
    const isActive = now - s.updatedAt < 120000
    cards.push({
      id: s.key,
      name: known?.name || label,
      role: known?.role || 'Sub-agent',
      directive: known?.directive || `Session: ${s.key}`,
      status: isActive ? 'working' : 'completed',
      model: s.model,
      icon: known?.icon || 'robot',
      iconBg: known?.iconBg || 'linear-gradient(135deg, #636366, #48484A)',
      contextPercent: s.contextTokens ? Math.min(100, Math.round((s.contextTokens / 200000) * 100)) : undefined,
      session: s,
    })
  }

  // Add known sub-agents not in sessions as completed
  for (const [label, info] of Object.entries(KNOWN_SUBAGENTS)) {
    if (!usedLabels.has(label)) {
      cards.push({
        id: label,
        name: info.name || label,
        role: info.role || 'Sub-agent',
        directive: info.directive || '',
        status: 'completed',
        model: 'claude-sonnet-4-5',
        icon: info.icon || 'robot',
        iconBg: info.iconBg || 'linear-gradient(135deg, #636366, #48484A)',
      })
    }
  }

  return cards
}

/* ── Status dot component ───────────────────────────────────── */
function StatusDot({ status }: { status: AgentCard['status'] }) {
  const config = {
    online: { color: '#30D158', label: 'Online', glow: '0 0 8px rgba(48,209,88,0.6)' },
    offline: { color: '#636366', label: 'Offline', glow: 'none' },
    working: { color: '#007AFF', label: 'Arbejder', glow: '0 0 8px rgba(0,122,255,0.6)' },
    completed: { color: '#30D158', label: 'Færdig', glow: 'none' },
  }[status]

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ background: config.color, boxShadow: config.glow }}
      />
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: config.color }}>
        {config.label}
      </span>
    </span>
  )
}

/* ── Progress bar ───────────────────────────────────────────── */
function ProgressBar({ value, color = '#007AFF' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  )
}

/* ── Hero Agent Card ────────────────────────────────────────── */
function HeroCard({ agent, onClick }: { agent: AgentCard; onClick: () => void }) {
  const isMain = agent.isMain

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-2xl p-6 transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: isMain ? '1px solid rgba(0,122,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.borderColor = isMain ? 'rgba(0,122,255,0.4)' : 'rgba(255,255,255,0.12)'
        e.currentTarget.style.boxShadow = isMain
          ? '0 0 30px rgba(0,122,255,0.1), 0 8px 32px rgba(0,0,0,0.3)'
          : '0 8px 32px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.borderColor = isMain ? 'rgba(0,122,255,0.25)' : 'rgba(255,255,255,0.06)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header row: avatar + status + name */}
      <div className="flex items-start gap-5 mb-4">
        {/* Avatar */}
        <div
          className="flex-shrink-0 rounded-2xl flex items-center justify-center"
          style={{
            width: isMain ? 80 : 64,
            height: isMain ? 80 : 64,
            background: agent.iconBg,
            boxShadow: isMain ? '0 4px 20px rgba(0,122,255,0.3)' : '0 2px 12px rgba(0,0,0,0.3)',
          }}
        >
          <Icon name={agent.icon} size={isMain ? 36 : 28} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <StatusDot status={agent.status} />
          </div>
          <h3 className={`font-bold text-white leading-tight ${isMain ? 'text-3xl' : 'text-2xl'}`}>
            {agent.name}
          </h3>
          <p className="text-sm italic mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            &quot;{agent.role}&quot;
          </p>
        </div>
      </div>

      {/* Mission Directive */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Missions Direktiv
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {agent.directive}
        </p>
      </div>

      {/* Active Task card (if applicable) */}
      {(agent.activeTask || agent.status === 'completed') && (
        <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Aktiv Opgave
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
              background: agent.status === 'completed' ? 'rgba(48,209,88,0.12)' : 'rgba(0,122,255,0.12)',
              color: agent.status === 'completed' ? '#30D158' : '#007AFF',
            }}>
              {agent.status === 'completed' ? 'Færdig' : agent.status === 'working' ? 'Arbejder' : 'Aktiv'}
            </span>
          </div>
          <p className="text-sm font-medium text-white mb-2">
            {agent.activeTask || (agent.status === 'completed' ? 'Opgave fuldført' : '—')}
          </p>
          {agent.taskProgress !== undefined && (
            <ProgressBar value={agent.taskProgress} color={agent.status === 'completed' ? '#30D158' : '#007AFF'} />
          )}
          {agent.status === 'completed' && !agent.taskProgress && (
            <ProgressBar value={100} color="#30D158" />
          )}
        </div>
      )}

      {/* Footer: model + context */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] px-2 py-1 rounded-lg font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
          {agent.model}
        </span>
        {agent.contextPercent !== undefined && (
          <div className="flex items-center gap-2 flex-1 min-w-[100px]">
            <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Kontekst</span>
            <div className="flex-1">
              <ProgressBar value={agent.contextPercent} color={agent.contextPercent > 80 ? '#FF453A' : agent.contextPercent > 50 ? '#FF9F0A' : '#30D158'} />
            </div>
            <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.contextPercent}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Create Agent Modal ─────────────────────────────────────── */
const MODEL_OPTIONS = [
  'claude-opus-4-6',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  'gpt-5.2',
]

const SKILL_OPTIONS = ['perplexity', 'youtube-watcher', 'web-search', 'code-exec', 'browser']
const PRIORITY_OPTIONS = ['Normal', 'Høj', 'Kritisk']

function CreateAgentModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (name: string) => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [directive, setDirective] = useState('')
  const [model, setModel] = useState(MODEL_OPTIONS[0])
  const [skills, setSkills] = useState<string[]>([])
  const [priority, setPriority] = useState('Normal')
  const [autoStart, setAutoStart] = useState(true)
  const [firstTask, setFirstTask] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const toggleSkill = (s: string) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Navn er påkrævet'); return }
    setCreating(true)
    setError('')
    try {
      const task = [
        directive && `Missions direktiv: ${directive}`,
        role && `Rolle: ${role}`,
        priority !== 'Normal' && `Prioritet: ${priority}`,
        skills.length > 0 && `Skills: ${skills.join(', ')}`,
        firstTask && `Første opgave: ${firstTask}`,
      ].filter(Boolean).join('\n\n')

      await createAgent({
        name: name.trim(),
        task: task || `Agent: ${name}`,
        model,
        label: name.trim().toLowerCase().replace(/\s+/g, '-'),
      })
      onCreated(name)
      onClose()
      // Reset
      setName(''); setRole(''); setDirective(''); setModel(MODEL_OPTIONS[0]); setSkills([]); setPriority('Normal'); setAutoStart(true); setFirstTask('')
    } catch (e: any) {
      setError(e.message || 'Kunne ikke oprette agent')
    } finally {
      setCreating(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    borderRadius: '0.75rem',
    padding: '0.625rem 0.875rem',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
  }

  return (
    <Modal open={open} onClose={onClose} title="Opret Ny Agent">
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Navn *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="f.eks. Research Agent" style={inputStyle} />
        </div>

        {/* Role */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Rolle</label>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="f.eks. Frontend Udvikler" style={inputStyle} />
        </div>

        {/* Directive */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Missions Direktiv</label>
          <textarea value={directive} onChange={e => setDirective(e.target.value)} placeholder="Beskriv hvad agenten skal gøre..." rows={3} style={inputStyle} />
        </div>

        {/* Model */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Model</label>
          <select value={model} onChange={e => setModel(e.target.value)} style={inputStyle}>
            {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Skills */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Skills</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map(s => (
              <button key={s} onClick={() => toggleSkill(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: skills.includes(s) ? 'rgba(0,122,255,0.2)' : 'rgba(255,255,255,0.06)',
                  border: skills.includes(s) ? '1px solid rgba(0,122,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: skills.includes(s) ? '#5AC8FA' : 'rgba(255,255,255,0.5)',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Prioritet</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map(p => (
              <button key={p} onClick={() => setPriority(p)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: priority === p ? (p === 'Kritisk' ? 'rgba(255,69,58,0.2)' : p === 'Høj' ? 'rgba(255,159,10,0.2)' : 'rgba(0,122,255,0.2)') : 'rgba(255,255,255,0.06)',
                  border: priority === p ? `1px solid ${p === 'Kritisk' ? 'rgba(255,69,58,0.4)' : p === 'Høj' ? 'rgba(255,159,10,0.4)' : 'rgba(0,122,255,0.4)'}` : '1px solid rgba(255,255,255,0.08)',
                  color: priority === p ? (p === 'Kritisk' ? '#FF453A' : p === 'Høj' ? '#FF9F0A' : '#007AFF') : 'rgba(255,255,255,0.5)',
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Auto start */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Automatisk Start</label>
          <button onClick={() => setAutoStart(!autoStart)}
            className="w-11 h-6 rounded-full transition-all relative"
            style={{ background: autoStart ? '#007AFF' : 'rgba(255,255,255,0.15)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: autoStart ? '22px' : '2px' }} />
          </button>
        </div>

        {/* First task */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Første Opgave (valgfri)</label>
          <textarea value={firstTask} onChange={e => setFirstTask(e.target.value)} placeholder="Hvad skal agenten gøre først?" rows={2} style={inputStyle} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={creating}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all"
          style={{
            background: creating ? 'rgba(0,122,255,0.3)' : 'linear-gradient(135deg, #007AFF, #AF52DE)',
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? 'Opretter...' : 'Opret Agent'}
        </button>
      </div>
    </Modal>
  )
}

/* ── Toast notification ─────────────────────────────────────── */
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium text-white transition-all duration-500"
      style={{
        background: 'rgba(48,209,88,0.15)',
        border: '1px solid rgba(48,209,88,0.3)',
        backdropFilter: 'blur(20px)',
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Icon name="check" size={14} className="text-green-400 mr-2 inline" />
      {message}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function Agents() {
  const { isConnected, sessions } = useLiveData()
  const [selectedAgent, setSelectedAgent] = useState<AgentCard | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState({ message: '', visible: false })

  const cards = buildAgentCards(isConnected ? sessions : [])
  const mainCard = cards.find(c => c.isMain)
  const subCards = cards.filter(c => !c.isMain)

  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-1">Agenter</h1>
          <p className="caption">{cards.length} agenter · {cards.filter(c => c.status === 'online' || c.status === 'working').length} aktive</p>
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

      {/* Main Agent */}
      {mainCard && (
        <div className="mb-6">
          <HeroCard agent={mainCard} onClick={() => setSelectedAgent(mainCard)} />
        </div>
      )}

      {/* Sub-agents grid */}
      {subCards.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Sub-agenter ({subCards.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {subCards.map(agent => (
              <HeroCard key={agent.id} agent={agent} onClick={() => setSelectedAgent(agent)} />
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      <Modal open={!!selectedAgent} onClose={() => setSelectedAgent(null)} title={selectedAgent?.name || ''}>
        {selectedAgent && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: selectedAgent.iconBg }}>
                <Icon name={selectedAgent.icon} size={28} className="text-white" />
              </div>
              <div>
                <StatusDot status={selectedAgent.status} />
                <h3 className="text-xl font-bold text-white mt-1">{selectedAgent.name}</h3>
                <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.5)' }}>&quot;{selectedAgent.role}&quot;</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Missions Direktiv</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{selectedAgent.directive}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="caption mb-1">Model</p>
                <span className="text-xs px-2 py-1 rounded-lg font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>{selectedAgent.model}</span>
              </div>
              {selectedAgent.session && (
                <>
                  <div>
                    <p className="caption mb-1">Kanal</p>
                    <p className="font-medium text-white">{selectedAgent.session.lastChannel}</p>
                  </div>
                  <div>
                    <p className="caption mb-1">Session ID</p>
                    <p className="font-mono text-xs break-all" style={{ color: 'rgba(255,255,255,0.5)' }}>{selectedAgent.session.sessionId}</p>
                  </div>
                  <div>
                    <p className="caption mb-1">Session Key</p>
                    <p className="font-mono text-xs break-all" style={{ color: 'rgba(255,255,255,0.5)' }}>{selectedAgent.session.key}</p>
                  </div>
                </>
              )}
            </div>

            {selectedAgent.contextPercent !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="caption">Kontekst Brug</p>
                  <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{selectedAgent.contextPercent}%</span>
                </div>
                <ProgressBar value={selectedAgent.contextPercent} color={selectedAgent.contextPercent > 80 ? '#FF453A' : selectedAgent.contextPercent > 50 ? '#FF9F0A' : '#30D158'} />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Agent Modal */}
      <CreateAgentModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(name) => showToast(`Agent '${name}' oprettet`)}
      />

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  )
}
