import { ReactNode, useState } from 'react'
import Sidebar from './Sidebar'
import Icon from './Icon'

interface LayoutProps {
  children: ReactNode
  activePage: string
  onNavigate: (page: string) => void
}

export default function Layout({ children, activePage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNavigate = (page: string) => {
    onNavigate(page)
    setSidebarOpen(false)
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        active={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 lg:ml-60 min-h-screen">
        {/* Mobile header with hamburger */}
        <header className="lg:hidden flex items-center h-14 px-4 border-b border-white/10 sticky top-0 z-30" style={{ backgroundColor: '#0a0a0f' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg active:bg-white/10"
            style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="menu" size={22} className="text-white/80" />
          </button>
          <span className="ml-3 font-semibold text-white text-sm flex items-center gap-2">
            <Icon name="control-panel" size={16} className="text-white/60" />
            Mission Kontrol
          </span>
        </header>

        <div className="p-4 lg:p-8 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  )
}
