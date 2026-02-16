import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { createAgent, ApiSession, invokeToolRaw } from '../api/openclaw'

/* ── Types ──────────────────────────────────────────────────── */
type AgentStatus = 'online' | 'offline' | 'working'

interface OrgAgent {
  id: string
  name: string
  role: string
  icon: string
  iconBg: string
  model?: string
  status?: AgentStatus
  contextPercent?: number
  session?: ApiSession
  children?: OrgAgent[]
}

interface WorkspaceInfo {
  agent: string
  path: string
  exists: boolean
  files: string[]
}

/* ── Helper Functions ────────────────────────────────────────── */
function statusColor(s: AgentStatus) {
  return { online: '#30D158', offline: '#636366', working: '#007AFF' }[s]
}

function statusLabel(s: AgentStatus) {
  return { online: 'Online', offline: 'Offline', working: 'Arbejder' }[s]
}

function getAgentStatus(sessions: ApiSession[], agentId: string): { status: AgentStatus; session?: ApiSession; contextPercent?: number } {
  const now = Date.now()
  const maxCtx = 200000
  
  let agentSession: ApiSession | undefined
  
  if (agentId === 'main') {
    agentSession = sessions.find(s => s.key === 'agent:main:main')
  } else {
    agentSession = sessions.find(s => {
      const label = (s.label || '').toLowerCase()
      const display = (s.displayName || '').toLowerCase()
      return label.includes(agentId) || display.includes(agentId) || s.key.includes(agentId)
    })
  }
  
  if (agentSession) {
    const isActive = now - agentSession.updatedAt < 120000
    const ctxPct = agentSession.contextTokens ? Math.min(100, Math.round((agentSession.contextTokens / maxCtx) * 100)) : 0
    return {
      status: isActive ? 'online' : 'offline',
      session: agentSession,
      contextPercent: ctxPct,
    }
  }
  
  return { status: 'offline' }
}

/* ── Org Chart Data ──────────────────────────────────────────── */
function buildOrgChart(sessions: ApiSession[]): OrgAgent {
  const maisonData = getAgentStatus(sessions, 'main')
  const elonData = getAgentStatus(sessions, 'elon')
  const garyData = getAgentStatus(sessions, 'gary')
  const warrenData = getAgentStatus(sessions, 'warren')
  
  // Find sub-agents
  const subAgents = sessions.filter(s => s.key.includes('subagent'))
  
  return {
    id: 'martin',
    name: 'Martin',
    role: 'CEO — Vision & Strategi',
    icon: 'user',
    iconBg: 'linear-gradient(135deg, #FFD700, #FF8C00)',
    children: [
      {
        id: 'main',
        name: 'Maison',
        role: 'COO — Research, Delegation, Orkestrering',
        icon: 'brain',
        iconBg: 'linear-gradient(135deg, #007AFF, #AF52DE)',
        model: 'Opus 4.6',
        ...maisonData,
        children: [
          {
            id: 'elon',
            name: 'Elon',
            role: 'CTO — Backend, Frontend, DevOps, QA',
            icon: 'rocket',
            iconBg: 'linear-gradient(135deg, #FF3B30, #FF6B35)',
            model: 'Sonnet 4.5',
            ...elonData,
            children: [
              {
                id: 'frontend-sub',
                name: 'Frontend',
                role: 'React Udvikling',
                icon: 'code',
                iconBg: 'linear-gradient(135deg, #FF6B35, #FF3B30)',
              },
              {
                id: 'backend-sub',
                name: 'Backend',
                role: 'API & Database',
                icon: 'server',
                iconBg: 'linear-gradient(135deg, #30D158, #34C759)',
              },
              {
                id: 'tester-sub',
                name: 'Tester',
                role: 'QA & Testing',
                icon: 'magnifying-glass',
                iconBg: 'linear-gradient(135deg, #5AC8FA, #007AFF)',
              },
            ],
          },
          {
            id: 'gary',
            name: 'Gary',
            role: 'CMO — Content, YouTube, Newsletter, Social',
            icon: 'megaphone',
            iconBg: 'linear-gradient(135deg, #FF9F0A, #FFCC00)',
            model: 'Sonnet 4.5',
            ...garyData,
            children: [
              {
                id: 'content-sub',
                name: 'Content',
                role: 'Content Creation',
                icon: 'doc-text',
                iconBg: 'linear-gradient(135deg, #FF9F0A, #FFCC00)',
              },
            ],
          },
          {
            id: 'warren',
            name: 'Warren',
            role: 'CRO — Produkter, Vækst, Community',
            icon: 'chart-bar',
            iconBg: 'linear-gradient(135deg, #30D158, #34C759)',
            model: 'Sonnet 4.5',
            ...warrenData,
            children: [
              {
                id: 'product-sub',
                name: 'Product',
                role: 'Produktudvikling',
                icon: 'lightbulb',
                iconBg: 'linear-gradient(135deg, #30D158, #34C759)',
              },
            ],
          },
        ],
      },
    ],
  }
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

/* ── Org Chart Node ──────────────────────────────────────────── */
function OrgNode({ agent, onClick, size = 'normal' }: { agent: OrgAgent; onClick: () => void; size?: 'large' | 'normal' | 'small' }) {
  const sizeStyles = {
    large: { width: 'w-64', iconSize: 48, padding: 'p-6' },
    normal: { width: 'w-44', iconSize: 32, padding: 'p-4' },
    small: { width: 'w-36', iconSize: 24, padding: 'p-3' },
  }[size]

  return (
    <div
      onClick={onClick}
      className={`${sizeStyles.width} ${sizeStyles.padding} rounded-xl cursor-pointer transition-all duration-300`}
      style={{
        background: agent.status ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,122,255,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div 
        className={`${size === 'large' ? 'w-20 h-20' : size === 'normal' ? 'w-16 h-16' : 'w-12 h-12'} rounded-xl flex items-center justify-center mx-auto mb-3`}
        style={{ background: agent.iconBg }}
      >
        <Icon name={agent.icon} size={sizeStyles.iconSize} className="text-white" />
      </div>
      
      <h3 className={`${size === 'large' ? 'text-lg' : 'text-base'} font-bold text-white text-center mb-1`}>{agent.name}</h3>
      <p className="text-xs text-center mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.role}</p>
      
      {agent.status && <div className="flex justify-center"><StatusBadge status={agent.status} /></div>}
      
      {agent.model && (
        <p className="text-xs text-center mt-2 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.model}</p>
      )}
      
      {agent.contextPercent !== undefined && agent.contextPercent > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Context</span>
            <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{agent.contextPercent}%</span>
          </div>
          <ProgressBar 
            value={agent.contextPercent} 
            color={agent.contextPercent > 80 ? '#FF453A' : agent.contextPercent > 50 ? '#FF9F0A' : '#30D158'} 
          />
        </div>
      )}
    </div>
  )
}

/* ── Org Chart View ──────────────────────────────────────────── */
function OrgChartView({ orgChart, onSelectAgent }: { orgChart: OrgAgent; onSelectAgent: (agent: OrgAgent) => void }) {
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Martin (CEO) */}
      <div className="flex flex-col items-center">
        <OrgNode agent={orgChart} onClick={() => onSelectAgent(orgChart)} size="normal" />
        <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.15)' }} />
      </div>
      
      {/* Maison (COO) */}
      {orgChart.children && orgChart.children.length > 0 && (
        <div className="flex flex-col items-center">
          <OrgNode agent={orgChart.children[0]} onClick={() => orgChart.children && onSelectAgent(orgChart.children[0])} size="large" />
          <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.15)' }} />
          
          {/* Horizontal line for department heads */}
          <div className="relative w-full" style={{ height: '1px', background: 'rgba(255,255,255,0.15)', width: '800px', maxWidth: '90vw' }}>
            <div className="absolute left-0 w-px h-8" style={{ background: 'rgba(255,255,255,0.15)', top: '0' }} />
            <div className="absolute left-1/2 -translate-x-1/2 w-px h-8" style={{ background: 'rgba(255,255,255,0.15)', top: '0' }} />
            <div className="absolute right-0 w-px h-8" style={{ background: 'rgba(255,255,255,0.15)', top: '0' }} />
          </div>
          
          {/* Department Heads (Elon, Gary, Warren) */}
          <div className="flex gap-8 mt-8 flex-wrap justify-center">
            {orgChart.children[0].children && orgChart.children[0].children.map((dept) => (
              <div key={dept.id} className="flex flex-col items-center">
                <OrgNode agent={dept} onClick={() => onSelectAgent(dept)} size="normal" />
                
                {/* Sub-agents */}
                {dept.children && dept.children.length > 0 && (
                  <>
                    <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.15)' }} />
                    <div className="flex gap-3">
                      {dept.children.map((sub) => (
                        <OrgNode key={sub.id} agent={sub} onClick={() => onSelectAgent(sub)} size="small" />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Standups View ──────────────────────────────────────────── */
interface StandupSession {
  key: string
  label: string
  updatedAt: number
  status: string
  lastMessage?: string
}

function StandupsView() {
  const [showModal, setShowModal] = useState(false)
  const [topic, setTopic] = useState('')
  const [participants, setParticipants] = useState<Record<string, boolean>>({
    maison: true, elon: true, gary: true, warren: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [standups, setStandups] = useState<StandupSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [expandedMessages, setExpandedMessages] = useState<{ role: string; text: string }[]>([])
  const [actionItems, setActionItems] = useState<{ text: string; done: boolean }[]>([])

  const participantList = [
    { id: 'maison', name: 'Maison', color: '#007AFF', bg: 'rgba(0,122,255,0.15)' },
    { id: 'elon', name: 'Elon', color: '#FF3B30', bg: 'rgba(255,59,48,0.15)' },
    { id: 'gary', name: 'Gary', color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)' },
    { id: 'warren', name: 'Warren', color: '#30D158', bg: 'rgba(48,209,88,0.15)' },
  ]

  // Fetch standup sessions
  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await invokeToolRaw('sessions_list', { messageLimit: 5, limit: 50 }) as any
        const text = data.result?.content?.[0]?.text
        let raw: any[] = []
        if (text) { try { raw = JSON.parse(text).sessions || [] } catch { /* */ } }
        if (!raw.length && data.result?.details?.sessions) raw = data.result.details.sessions

        const standupSessions = raw
          .filter((s: any) => (s.label || '').startsWith('standup-'))
          .map((s: any) => {
            const lastMsg = s.lastMessages?.filter((m: any) => m.role === 'assistant')?.pop()
            return {
              key: s.key,
              label: s.label || '',
              updatedAt: s.updatedAt,
              status: Date.now() - s.updatedAt < 120000 ? 'active' : 'done',
              lastMessage: typeof lastMsg?.content === 'string' ? lastMsg.content : lastMsg?.content?.[0]?.text || lastMsg?.text || '',
            }
          })
          .sort((a: StandupSession, b: StandupSession) => b.updatedAt - a.updatedAt)

        setStandups(standupSessions)
      } catch (e) {
        console.error('Fejl ved hentning af standups:', e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
    const interval = setInterval(fetch, 10000)
    return () => clearInterval(interval)
  }, [])

  // Start standup
  const handleStartStandup = async () => {
    if (!topic.trim()) return
    setSubmitting(true)
    const activeParticipants = Object.entries(participants).filter(([, v]) => v).map(([k]) => k)
    const today = new Date().toISOString().split('T')[0]
    const prompt = `Du er facilitator for et standup-moede.

Emne: ${topic}
Deltagere: ${activeParticipants.join(', ')}

Instruktioner:
1. Start med at prasentere emnet
2. Gaa igennem hver deltager og bed om status/input
3. Diskuter eventuelle blokeringer
4. Opsummer med konkrete action items i formatet:
   - [ ] Action item beskrivelse (@ansvarlig)

Hold moedet kort og fokuseret. Alle tekster paa dansk.`

    try {
      await invokeToolRaw('sessions_spawn', {
        task: prompt,
        label: `standup-${today}`,
        agentId: 'main',
      })
      setShowModal(false)
      setTopic('')
    } catch (e) {
      console.error('Fejl ved start af standup:', e)
    } finally {
      setSubmitting(false)
    }
  }

  // Expand standup to see result
  const handleExpand = async (standup: StandupSession) => {
    if (expandedKey === standup.key) {
      setExpandedKey(null)
      return
    }
    setExpandedKey(standup.key)

    try {
      const data = await invokeToolRaw('sessions_history', { sessionKey: standup.key, limit: 50, includeTools: false }) as any
      const text = data.result?.content?.[0]?.text
      let msgs: any[] = []
      if (text) { try { msgs = JSON.parse(text).messages || [] } catch { /* */ } }
      if (!msgs.length && data.result?.details?.messages) msgs = data.result.details.messages

      const mapped = msgs.map((m: any) => ({
        role: m.role,
        text: typeof m.content === 'string' ? m.content : m.content?.[0]?.text || m.text || '',
      }))
      setExpandedMessages(mapped)

      // Parse action items from last assistant message
      const lastAssistant = mapped.filter((m: { role: string }) => m.role === 'assistant').pop()
      if (lastAssistant) {
        const items: { text: string; done: boolean }[] = []
        const lines = lastAssistant.text.split('\n')
        for (const line of lines) {
          const checkMatch = line.match(/- \[([ x])\]\s*(.+)/)
          if (checkMatch) {
            items.push({ text: checkMatch[2], done: checkMatch[1] === 'x' })
          }
        }
        setActionItems(items)
      }
    } catch (e) {
      console.error('Fejl ved hentning af standup historik:', e)
    }
  }

  const toggleAction = (idx: number) => {
    setActionItems(prev => prev.map((item, i) => i === idx ? { ...item, done: !item.done } : item))
  }

  return (
    <div className="py-8">
      {/* Start Standup Button */}
      <div className="text-center mb-8">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #007AFF, #AF52DE)' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,122,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          <Icon name="chat" size={18} />
          Start Standup
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowModal(false)} />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-6 rounded-xl"
            style={{ background: 'rgba(20,20,24,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nyt Standup</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <Icon name="xmark" size={14} className="text-white/60" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Emne</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="f.eks. Sprint Planning, Ugens status..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3 text-white">Deltagere</label>
                <div className="space-y-2">
                  {participantList.map(p => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: participants[p.id] ? p.bg : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${participants[p.id] ? p.color + '40' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={participants[p.id]}
                        onChange={e => setParticipants(prev => ({ ...prev, [p.id]: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm font-medium" style={{ color: participants[p.id] ? p.color : 'rgba(255,255,255,0.5)' }}>
                        {p.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartStandup}
                disabled={submitting || !topic.trim()}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all"
                style={{
                  background: submitting || !topic.trim() ? 'rgba(0,122,255,0.3)' : 'linear-gradient(135deg, #007AFF, #AF52DE)',
                  opacity: submitting || !topic.trim() ? 0.6 : 1,
                }}
              >
                {submitting ? 'Starter...' : 'Start Standup'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Standup History */}
      <div className="max-w-2xl mx-auto space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : standups.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Ingen standups endnu. Start det foerste standup ovenfor.
          </p>
        ) : (
          standups.map(s => (
            <div
              key={s.key}
              className="rounded-xl p-6 cursor-pointer transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={() => handleExpand(s)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">{s.label}</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(s.updatedAt).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}
                    {new Date(s.updatedAt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: s.status === 'active' ? 'rgba(0,122,255,0.15)' : 'rgba(48,209,88,0.15)',
                    color: s.status === 'active' ? '#5AC8FA' : '#30D158',
                  }}
                >
                  {s.status === 'active' ? 'Koerer' : 'Afsluttet'}
                </span>
              </div>

              {/* Expanded view */}
              {expandedKey === s.key && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Last assistant message as result */}
                  {expandedMessages.filter(m => m.role === 'assistant').length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Resultat
                      </p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {expandedMessages.filter(m => m.role === 'assistant').pop()?.text.slice(0, 1000)}
                      </p>
                    </div>
                  )}

                  {/* Action items */}
                  {actionItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Action Items
                      </p>
                      <div className="space-y-2">
                        {actionItems.map((item, idx) => (
                          <label
                            key={idx}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                            style={{ color: item.done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => toggleAction(idx)}
                              className="rounded"
                            />
                            <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ── Workspaces View ──────────────────────────────────────────── */
function WorkspacesView() {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const agents = ['main', 'elon', 'gary', 'warren', 'frontend', 'backend', 'designer']
    
    Promise.all(
      agents.map(async (agent) => {
        try {
          const result = await invokeToolRaw('exec', { 
            command: `ls -la /data/.openclaw/workspace-${agent}/ 2>/dev/null | tail -n +4 | awk '{print $9}' | grep -v '^$' | head -20` 
          }) as { output?: string }
          const files = result.output ? result.output.trim().split('\n').filter((f: string) => f && f !== '.' && f !== '..') : []
          return {
            agent,
            path: `/data/.openclaw/workspace-${agent}/`,
            exists: !result.output?.includes('No such file'),
            files,
          }
        } catch {
          return {
            agent,
            path: `/data/.openclaw/workspace-${agent}/`,
            exists: false,
            files: [],
          }
        }
      })
    ).then(results => {
      setWorkspaces(results)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
      {workspaces.map((ws) => (
        <div 
          key={ws.agent}
          className="rounded-xl p-5"
          style={{ 
            background: ws.exists ? 'rgba(48,209,88,0.05)' : 'rgba(255,255,255,0.03)', 
            border: `1px solid ${ws.exists ? 'rgba(48,209,88,0.2)' : 'rgba(255,255,255,0.08)'}` 
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: ws.exists ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.06)' }}
            >
              <Icon name="folder" size={18} style={{ color: ws.exists ? '#30D158' : 'rgba(255,255,255,0.4)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white capitalize">{ws.agent}</h3>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {ws.exists ? `${ws.files.length} filer` : 'Ikke oprettet'}
              </p>
            </div>
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: ws.exists ? '#30D158' : '#636366' }}
            />
          </div>
          
          <div className="mb-3">
            <p className="text-[10px] font-mono mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>PATH</p>
            <p className="text-xs font-mono break-all" style={{ color: 'rgba(255,255,255,0.5)' }}>{ws.path}</p>
          </div>
          
          {ws.exists && ws.files.length > 0 && (
            <div>
              <p className="text-[10px] font-mono mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>FILER</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {ws.files.slice(0, 10).map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Icon name="doc" size={10} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <span className="text-xs font-mono truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{file}</span>
                  </div>
                ))}
                {ws.files.length > 10 && (
                  <p className="text-[10px] italic" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    +{ws.files.length - 10} flere
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Detail Panel ────────────────────────────────────────────── */
function DetailPanel({ agent, onClose }: { agent: OrgAgent; onClose: () => void }) {
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
            className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: agent.iconBg }}
          >
            <Icon name={agent.icon} size={36} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-1">{agent.name}</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.role}</p>
          </div>
        </div>
        
        {agent.status && <StatusBadge status={agent.status} />}
        
        {agent.model && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Model
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {agent.model}
            </p>
          </div>
        )}
        
        {agent.session && (
          <div className="mt-6 rounded-xl p-4" style={{ background: 'rgba(0,122,255,0.04)', border: '1px solid rgba(0,122,255,0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Icon name="zap" size={14} style={{ color: '#007AFF' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Session Info
              </p>
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
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Context Forbrug</span>
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
        )}
      </div>
    </>
  )
}

/* ── Create Modal ────────────────────────────────────────────── */
function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [task, setTask] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || !task.trim()) return
    setCreating(true)
    try {
      await createAgent({ 
        name: name.trim(), 
        task: task.trim(), 
        model: 'sonnet', 
        label: name.trim().toLowerCase().replace(/\s+/g, '-') 
      })
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
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-6 rounded-xl"
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

/* ── Main Page ──────────────────────────────────────────────── */
export default function Agents() {
  const { sessions } = useLiveData()
  const [activeTab, setActiveTab] = useState<'org' | 'standups' | 'workspaces'>('org')
  const [selectedAgent, setSelectedAgent] = useState<OrgAgent | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const orgChart = buildOrgChart(sessions)

  const tabs = [
    { id: 'org' as const, label: 'Org Chart', icon: 'hierarchy' },
    { id: 'standups' as const, label: 'Standups', icon: 'chat' },
    { id: 'workspaces' as const, label: 'Workspaces', icon: 'folder' },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Agenter</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            AI-drevne team members med specialiserede roller
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
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap"
            style={{
              background: activeTab === tab.id ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.03)',
              border: activeTab === tab.id ? '1px solid rgba(0,122,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: activeTab === tab.id ? '#5AC8FA' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Icon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'org' && <OrgChartView orgChart={orgChart} onSelectAgent={setSelectedAgent} />}
        {activeTab === 'standups' && <StandupsView />}
        {activeTab === 'workspaces' && <WorkspacesView />}
      </div>

      {selectedAgent && <DetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}
      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
