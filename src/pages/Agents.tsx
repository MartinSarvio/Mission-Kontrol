import { useState } from 'react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { agents as mockAgents } from '../data/mock'
import { useLiveData } from '../api/LiveDataContext'
import { Agent } from '../types'
import { ApiSession } from '../api/openclaw'

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-orange-600" style={{ background: 'rgba(255,149,0,0.1)' }}>
      Demo data
    </span>
  )
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60000) return 'lige nu'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min siden`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}t siden`
  return `${Math.floor(diff / 86400000)}d siden`
}

function SessionCard({ session, onClick }: { session: ApiSession; onClick: () => void }) {
  const isActive = Date.now() - session.updatedAt < 120000
  const isMain = session.key === 'agent:main:main'

  return (
    <Card className="cursor-pointer" style={isMain ? { border: '1px solid rgba(0,122,255,0.15)' } : undefined}>
      <div onClick={onClick} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`${isMain ? 'w-12 h-12' : 'w-10 h-10'} rounded-full flex items-center justify-center text-lg font-${isMain ? 'bold' : 'medium'}`}
            style={isMain ? { background: 'linear-gradient(135deg, #007AFF, #AF52DE)', color: 'white' } : { background: 'rgba(0,0,0,0.04)', color: '#636366' }}>
            {(session.label || 'H').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${isMain ? 'text-lg' : ''}`}>{session.label || (isMain ? 'Hovedagent' : session.key)}</span>
              <StatusBadge status={isActive ? 'running' : 'completed'} />
            </div>
            <p className="caption">{session.key}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right"><p className="font-medium">{formatTimeAgo(session.updatedAt)}</p><p className="caption">sidst aktiv</p></div>
          <div className="text-right"><p className="font-medium">{session.model}</p><p className="caption">model</p></div>
          {session.contextTokens && (
            <div className="text-right"><p className="font-medium">{Math.round(session.contextTokens / 1000)}k</p><p className="caption">kontekst</p></div>
          )}
          <div className="text-right"><p className="font-medium">{session.lastChannel}</p><p className="caption">kanal</p></div>
        </div>
      </div>
    </Card>
  )
}

export default function Agents() {
  const { isConnected, sessions } = useLiveData()
  const [selectedSession, setSelectedSession] = useState<ApiSession | null>(null)
  const [selectedMock, setSelectedMock] = useState<Agent | null>(null)

  const useLive = isConnected && sessions.length > 0

  if (useLive) {
    const mainSession = sessions.find(s => s.key === 'agent:main:main')
    const subSessions = sessions.filter(s => s.key !== 'agent:main:main')

    return (
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="page-title">Agenter</h1>
        </div>
        <p className="caption mb-6">{sessions.length} live sessioner</p>

        {mainSession && (
          <div className="mb-6">
            <h2 className="section-title mb-3">Hovedagent</h2>
            <SessionCard session={mainSession} onClick={() => setSelectedSession(mainSession)} />
          </div>
        )}

        {subSessions.length > 0 && (
          <>
            <h2 className="section-title mb-3">Sub-agenter</h2>
            <div className="grid grid-cols-1 gap-4">
              {subSessions.map(s => (
                <SessionCard key={s.key} session={s} onClick={() => setSelectedSession(s)} />
              ))}
            </div>
          </>
        )}

        <Modal open={!!selectedSession} onClose={() => setSelectedSession(null)} title={selectedSession?.label || selectedSession?.key || ''}>
          {selectedSession && (
            <div className="space-y-5 text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge status={Date.now() - selectedSession.updatedAt < 120000 ? 'running' : 'completed'} />
                <span style={{ color: '#636366' }}>{selectedSession.model}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="caption">Session Key</p><p className="font-medium font-mono text-xs break-all">{selectedSession.key}</p></div>
                <div><p className="caption">Session ID</p><p className="font-medium font-mono text-xs break-all">{selectedSession.sessionId}</p></div>
                <div><p className="caption">Kanal</p><p className="font-medium">{selectedSession.lastChannel}</p></div>
                <div><p className="caption">Sidst Aktiv</p><p className="font-medium">{formatTimeAgo(selectedSession.updatedAt)}</p></div>
                <div><p className="caption">Model</p><p className="font-medium">{selectedSession.model}</p></div>
                <div><p className="caption">Kontekst</p><p className="font-medium">{selectedSession.contextTokens ? `${Math.round(selectedSession.contextTokens / 1000)}k / ${Math.round((selectedSession.totalTokens || 0) / 1000)}k` : 'N/A'}</p></div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    )
  }

  // Fallback to mock
  const mainAgent = mockAgents.find(a => a.name === 'Hovedagent')
  const subAgents = mockAgents.filter(a => a.name !== 'Hovedagent')

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="page-title">Agenter</h1>
        <DemoBadge />
      </div>
      <p className="caption mb-6">{mockAgents.length} agenter konfigureret</p>

      {mainAgent && (
        <div className="mb-6">
          <h2 className="section-title mb-3">Hovedagent</h2>
          <Card className="cursor-pointer" style={{ border: '1px solid rgba(0,122,255,0.15)' }}>
            <div onClick={() => setSelectedMock(mainAgent)} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">H</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{mainAgent.name}</span>
                    <StatusBadge status={mainAgent.status} />
                  </div>
                  <p className="caption">{mainAgent.purpose}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right"><p className="font-medium">{mainAgent.model}</p><p className="caption">model</p></div>
                <div className="text-right"><p className="font-medium">200k</p><p className="caption">kontekst</p></div>
                <div className="text-right"><p className="font-medium">Telegram</p><p className="caption">kanal</p></div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <h2 className="section-title mb-3">Sub-agenter</h2>
      <div className="grid grid-cols-1 gap-4">
        {subAgents.map(a => (
          <Card key={a.id} className="cursor-pointer">
            <div onClick={() => setSelectedMock(a)} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium" style={{ background: 'rgba(0,0,0,0.04)', color: '#636366' }}>{a.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{a.name}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="caption">{a.purpose}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right"><p className="font-medium">{a.lastRun}</p><p className="caption">status</p></div>
                <div className="text-right"><p className="font-medium">{a.model}</p><p className="caption">model</p></div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!selectedMock} onClose={() => setSelectedMock(null)} title={selectedMock?.name || ''}>
        {selectedMock && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedMock.status} />
              <span style={{ color: '#636366' }}>{selectedMock.model}</span>
            </div>
            <div>
              <p className="caption mb-1">Systeminstruktioner</p>
              <p className="p-3 rounded-xl" style={{ background: 'rgba(245,245,247,0.5)' }}>{selectedMock.instructions}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="caption mb-1">Værktøjer</p>
                <div className="flex flex-wrap gap-1">{selectedMock.tools.map(t => <span key={t} className="px-2 py-0.5 rounded-lg text-xs text-blue-600" style={{ background: 'rgba(0,122,255,0.08)' }}>{t}</span>)}</div>
              </div>
              <div>
                <p className="caption mb-1">Færdigheder</p>
                <div className="flex flex-wrap gap-1">
                  {selectedMock.skills.length > 0
                    ? selectedMock.skills.map(s => <span key={s} className="px-2 py-0.5 rounded-lg text-xs text-green-600" style={{ background: 'rgba(52,199,89,0.08)' }}>{s}</span>)
                    : <span style={{ color: '#86868b' }}>Ingen</span>
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
