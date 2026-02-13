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
  const activeSessions = sessions.filter(s => s.kind === 'main' || !s.label?.includes('completed'))
  const recentSessions = sessions.slice(0, 5)

  return (
    <>
      {/* Invisible backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose} 
      />
      
      {/* Popover — positioned next to Maison in sidebar */}
      <div 
        className="fixed z-50"
        style={{
          top: 16,
          left: 248,
          width: 380,
          background: 'rgba(18,18,24,0.97)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
          overflow: 'hidden',
          animation: 'fadeSlideIn 0.15s ease',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'linear-gradient(135deg, #007AFF, #AF52DE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'white', margin: 0 }}>Maison</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>System Orkestrering</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Icon name="xmark" size={14} className="text-white/30" />
            </button>
          </div>
        </div>

        {/* System Status */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>System Status</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            {[
              { label: 'Model', value: 'Claude Opus 4.6' },
              { label: 'Status', value: 'Online', color: '#30D158' },
              { label: 'Sessions', value: `${activeSessions.length} aktive` },
              { label: 'Kanal', value: 'Telegram' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: item.color || 'rgba(255,255,255,0.8)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Capabilities */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Capabilities</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Fil Operationer', 'Shell', 'Web Søgning', 'Sub-agents', 'Browser', 'Cron'].map((cap, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 4,
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)',
              }}>{cap}</span>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ padding: '14px 20px', maxHeight: 180, overflowY: 'auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Seneste Aktivitet</p>
          {recentSessions.length > 0 ? recentSessions.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
              borderBottom: i < recentSessions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: s.kind === 'main' ? '#30D158' : '#007AFF',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.label || s.key || 'Session'}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: 0 }}>{s.kind}</p>
              </div>
            </div>
          )) : (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Ingen sessioner</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
