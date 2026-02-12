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

const statusBgColors: Record<string, string> = {
  active: 'bg-green-50', running: 'bg-green-50', success: 'bg-green-50', completed: 'bg-green-50',
  idle: 'bg-gray-50', paused: 'bg-orange-50', warning: 'bg-orange-50',
  failed: 'bg-red-50', error: 'bg-red-50', critical: 'bg-red-50',
  blocked: 'bg-orange-50', info: 'bg-blue-50',
}

export default function StatusBadge({ status }: { status: Status | Severity | string }) {
  return (
    <span className={`badge ${statusBgColors[status] || 'bg-gray-50'} ${statusTextColors[status] || 'text-gray-500'}`}>
      <span className={`badge-dot ${statusColors[status] || 'bg-gray-400'}`} />
      <span className="capitalize">{status}</span>
    </span>
  )
}
