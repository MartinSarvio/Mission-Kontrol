import { useState, useEffect } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import { useNotifications, NotificationType } from '../api/NotificationContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { SkeletonCard, SkeletonRow } from '../components/SkeletonLoader'

const typeConfig: Record<NotificationType, { icon: string; color: string; bg: string; label: string }> = {
  error: { icon: 'exclamation-triangle', color: '#FF3B30', bg: 'rgba(255,59,48,0.1)', label: 'Fejl' },
  warning: { icon: 'exclamation-triangle', color: '#FF9F0A', bg: 'rgba(255,159,10,0.1)', label: 'Advarsel' },
  info: { icon: 'info', color: '#007AFF', bg: 'rgba(0,122,255,0.1)', label: 'Info' },
  success: { icon: 'check-circle', color: '#30D158', bg: 'rgba(48,209,88,0.1)', label: 'Succes' },
}

type Filter = 'all' | NotificationType

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Notifications() {
  usePageTitle('Notifikationer')
  
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, dismissNotification } = useNotifications()
  const [filter, setFilter] = useState<Filter>('all')
  const [isLoading, setIsLoading] = useState(true)

  // Simulate initial load - notifications load instantly from context but we want smooth UX
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter)
  const errorCount = notifications.filter(n => n.type === 'error').length
  const warningCount = notifications.filter(n => n.type === 'warning').length

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: 'all', label: 'Alle', count: notifications.length },
    { id: 'error', label: 'Fejl', count: errorCount },
    { id: 'warning', label: 'Advarsler', count: warningCount },
    { id: 'info', label: 'Info' },
    { id: 'success', label: 'Succes' },
  ]

  // Show loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Notifikationer</h1>
        </div>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Alerts for fejl, advarsler og vigtige hændelser
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} lines={2} />)}
        </div>
        <div className="mb-4" style={{ height: 32, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}></div>
        <Card>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Notifikationer</h1>
        {unreadCount > 0 && (
          <span style={{ background: 'rgba(255,59,48,0.15)', color: '#FF3B30', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 10 }}>
            {unreadCount} ulæste
          </span>
        )}
      </div>
      <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Alerts for fejl, advarsler og vigtige hændelser
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(['error', 'warning', 'info', 'success'] as NotificationType[]).map(type => {
          const config = typeConfig[type]
          const count = notifications.filter(n => n.type === type).length
          return (
            <Card key={type} style={{ cursor: 'pointer' }} onClick={() => setFilter(type)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={config.icon} size={18} style={{ color: config.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{count}</p>
                  <p className="caption">{config.label}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div style={{ display: 'flex', gap: 6 }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: filter === f.id ? 'rgba(0,122,255,0.2)' : 'rgba(255,255,255,0.06)',
              color: filter === f.id ? '#4DA3FF' : 'rgba(255,255,255,0.5)', transition: 'all 150ms',
            }}>
              {f.label}{f.count !== undefined && f.count > 0 && <span style={{ marginLeft: 6, opacity: 0.7 }}>{f.count}</span>}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(0,122,255,0.3)',
              background: 'rgba(0,122,255,0.1)', color: '#4DA3FF', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>Markér alle læst</button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)',
              background: 'rgba(255,59,48,0.1)', color: '#FF6961', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>Ryd alle</button>
          )}
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.35)' }}>
            <Icon name="bell" size={40} className="text-white/15" style={{ marginBottom: 16, display: 'inline-flex' }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              Ingen notifikationer{filter !== 'all' ? ` af typen "${typeConfig[filter as NotificationType]?.label}"` : ''}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              {filter !== 'all' ? 'Prøv et andet filter' : 'Du er helt opdateret'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map(n => {
              const config = typeConfig[n.type]
              return (
                <div key={n.id} onClick={() => !n.read && markAsRead(n.id)} style={{
                  padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: n.read ? 'default' : 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start', opacity: n.read ? 0.7 : 1,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={config.icon} size={18} style={{ color: config.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 600, color: n.read ? 'rgba(255,255,255,0.6)' : '#fff' }}>{n.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{formatTime(n.timestamp)}</span>
                        <button onClick={(e) => { e.stopPropagation(); dismissNotification(n.id) }} style={{
                          background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '2px 6px', fontSize: 16,
                        }}>×</button>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3, lineHeight: 1.5 }}>{n.message}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      {n.source && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>{n.source}</span>
                      )}
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: config.bg, color: config.color }}>{config.label}</span>
                      {!n.read && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#007AFF' }} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
