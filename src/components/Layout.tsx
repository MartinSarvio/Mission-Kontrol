import { ReactNode, useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from './Sidebar'
import Icon from './Icon'
import MaisonFlyout from './MaisonFlyout'
import NotificationCenter from './NotificationCenter'
import ScrollToTop from './ScrollToTop'

interface LayoutProps {
  children: ReactNode
  activePage: string
  onNavigate: (page: string) => void
}

export default function Layout({ children, activePage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [maisonOpen, setMaisonOpen] = useState(false)

  // Scroll restoration: scroll til top når siden skifter
  const prevPageRef = useRef(activePage)
  useEffect(() => {
    if (prevPageRef.current !== activePage) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      prevPageRef.current = activePage
    }
  }, [activePage])

  const handleNavigate = useCallback((page: string) => {
    onNavigate(page)
    setSidebarOpen(false)
  }, [onNavigate])

  const handleSidebarClose = useCallback(() => setSidebarOpen(false), [])
  const handleSidebarOpen = useCallback(() => setSidebarOpen(true), [])
  const handleMaisonOpen = useCallback(() => setMaisonOpen(true), [])
  const handleMaisonClose = useCallback(() => setMaisonOpen(false), [])

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #08080c 0%, #10101a 50%, #0c0c14 100%)', 
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Skip to content link for keyboard navigation */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          top: -40,
          left: 8,
          zIndex: 100,
          padding: '8px 16px',
          background: '#007AFF',
          color: 'white',
          borderRadius: 4,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 500,
          transition: 'top 200ms ease-in-out',
        }}
        onFocus={(e) => {
          e.currentTarget.style.top = '8px'
        }}
        onBlur={(e) => {
          e.currentTarget.style.top = '-40px'
        }}
      >
        Spring til indhold
      </a>
      {/* Ambient glow effects */}
      <div style={{
        position: 'fixed',
        top: '20%',
        right: '10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(0, 122, 255, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        bottom: '10%',
        left: '15%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(175, 82, 222, 0.06) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="glass-overlay fixed inset-0 z-40 lg:hidden"
          onClick={handleSidebarClose}
        />
      )}

      {/* Sidebar - fixed on all screens, visible on desktop, toggle on mobile */}
      <Sidebar
        active={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={handleSidebarClose}
        onMaisonClick={handleMaisonOpen}
      />

      {/* Maison Flyout */}
      <MaisonFlyout isOpen={maisonOpen} onClose={handleMaisonClose} />

      {/* Tauri drag region - allows window to be moved on desktop app */}
      {'__TAURI__' in (typeof window !== 'undefined' ? window : {}) && (
        <div
          data-tauri-drag-region
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 28,
            zIndex: 100,
            WebkitAppRegion: 'drag',
          } as React.CSSProperties}
        />
      )}

      {/* Floating scroll-to-top knap — vises på alle sider */}
      <ScrollToTop />

      {/* Main content - offset by sidebar width on desktop only */}
      <div className="lg:pl-60" style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        {/* Mobile header */}
        <header 
          className="lg:hidden sticky top-0 z-30 flex items-center h-14 px-4 border-b"
          style={{ 
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            background: 'rgba(8, 8, 12, 0.8)',
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          <button
            onClick={handleSidebarOpen}
            className="p-2 -ml-2 rounded-lg active:bg-white/10"
          >
            <Icon name="menu" size={22} className="text-white/80" />
          </button>
          <span className="ml-3 font-semibold text-white text-sm" style={{ flex: 1 }}>
            Mission Kontrol
          </span>
          <NotificationCenter />
        </header>

        {/* Desktop notification bell */}
        <div className="hidden lg:flex items-center justify-end h-12 px-8" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
          <NotificationCenter />
        </div>

        <main id="main-content" className="p-4 sm:p-6 lg:p-8 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
