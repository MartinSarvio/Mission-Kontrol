import { useLiveData } from '../api/LiveDataContext'
import Icon from './Icon'

interface MaisonFlyoutProps {
  isOpen: boolean
  onClose: () => void
}

export default function MaisonFlyout({ isOpen, onClose }: MaisonFlyoutProps) {
  const { sessions } = useLiveData()
  
  if (!isOpen) return null

  const mainSession = sessions.find(s => s.kind === 'main')

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50" 
        style={{ background: 'rgba(0,0,0,0.85)' }} 
        onClick={onClose} 
      />
      
      {/* Flyout Panel */}
      <div 
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] z-50 overflow-y-auto flex flex-col"
        style={{
          background: 'rgba(10,10,15,0.98)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center" 
                style={{ 
                  background: 'linear-gradient(135deg, #007AFF, #AF52DE)',
                  boxShadow: '0 4px 16px rgba(0, 122, 255, 0.3)'
                }}
              >
                <Icon name="brain" size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Maison</h2>
                <p className="text-xs text-white/40">System Orkestrering</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <Icon name="xmark" size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-4">
          {/* Status Section */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-sm font-semibold text-white mb-3">System Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Model</span>
                <span className="font-mono text-white/70">Claude Opus 4.6</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Status</span>
                <span className="text-[#30D158] font-semibold">Online</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Aktive Sessions</span>
                <span className="font-mono text-white/70">{sessions.length}</span>
              </div>
              {mainSession?.contextTokens && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Context</span>
                    <span className="font-mono text-white/70">
                      {Math.round(mainSession.contextTokens / 1000)}K / 200K
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ 
                      width: `${Math.min(100, Math.round((mainSession.contextTokens / 200000) * 100))}%`,
                      background: mainSession.contextTokens > 160000 ? '#FF453A' : mainSession.contextTokens > 100000 ? '#FF9F0A' : '#30D158',
                      boxShadow: `0 0 8px ${mainSession.contextTokens > 160000 ? 'rgba(255, 69, 58, 0.5)' : mainSession.contextTokens > 100000 ? 'rgba(255, 159, 10, 0.5)' : 'rgba(48, 209, 88, 0.5)'}`
                    }} />
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Kanal</span>
                <span className="font-mono text-white/70">Telegram</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Hjerterytme</span>
                <span className="font-mono text-white/70">Hvert 60 min</span>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-sm font-semibold text-white mb-3">Capabilities</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: 'doc', label: 'Fil Operationer' },
                { icon: 'gear', label: 'Shell Commands' },
                { icon: 'magnifying-glass', label: 'Web Søgning' },
                { icon: 'robot', label: 'Sub-agents' },
                { icon: 'brain', label: 'Context Aware' },
                { icon: 'sparkle', label: 'Tool Execution' },
              ].map(cap => (
                <div 
                  key={cap.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <Icon name={cap.icon} size={14} className="text-blue-400" />
                  <span className="text-xs text-white/70">{cap.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-sm font-semibold text-white mb-3">Seneste Aktivitet</h3>
            <div className="space-y-2">
              {sessions.slice(0, 5).map(session => (
                <div 
                  key={session.sessionId}
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: '#30D158' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">
                      {session.label || session.displayName || 'Unavngiven'}
                    </p>
                    <p className="text-xs text-white/30">
                      {session.kind} · {new Date(session.updatedAt).toLocaleTimeString('da-DK', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
