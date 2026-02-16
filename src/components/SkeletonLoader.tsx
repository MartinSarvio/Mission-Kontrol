/**
 * Skeleton loader with shimmer effect for loading states.
 * Dark mode glassmorphism style.
 */

const shimmerStyle = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`

function Bone({ width = '100%', height = 16, radius = 8, className = '' }: { width?: string | number; height?: number; radius?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  )
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <Bone width="40%" height={12} className="mb-3" />
      <Bone width="60%" height={24} className="mb-2" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Bone key={i} width={`${70 - i * 15}%`} height={12} className="mb-2" />
      ))}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
      <Bone width={32} height={32} radius={8} />
      <div style={{ flex: 1 }}>
        <Bone width="50%" height={14} className="mb-2" />
        <Bone width="30%" height={10} />
      </div>
      <Bone width={60} height={20} radius={10} />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div>
      <style>{shimmerStyle}</style>
      <Bone width={180} height={28} className="mb-2" />
      <Bone width={300} height={14} className="mb-8" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} lines={2} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
            <Bone width="50%" height={14} className="mb-4" />
            {[1, 2, 3].map(j => <SkeletonRow key={j} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function AgentsSkeleton() {
  return (
    <div>
      <style>{shimmerStyle}</style>
      <Bone width={140} height={28} className="mb-2" />
      <Bone width={280} height={14} className="mb-6" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => <Bone key={i} width={120} height={36} radius={12} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 32 }}>
        <SkeletonCard lines={2} />
        <Bone width={1} height={32} radius={0} />
        <SkeletonCard lines={3} />
      </div>
    </div>
  )
}

export function IntelligenceSkeleton() {
  return (
    <div>
      <style>{shimmerStyle}</style>
      <Bone width={160} height={28} className="mb-4" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Bone height={40} radius={8} />
        <Bone width={80} height={40} radius={8} />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 320, flexShrink: 0 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <Bone width="30%" height={10} className="mb-2" />
              <Bone width="80%" height={14} className="mb-1" />
              <Bone width="40%" height={10} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 24 }}>
          <Bone width="20%" height={12} className="mb-4" />
          <Bone width="70%" height={24} className="mb-4" />
          <Bone width="100%" height={14} className="mb-2" />
          <Bone width="90%" height={14} className="mb-2" />
          <Bone width="95%" height={14} className="mb-2" />
        </div>
      </div>
    </div>
  )
}

export default Bone
