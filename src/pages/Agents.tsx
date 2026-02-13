import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { createAgent, ApiSession, listAgents, AgentApi } from '../api/openclaw'

/* ── Types ──────────────────────────────────────────────────── */
type AgentStatus = 'online' | 'offline' | 'working' | 'completed' | 'not-created'
type AgentCategory = 'main' | 'team' | 'sub'

interface AgentEntry {
  id: string
  name: string
  role: string
  directive: string
  bio?: string
  status: AgentStatus
  model: string
  icon: string
  iconBg: string
  category: AgentCategory
  contextPercent?: number
  activeTask?: string
  taskProgress?: number
  session?: ApiSession
}

/* ── Helper to map agent to icon ───────────────────────────── */
function getAgentIcon(name: string): { icon: string; iconBg: string } {
  const lower = name.toLowerCase()
  if (lower.includes('design')) return { icon: 'palette', iconBg: 'linear-gradient(135deg, #BF5AF2, #AF52DE)' }
  if (lower.includes('frontend') || lower.includes('ui')) return { icon: 'code', iconBg: 'linear-gradient(135deg, #FF6B35, #FF3B30)' }
  if (lower.includes('backend') || lower.includes('db') || lower.includes('api')) return { icon: 'server', iconBg: 'linear-gradient(135deg, #30D158, #34C759)' }
  if (lower.includes('projekt') || lower.includes('qa') || lower.includes('manager')) return { icon: 'clipboard', iconBg: 'linear-gradient(135deg, #FF9F0A, #FF6B35)' }
  if (lower.includes('research') || lower.includes('analyst')) return { icon: 'search', iconBg: 'linear-gradient(135deg, #5AC8FA, #007AFF)' }
  return { icon: 'robot', iconBg: 'linear-gradient(135deg, #636366, #48484A)' }
}

function buildMainAgent(sessions: ApiSession[]): AgentEntry {
  const mainSession = sessions.find(s => s.key === 'agent:main:main')
  const now = Date.now()
  const maxCtx = 200000
  if (mainSession) {
    const ctxPct = mainSession.contextTokens ? Math.min(100, Math.round((mainSession.contextTokens / maxCtx) * 100)) : 0
    return {
      id: 'main', name: 'Maison', role: 'System Orkestrering & Strategi',
      directive: 'Leder og koordinerer alle agenter i systemet. Ansvarlig for at delegere opgaver på højeste niveau, sikre kvalitet og levere resultater til Martin.',
      bio: 'Hovedintelligens og kommandør af agent-teamet. Ansvarlig for at delegere opgaver, overvåge fremgang og sikre missions-succes for alle projekter.',
      status: now - mainSession.updatedAt < 120000 ? 'online' : 'offline',
      model: mainSession.model || 'claude-opus-4-6', icon: 'brain',
      iconBg: 'linear-gradient(135deg, #007AFF, #AF52DE)', category: 'main',
      contextPercent: ctxPct, activeTask: 'System orkestrering', taskProgress: ctxPct, session: mainSession,
    }
  }
  return {
    id: 'main', name: 'Maison', role: 'System Orkestrering & Strategi',
    directive: 'Leder og koordinerer alle agenter i systemet. Ansvarlig for at delegere opgaver på højeste niveau, sikre kvalitet og levere resultater til Martin.',
    bio: 'Hovedintelligens og kommandør af agent-teamet. Ansvarlig for at delegere opgaver, overvåge fremgang og sikre missions-succes for alle projekter.',
    status: 'offline', model: 'claude-opus-4-6', icon: 'brain',
    iconBg: 'linear-gradient(135deg, #007AFF, #AF52DE)', category: 'main',
  }
}

const TEAM_AGENTS = [
  { id: 'designer', name: 'Designer', role: 'UI/UX Design', directive: 'Wireframes, prototyper, visuelt design. Apple HIG-inspireret dark mode.', bio: 'UI/UX designer med fokus på glassmorphism, SF Symbol ikoner og responsive layouts.', model: 'sonnet', comm: 'Via Projektleder' },
  { id: 'frontend', name: 'Frontend', role: 'React Udvikling', directive: 'React + TypeScript + Tailwind CSS implementering.', bio: 'Frontend-udvikler. Bygger komponenter, håndterer state og API-integration.', model: 'sonnet', comm: 'Direkte til Martin' },
  { id: 'backend', name: 'Backend', role: 'API & Database', directive: 'Supabase, PostgreSQL, Docker, server-administration.', bio: 'Backend-udvikler og DBA. API design, database modellering, integrationer.', model: 'sonnet', comm: 'Via Projektleder' },
  { id: 'projektleder', name: 'Projektleder', role: 'Koordinering & QA', directive: 'Prioritering, QA, koordinering mellem agents. Finder fejl FØR Martin.', bio: 'Projektleder der sikrer kvalitet, overholder deadlines og koordinerer teamet.', model: 'sonnet', comm: 'Direkte til Martin' },
  { id: 'marketing', name: 'Marketing', role: 'Marketing & Strategi', directive: 'Senior marketing-strateg. OrderFlow restaurant SaaS kontekst.', bio: 'Marketing-specialist med fokus på restaurationsbranchen, content og growth.', model: 'sonnet', comm: 'Via Projektleder' },
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
    const hasSession = agentSessions.length > 0
    const status: AgentStatus = activeSession ? getAgentStatus(activeSession, sessions, now) : hasSession ? 'completed' : 'offline'
    
    return {
      id: `agent-${a.id}`, name: a.name, role: a.role,
      directive: a.directive, bio: a.bio,
      status, model: a.model, icon, iconBg,
      category: 'team' as AgentCategory,
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
      id: s.key, name: label, role: 'Sub-agent',
      directive: `Session: ${s.key}`, status: isActive ? 'working' as AgentStatus : 'completed' as AgentStatus,
      model: s.model, icon: 'robot', iconBg: 'linear-gradient(135deg, #636366, #48484A)',
      category: 'sub' as AgentCategory,
      contextPercent: s.contextTokens ? Math.min(100, Math.round((s.contextTokens / 200000) * 100)) : undefined,
      session: s,
    }
  })
}

/* ── Helpers ─────────────────────────────────────────────────── */
function statusColor(s: AgentStatus) {
  return { online: '#30D158', offline: '#636366', working: '#007AFF', completed: '#30D158', 'not-created': '#636366' }[s]
}
function statusLabel(s: AgentStatus) {
  return { online: 'Online', offline: 'Offline', working: 'Arbejder', completed: 'Færdig', 'not-created': 'Ikke oprettet' }[s]
}
function statusGlow(s: AgentStatus) {
  if (s === 'online') return '0 0 8px rgba(48,209,88,0.6)'
  if (s === 'working') return '0 0 8px rgba(0,122,255,0.6)'
  return 'none'
}

/* ── Budget & Pricing ────────────────────────────────────────── */
function estimatePrice(model: string, totalTokens?: number): number {
  if (!totalTokens) return 0
  const pricePerMillion = model.includes('opus') ? 15 : model.includes('sonnet') ? 3 : model.includes('haiku') ? 0.25 : 3
  return (totalTokens / 1_000_000) * pricePerMillion
}

function formatPrice(price: number): string {
  if (price < 0.01) return '<$0.01'
  return `$${price.toFixed(2)}`
}

function getAgentStatus(session: ApiSession | undefined, allSessions: ApiSession[], now: number): AgentStatus {
  if (!session) return 'offline'
  const isRecent = now - session.updatedAt < 120000 // 2 min
  const hasSubAgents = allSessions.some(s => s.key.includes('subagent') && s.key.includes(session.key.split(':')[1]))
  if (isRecent && hasSubAgents) return 'working'
  if (isRecent) return 'online'
  return 'offline'
}

/* ── Small components ───────────────────────────────────────── */
function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: statusColor(status), boxShadow: statusGlow(status) }} />
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: statusColor(status) }}>{statusLabel(status)}</span>
    </span>
  )
}

function ProgressBar({ value, color = '#007AFF' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

/* ── Org Chart View ─────────────────────────────────────────── */
function OrgChartView({ mainAgent, teamAgents, onSelectAgent }: { mainAgent: AgentEntry; teamAgents: AgentEntry[]; onSelectAgent: (id: string) => void }) {
  return (
    <div className="relative py-8 px-4 overflow-x-auto">
      {/* Main Agent (top) */}
      <div className="flex justify-center mb-12">
        <div 
          onClick={() => onSelectAgent(mainAgent.id)}
          className="relative cursor-pointer transition-all duration-300 hover:scale-105"
          style={{ width: '200px' }}
        >
          <div className="rounded-2xl p-5 text-center" style={{
            background: 'rgba(0,122,255,0.08)',
            border: '2px solid rgba(0,122,255,0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,122,255,0.2)',
          }}>
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{
              background: mainAgent.iconBg,
              boxShadow: '0 4px 16px rgba(0,122,255,0.3)',
            }}>
              <Icon name={mainAgent.icon} size={28} className="text-white" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">{mainAgent.name}</h3>
            <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{mainAgent.role}</p>
            <div className="flex items-center justify-center gap-1.5">
              <span 
                className="w-2.5 h-2.5 rounded-full animate-pulse" 
                style={{ background: statusColor(mainAgent.status), boxShadow: statusGlow(mainAgent.status) }} 
              />
              <span className="text-[9px] font-semibold uppercase" style={{ color: statusColor(mainAgent.status) }}>
                {statusLabel(mainAgent.status)}
              </span>
            </div>
            {mainAgent.session && mainAgent.session.totalTokens && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-[9px] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Budget brugt</p>
                <p className="text-xs font-bold text-white">{formatPrice(estimatePrice(mainAgent.model, mainAgent.session.totalTokens))}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Lines */}
      {teamAgents.length > 0 && (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'rgba(0,122,255,0.4)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'rgba(175,82,222,0.4)', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          {teamAgents.map((_, i) => {
            const totalWidth = teamAgents.length * 240
            const startX = window.innerWidth < 768 ? '50%' : '50%'
            const startY = 160
            const endY = 320
            const spacing = 240
            const offset = -(totalWidth / 2) + (i * spacing) + 120
            return (
              <g key={i}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={`calc(50% + ${offset}px)`}
                  y2={endY}
                  stroke="url(#lineGradient)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
              </g>
            )
          })}
        </svg>
      )}

      {/* Team Agents (bottom) */}
      {teamAgents.length > 0 && (
        <div className="flex flex-wrap justify-center gap-6" style={{ position: 'relative', zIndex: 1 }}>
          {teamAgents.map(agent => (
            <div 
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className="cursor-pointer transition-all duration-300 hover:scale-105"
              style={{ width: '180px' }}
            >
              <div className="rounded-xl p-4 text-center" style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
              }}>
                <div className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-2.5" style={{
                  background: agent.iconBg,
                }}>
                  <Icon name={agent.icon} size={22} className="text-white" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{agent.name}</h4>
                <p className="text-[9px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.role}</p>
                <div className="flex items-center justify-center gap-1">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ background: statusColor(agent.status), boxShadow: statusGlow(agent.status) }} 
                  />
                  <span className="text-[8px] font-semibold uppercase" style={{ color: statusColor(agent.status) }}>
                    {statusLabel(agent.status)}
                  </span>
                </div>
                {agent.contextPercent !== undefined && agent.contextPercent > 0 && (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Kontekst</span>
                      <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.contextPercent}%</span>
                    </div>
                    <ProgressBar 
                      value={agent.contextPercent} 
                      color={agent.contextPercent > 80 ? '#FF453A' : agent.contextPercent > 50 ? '#FF9F0A' : '#30D158'} 
                    />
                  </div>
                )}
                {agent.session?.totalTokens && (
                  <p className="text-[9px] font-mono mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {formatPrice(estimatePrice(agent.model, agent.session.totalTokens))}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Communication Tab ───────────────────────────────────────── */
function CommunicationTab({ sessions }: { sessions: ApiSession[] }) {
  const messages = sessions
    .filter(s => s.label && s.displayName)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Agent-til-Agent Kommunikation
      </p>
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <div style={{ color: 'rgba(255,255,255,0.2)' }}>
            <Icon name="sparkle" size={32} className="mx-auto mb-3" />
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Ingen beskeder endnu</p>
        </div>
      ) : (
        messages.map(s => (
          <div key={s.key} className="rounded-xl p-4" style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                background: getAgentIcon(s.displayName || '').iconBg,
              }}>
                <Icon name={getAgentIcon(s.displayName || '').icon} size={14} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{s.displayName || s.label}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {new Date(s.updatedAt).toLocaleString('da-DK', { 
                    day: '2-digit', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded font-mono" style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)',
              }}>
                {s.model}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Session: {s.key}
            </p>
            {s.totalTokens && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Tokens: {s.totalTokens.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {formatPrice(estimatePrice(s.model, s.totalTokens))}
                </span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

/* ── Left Panel List Item ───────────────────────────────────── */
function RosterItem({ agent, selected, onClick }: { agent: AgentEntry; selected: boolean; onClick: () => void }) {
  const isMain = agent.category === 'main'
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
      style={{
        background: selected ? 'rgba(0,122,255,0.15)' : 'transparent',
        border: selected ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent',
        ...(isMain && !selected ? { border: '1px solid rgba(0,122,255,0.1)' } : {}),
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: agent.iconBg, boxShadow: isMain ? '0 0 12px rgba(0,122,255,0.2)' : 'none' }}>
        <Icon name={agent.icon} size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
        <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.role}</p>
      </div>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor(agent.status), boxShadow: statusGlow(agent.status) }} />
    </div>
  )
}

/* ── Right Panel Detail View ────────────────────────────────── */
function AgentDetail({ agent, onCreateTeamAgent }: { agent: AgentEntry; onCreateTeamAgent: (a: AgentEntry) => void }) {
  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 mb-6">
        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center" style={{ background: agent.iconBg, boxShadow: agent.category === 'main' ? '0 4px 24px rgba(0,122,255,0.3)' : '0 2px 12px rgba(0,0,0,0.3)' }}>
          <Icon name={agent.icon} size={36} className="text-white" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <StatusBadge status={agent.status} />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-1 leading-tight">{agent.name}</h2>
          <p className="text-sm italic mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>&quot;{agent.role}&quot;</p>
        </div>
      </div>

      {/* Missions Direktiv */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Missions Direktiv</p>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{agent.directive}</p>
      </div>

      {/* Operationel Bio */}
      {agent.bio && (
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Operationel Bio</p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{agent.bio}</p>
        </div>
      )}

      {/* Active Task */}
      {(agent.activeTask || agent.status === 'completed' || agent.status === 'working') && (
        <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Aktiv Opgave</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
              background: agent.status === 'completed' ? 'rgba(48,209,88,0.12)' : 'rgba(0,122,255,0.12)',
              color: agent.status === 'completed' ? '#30D158' : '#007AFF',
            }}>
              {statusLabel(agent.status)}
            </span>
          </div>
          <p className="text-sm font-medium text-white mb-2">{agent.activeTask || (agent.status === 'completed' ? 'Opgave fuldført' : 'Arbejder...')}</p>
          {agent.taskProgress !== undefined && (
            <ProgressBar value={agent.taskProgress} color={agent.status === 'completed' ? '#30D158' : '#007AFF'} />
          )}
          {agent.status === 'completed' && agent.taskProgress === undefined && <ProgressBar value={100} color="#30D158" />}
        </div>
      )}

      {/* Model + Context */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <span className="text-[10px] px-2.5 py-1 rounded-lg font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>{agent.model}</span>
        {agent.contextPercent !== undefined && (
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Kontekst</span>
            <div className="flex-1"><ProgressBar value={agent.contextPercent} color={agent.contextPercent > 80 ? '#FF453A' : agent.contextPercent > 50 ? '#FF9F0A' : '#30D158'} /></div>
            <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.contextPercent}%</span>
          </div>
        )}
      </div>

      {/* Budget Info */}
      {agent.session && agent.session.totalTokens && (
        <div className="rounded-xl p-4 mb-5" style={{ 
          background: 'rgba(0,122,255,0.04)', 
          border: '1px solid rgba(0,122,255,0.15)' 
        }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span style={{ color: '#007AFF' }}>
                <Icon name="zap" size={14} />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Budget Forbrug
              </p>
            </div>
            <span className="text-sm font-bold text-white">
              {formatPrice(estimatePrice(agent.model, agent.session.totalTokens))}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Tokens</p>
              <p className="font-mono font-semibold text-white">{agent.session.totalTokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Context Tokens</p>
              <p className="font-mono font-semibold text-white">{agent.session.contextTokens?.toLocaleString() || '0'}</p>
            </div>
          </div>
          {agent.contextPercent !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Budget Ramme (200k tokens)</span>
                <span className="text-[10px] font-mono font-semibold" style={{ 
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

      {/* Session info */}
      {agent.session && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Kanal</p>
            <p className="font-medium text-white">{agent.session.lastChannel || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Session ID</p>
            <p className="font-mono text-xs break-all" style={{ color: 'rgba(255,255,255,0.5)' }}>{agent.session.sessionId}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Sidst Opdateret</p>
            <p className="font-medium text-white text-xs">
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
      )}

      {/* Skills and Channels (if parsed from bio) */}
      {agent.bio && agent.bio.includes('Skills:') && (
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Skills & Kanaler</p>
          <div className="flex flex-wrap gap-2">
            {agent.bio.split('|').map((part, i) => {
              const trimmed = part.trim()
              if (!trimmed || trimmed.includes(':')) {
                const [label, value] = trimmed.split(':').map(s => s.trim())
                if (label && value) {
                  return value.split(',').map((item, j) => (
                    <span key={`${i}-${j}`} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{
                      background: label === 'Skills' ? 'rgba(0,122,255,0.15)' : 'rgba(48,209,88,0.15)',
                      border: `1px solid ${label === 'Skills' ? 'rgba(0,122,255,0.3)' : 'rgba(48,209,88,0.3)'}`,
                      color: label === 'Skills' ? '#5AC8FA' : '#30D158',
                    }}>
                      {item.trim()}
                    </span>
                  ))
                }
              }
              return null
            })}
          </div>
        </div>
      )}

      {/* Create button for planned team agents */}
      {agent.status === 'offline' && agent.category === 'team' && !agent.session && (
        <button
          onClick={() => onCreateTeamAgent(agent)}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all mt-2"
          style={{ background: 'linear-gradient(135deg, #007AFF, #AF52DE)', minHeight: '44px' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,122,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          <Icon name="user-plus" size={14} className="mr-2 inline" />
          Opret denne agent
        </button>
      )}
    </div>
  )
}

/* ── Create Agent Modal (kept from original) ────────────────── */
const MODEL_OPTIONS = ['claude-opus-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'gpt-5.2']
const SKILL_OPTIONS = ['perplexity', 'youtube-watcher', 'web-search', 'code-exec', 'browser']
const PRIORITY_OPTIONS = ['Normal', 'Høj', 'Kritisk']

function CreateAgentModal({ open, onClose, onCreated, prefill }: { open: boolean; onClose: () => void; onCreated: (name: string) => void; prefill?: AgentEntry | null }) {
  const [name, setName] = useState(prefill?.name || '')
  const [role, setRole] = useState(prefill?.role || '')
  const [directive, setDirective] = useState(prefill?.directive || '')
  const [model, setModel] = useState(prefill?.model || MODEL_OPTIONS[0])
  const [skills, setSkills] = useState<string[]>([])
  const [priority, setPriority] = useState('Normal')
  const [autoStart, setAutoStart] = useState(true)
  const [firstTask, setFirstTask] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Update when prefill changes
  const prefillId = prefill?.id
  useState(() => {
    if (prefill) { setName(prefill.name); setRole(prefill.role); setDirective(prefill.directive); setModel(prefill.model) }
  })

  const toggleSkill = (s: string) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Navn er påkrævet'); return }
    setCreating(true); setError('')
    try {
      const task = [
        directive && `Missions direktiv: ${directive}`,
        role && `Rolle: ${role}`,
        priority !== 'Normal' && `Prioritet: ${priority}`,
        firstTask && `Første opgave: ${firstTask}`,
      ].filter(Boolean).join('\n\n')
      await createAgent({ 
        name: name.trim(), 
        task: task || `Agent: ${name}`, 
        model, 
        label: name.trim().toLowerCase().replace(/\s+/g, '-'),
        skills: skills.length > 0 ? skills : undefined,
        workspace: '/data/.openclaw/workspace',
      })
      onCreated(name); onClose()
      setName(''); setRole(''); setDirective(''); setModel(MODEL_OPTIONS[0]); setSkills([]); setPriority('Normal'); setAutoStart(true); setFirstTask('')
    } catch (e: any) { setError(e.message || 'Kunne ikke oprette agent') } finally { setCreating(false) }
  }

  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '0.75rem', padding: '0.625rem 0.875rem', width: '100%', fontSize: '0.875rem', outline: 'none' }

  // Suppress unused var warnings
  void autoStart; void prefillId; void priority

  return (
    <Modal open={open} onClose={onClose} title="Opret Ny Agent">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Navn *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="f.eks. Research Agent" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Rolle</label>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="f.eks. Frontend Udvikler" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Missions Direktiv</label>
          <textarea value={directive} onChange={e => setDirective(e.target.value)} placeholder="Beskriv hvad agenten skal gøre..." rows={3} style={inputStyle} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Model</label>
          <select value={model} onChange={e => setModel(e.target.value)} style={inputStyle}>
            {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Skills</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map(s => (
              <button key={s} onClick={() => toggleSkill(s)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                background: skills.includes(s) ? 'rgba(0,122,255,0.2)' : 'rgba(255,255,255,0.06)',
                border: skills.includes(s) ? '1px solid rgba(0,122,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: skills.includes(s) ? '#5AC8FA' : 'rgba(255,255,255,0.5)',
              }}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Prioritet</label>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map(p => (
              <button key={p} onClick={() => setPriority(p)} className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all" style={{
                background: priority === p ? (p === 'Kritisk' ? 'rgba(255,69,58,0.2)' : p === 'Høj' ? 'rgba(255,159,10,0.2)' : 'rgba(0,122,255,0.2)') : 'rgba(255,255,255,0.06)',
                border: priority === p ? `1px solid ${p === 'Kritisk' ? 'rgba(255,69,58,0.4)' : p === 'Høj' ? 'rgba(255,159,10,0.4)' : 'rgba(0,122,255,0.4)'}` : '1px solid rgba(255,255,255,0.08)',
                color: priority === p ? (p === 'Kritisk' ? '#FF453A' : p === 'Høj' ? '#FF9F0A' : '#007AFF') : 'rgba(255,255,255,0.5)',
                minHeight: '44px',
              }}>{p}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Automatisk Start</label>
          <button onClick={() => setAutoStart(!autoStart)} className="w-11 h-6 rounded-full transition-all relative" style={{ background: autoStart ? '#007AFF' : 'rgba(255,255,255,0.15)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: autoStart ? '22px' : '2px' }} />
          </button>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Første Opgave (valgfri)</label>
          <textarea value={firstTask} onChange={e => setFirstTask(e.target.value)} placeholder="Hvad skal agenten gøre først?" rows={2} style={inputStyle} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={handleSubmit} disabled={creating} className="w-full py-3 rounded-xl font-semibold text-white transition-all"
          style={{ background: creating ? 'rgba(0,122,255,0.3)' : 'linear-gradient(135deg, #007AFF, #AF52DE)', opacity: creating ? 0.6 : 1, minHeight: '44px' }}>
          {creating ? 'Opretter...' : 'Opret Agent'}
        </button>
      </div>
    </Modal>
  )
}

/* ── Toast ───────────────────────────────────────────────────── */
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium text-white transition-all duration-500" style={{
      background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.3)', backdropFilter: 'blur(20px)',
      transform: visible ? 'translateY(0)' : 'translateY(20px)', opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
    }}>
      <Icon name="check" size={14} className="text-green-400 mr-2 inline" />{message}
    </div>
  )
}

/* ── Tab type ────────────────────────────────────────────────── */
type TabFilter = 'alle' | 'team' | 'sub' | 'kommunikation'
type ViewMode = 'org-chart' | 'list'

/* ── Main Page ──────────────────────────────────────────────── */
export default function Agents() {
  const { isConnected, sessions } = useLiveData()
  const [selectedId, setSelectedId] = useState<string>('main')
  const [tab, setTab] = useState<TabFilter>('alle')
  const [viewMode, setViewMode] = useState<ViewMode>('org-chart')
  const [showCreate, setShowCreate] = useState(false)
  const [prefillAgent, setPrefillAgent] = useState<AgentEntry | null>(null)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [apiAgents, setApiAgents] = useState<AgentApi[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch agents from API
  useEffect(() => {
    if (!isConnected) return
    const fetchAgents = async () => {
      try {
        const agents = await listAgents()
        setApiAgents(agents)
      } catch (e) {
        console.error('Failed to fetch agents:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
    const interval = setInterval(fetchAgents, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [isConnected])

  const mainAgent = buildMainAgent(isConnected ? sessions : [])
  const teamAgents = buildTeamAgents(apiAgents, isConnected ? sessions : [])
  const subAgents = buildSubAgents(isConnected ? sessions : [])
  const allAgents: AgentEntry[] = [mainAgent, ...teamAgents, ...subAgents]

  const selected = allAgents.find(a => a.id === selectedId) || mainAgent

  const filteredAgents = (() => {
    if (tab === 'team') return teamAgents
    if (tab === 'sub') return subAgents
    return allAgents
  })()

  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000)
  }

  const handleCreateTeamAgent = (agent: AgentEntry) => {
    setPrefillAgent(agent)
    setShowCreate(true)
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'alle', label: 'Alle' },
    { key: 'team', label: 'Team' },
    { key: 'sub', label: 'Sub-Agenter' },
    { key: 'kommunikation', label: 'Kommunikation' },
  ]

  // Suppress unused var
  void loading

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Agenter</h1>
          <p className="caption">{allAgents.length} agenter · {allAgents.filter(a => a.status === 'online' || a.status === 'working').length} aktive</p>
        </div>
        <button onClick={() => { setPrefillAgent(null); setShowCreate(true) }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all w-full sm:w-auto justify-center"
          style={{ background: 'linear-gradient(135deg, #007AFF, #AF52DE)', minHeight: '44px', minWidth: '44px' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,122,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
          <Icon name="user-plus" size={16} />
          <span className="hidden sm:inline">Opret Agent</span>
          <span className="sm:hidden">Opret</span>
        </button>
      </div>

      {/* Tabs & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
        <div className="overflow-x-auto">
          <div className="flex gap-1 p-1 rounded-xl w-fit min-w-full sm:min-w-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap"
                style={{
                  background: tab === t.key ? 'rgba(0,122,255,0.2)' : 'transparent',
                  color: tab === t.key ? '#5AC8FA' : 'rgba(255,255,255,0.4)',
                  border: tab === t.key ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent',
                  minHeight: '44px',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        
        {tab !== 'kommunikation' && (
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <button
              onClick={() => setViewMode('org-chart')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
              style={{
                background: viewMode === 'org-chart' ? 'rgba(0,122,255,0.2)' : 'transparent',
                color: viewMode === 'org-chart' ? '#5AC8FA' : 'rgba(255,255,255,0.4)',
                border: viewMode === 'org-chart' ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent',
                minHeight: '44px',
              }}
            >
              <Icon name="chart-bar" size={14} />
              <span className="hidden sm:inline">Diagram</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
              style={{
                background: viewMode === 'list' ? 'rgba(0,122,255,0.2)' : 'transparent',
                color: viewMode === 'list' ? '#5AC8FA' : 'rgba(255,255,255,0.4)',
                border: viewMode === 'list' ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent',
                minHeight: '44px',
              }}
            >
              <Icon name="list" size={14} />
              <span className="hidden sm:inline">Liste</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      {tab === 'kommunikation' ? (
        <div className="rounded-2xl p-6 overflow-y-auto flex-1" style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        }}>
          <CommunicationTab sessions={isConnected ? sessions : []} />
        </div>
      ) : viewMode === 'org-chart' && tab === 'alle' ? (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="rounded-2xl overflow-y-auto flex-1" style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
          }}>
            <OrgChartView 
              mainAgent={mainAgent} 
              teamAgents={teamAgents} 
              onSelectAgent={setSelectedId}
            />
          </div>
          
          {/* Selected Agent Detail (below org chart on mobile, side panel on desktop) */}
          <div className="lg:hidden rounded-2xl p-6 overflow-y-auto" style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
          }}>
            <AgentDetail agent={selected} onCreateTeamAgent={handleCreateTeamAgent} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* Left Panel — Roster */}
          <div className="w-full lg:w-[300px] flex-shrink-0 rounded-2xl p-4 overflow-y-auto max-h-[400px] lg:max-h-none" style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
          }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 px-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Agent Roster
            </p>

            {/* Show by category when 'alle' */}
            {tab === 'alle' ? (
              <>
                {/* Hovedagent */}
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2 mt-2 px-1" style={{ color: 'rgba(0,122,255,0.6)' }}>Hovedagent</p>
                <RosterItem agent={mainAgent} selected={selectedId === mainAgent.id} onClick={() => setSelectedId(mainAgent.id)} />

                {/* Team */}
                {teamAgents.length > 0 && (
                  <>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2 mt-4 px-1" style={{ color: 'rgba(175,82,222,0.6)' }}>Team Agenter</p>
                    {teamAgents.map(a => <RosterItem key={a.id} agent={a} selected={selectedId === a.id} onClick={() => setSelectedId(a.id)} />)}
                  </>
                )}

                {/* Sub-agents */}
                {subAgents.length > 0 && (
                  <>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2 mt-4 px-1" style={{ color: 'rgba(99,99,102,0.8)' }}>Sub-Agenter</p>
                    {subAgents.map(a => <RosterItem key={a.id} agent={a} selected={selectedId === a.id} onClick={() => setSelectedId(a.id)} />)}
                  </>
                )}
              </>
            ) : (
              <>
                {filteredAgents.length === 0 && (
                  <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {tab === 'sub' ? 'Ingen aktive sub-agenter' : 'Ingen agenter'}
                  </p>
                )}
                {filteredAgents.map(a => <RosterItem key={a.id} agent={a} selected={selectedId === a.id} onClick={() => setSelectedId(a.id)} />)}
              </>
            )}
          </div>

          {/* Right Panel — Detail */}
          <div className="flex-1 rounded-2xl p-6 overflow-y-auto" style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
          }}>
            <AgentDetail agent={selected} onCreateTeamAgent={handleCreateTeamAgent} />
          </div>
        </div>
      )}
      
      {/* Desktop: side detail panel for org-chart */}
      {viewMode === 'org-chart' && tab === 'alle' && (
        <div className="hidden lg:block fixed right-6 top-24 w-[360px] max-h-[calc(100vh-120px)] rounded-2xl p-6 overflow-y-auto" style={{
          background: 'rgba(10,10,15,0.95)', 
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(40px)', 
          WebkitBackdropFilter: 'blur(40px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <AgentDetail agent={selected} onCreateTeamAgent={handleCreateTeamAgent} />
        </div>
      )}

      {/* Create Modal */}
      <CreateAgentModal open={showCreate} onClose={() => { setShowCreate(false); setPrefillAgent(null) }}
        onCreated={(name) => showToast(`Agent '${name}' oprettet`)} prefill={prefillAgent} />

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  )
}