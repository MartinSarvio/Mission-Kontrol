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
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed on all screens, visible on desktop, toggle on mobile */}
      <Sidebar
        active={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content - offset by sidebar width on desktop only */}
      <div className="lg:pl-60" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0e0e16 100%)' }}>
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center h-14 px-4 border-b border-white/10" style={{ background: '#0a0a0f' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg active:bg-white/10"
          >
            <Icon name="menu" size={22} className="text-white/80" />
          </button>
          <span className="ml-3 font-semibold text-white text-sm flex items-center gap-2">
            <Icon name="control-panel" size={16} className="text-white/60" />
            Mission Kontrol
          </span>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
