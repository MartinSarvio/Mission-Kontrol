import { Status, Severity } from '../types'

const statusColors: Record<string, string> = {
  active: 'bg-[#34C759]', running: 'bg-[#34C759]', success: 'bg-[#34C759]', completed: 'bg-[#34C759]',
  idle: 'bg-[#8e8e93]', paused: 'bg-[#FF9500]', warning: 'bg-[#FF9500]',
  failed: 'bg-[#FF3B30]', error: 'bg-[#FF3B30]', critical: 'bg-[#FF3B30]',
  blocked: 'bg-[#FF9500]', info: 'bg-[#007AFF]',
}

const statusTextColors: Record<string, string> = {
  active: 'text-[#34C759]', running: 'text-[#34C759]', success: 'text-[#34C759]', completed: 'text-[#34C759]',
  idle: 'text-[#8e8e93]', paused: 'text-[#FF9500]', warning: 'text-[#FF9500]',
  failed: 'text-[#FF3B30]', error: 'text-[#FF3B30]', critical: 'text-[#FF3B30]',
  blocked: 'text-[#FF9500]', info: 'text-[#007AFF]',
}

const glassBg: Record<string, string> = {
  active: 'rgba(52,199,89,0.1)', running: 'rgba(52,199,89,0.1)', success: 'rgba(52,199,89,0.1)', completed: 'rgba(52,199,89,0.1)',
  idle: 'rgba(142,142,147,0.1)', paused: 'rgba(255,149,0,0.1)', warning: 'rgba(255,149,0,0.1)',
  failed: 'rgba(255,59,48,0.1)', error: 'rgba(255,59,48,0.1)', critical: 'rgba(255,59,48,0.1)',
  blocked: 'rgba(255,149,0,0.1)', info: 'rgba(0,122,255,0.1)',
}

export default function StatusBadge({ status }: { status: Status | Severity | string }) {
  return (
    <span className={`badge ${statusTextColors[status] || 'text-white/50'}`} style={{ background: glassBg[status] || 'rgba(142,142,147,0.1)' }}>
      <span className={`badge-dot ${statusColors[status] || 'bg-white/30'}`} />
      <span className="capitalize">{status}</span>
    </span>
  )
}
