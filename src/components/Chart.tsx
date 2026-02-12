interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  height?: number
  showValues?: boolean
}

export function BarChart({ data, height = 160, showValues = true }: BarChartProps) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          {showValues && <span className="text-[11px] text-white/40 font-medium">{d.value.toLocaleString()}</span>}
          <div
            className="w-full rounded-t-md transition-all duration-200"
            style={{
              height: `${(d.value / max) * (height - 40)}px`,
              backgroundColor: d.color || '#007AFF',
              minHeight: 4,
            }}
          />
          <span className="text-[11px] text-white/40 truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

interface MiniLineChartProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export function MiniLineChart({ data, color = '#007AFF', width = 120, height = 40 }: MiniLineChartProps) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

interface DonutChartProps {
  segments: { value: number; color: string; label: string }[]
  size?: number
}

export function DonutChart({ segments, size = 120 }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const r = (size - 8) / 2
  const cx = size / 2
  const cy = size / 2
  let cumAngle = -90

  const arcs = segments.map((seg, i) => {
    const angle = (seg.value / total) * 360
    const startRad = (cumAngle * Math.PI) / 180
    const endRad = ((cumAngle + angle) * Math.PI) / 180
    cumAngle += angle
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const large = angle > 180 ? 1 : 0
    return (
      <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
        fill={seg.color} className="transition-opacity duration-150 hover:opacity-80" />
    )
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size}>
        {arcs}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#0a0a0f" />
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-white/50">{seg.label}</span>
            <span className="font-medium text-white">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
