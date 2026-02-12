interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
}

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
  { id: 'journal', label: 'Journal', icon: '◔' },
  { id: 'documents', label: 'Documents', icon: '◱' },
  { id: 'agents', label: 'Agents', icon: '⬢' },
  { id: 'intelligence', label: 'Intelligence', icon: '◉' },
  { id: 'weekly', label: 'Weekly Recap', icon: '◧' },
  { id: 'clients', label: 'Clients', icon: '◎' },
  { id: 'cron', label: 'Cron Jobs', icon: '⟳' },
  { id: 'api', label: 'API Usage', icon: '◈' },
  { id: 'workshop', label: 'Workshop', icon: '⬡' },
  { id: 'index', label: 'Index', icon: '⊞' },
  { id: 'evals', label: 'Evals', icon: '◑' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="w-60 h-screen bg-[#1c1c1e] text-white/70 flex flex-col fixed left-0 top-0 z-40">
      <div className="px-5 py-6">
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span className="text-xl">🎛️</span> Mission Kontrol
        </h1>
        <p className="text-[11px] text-white/40 mt-1">OpenClaw Operations Center</p>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <div
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`sidebar-item ${active === item.id ? 'active' : ''}`}
          >
            <span className="text-base w-5 text-center opacity-60">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[11px] text-white/30">v1.0.0 — Built with OpenClaw</p>
      </div>
    </aside>
  )
}
