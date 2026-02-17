import { useState, lazy, Suspense, useCallback, memo } from 'react'
import { LiveDataProvider } from './api/LiveDataContext'
import { NotificationProvider } from './api/NotificationContext'
import { ToastProvider } from './components/Toast'
import ConnectionToast from './components/ConnectionToast'
import ConnectionBanner from './components/ConnectionBanner'
import Layout from './components/Layout'
import UpdateBanner from './components/UpdateBanner'
import CommandPalette from './components/CommandPalette'
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp'
import ErrorBoundary from './components/ErrorBoundary'
import PageErrorBoundary from './components/PageErrorBoundary'
import PageTransition from './components/PageTransition'
import { useHashRouter } from './hooks/useHashRouter'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useFaviconBadge } from './hooks/useFaviconBadge'

// Lazy load all pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Communication = lazy(() => import('./pages/Communication'))
const Journal = lazy(() => import('./pages/Journal'))
const Documents = lazy(() => import('./pages/Documents'))
const Agents = lazy(() => import('./pages/Agents'))
const Skills = lazy(() => import('./pages/Skills'))
const Intelligence = lazy(() => import('./pages/Intelligence'))
const Tasks = lazy(() => import('./pages/Tasks'))
const WeeklyRecap = lazy(() => import('./pages/WeeklyRecap'))
const Clients = lazy(() => import('./pages/Clients'))
const CronJobs = lazy(() => import('./pages/CronJobs'))
const ApiUsage = lazy(() => import('./pages/ApiUsage'))
const Workshop = lazy(() => import('./pages/Workshop'))
const Index = lazy(() => import('./pages/Index'))
const Evals = lazy(() => import('./pages/Evals'))
const Settings = lazy(() => import('./pages/Settings'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Upload = lazy(() => import('./pages/Upload'))
const NotFound = lazy(() => import('./pages/NotFound'))

const pages: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  communication: Communication,
  journal: Journal,
  tasks: Tasks,
  documents: Documents,
  agents: Agents,
  skills: Skills,
  intelligence: Intelligence,
  weekly: WeeklyRecap,
  clients: Clients,
  cron: CronJobs,
  api: ApiUsage,
  workshop: Workshop,
  index: Index,
  evals: Evals,
  settings: Settings,
  notifications: Notifications,
  upload: Upload,
}

const pageNames: Record<string, string> = {
  dashboard: 'Dashboard',
  communication: 'Kommunikation',
  journal: 'Journal',
  tasks: 'Opgaver',
  documents: 'Dokumenter',
  agents: 'Agenter',
  skills: 'Skills',
  intelligence: 'Intelligence',
  weekly: 'Ugentlig Recap',
  clients: 'Klienter',
  cron: 'Cron Jobs',
  api: 'API Forbrug',
  workshop: 'Workshop',
  index: 'Index',
  evals: 'Evaluering',
  settings: 'Indstillinger',
  notifications: 'Notifikationer',
  upload: 'Upload',
}

/** Intern komponent der aktiverer favicon-badge (kræver at være inside LiveDataProvider) */
const FaviconBadge = memo(function FaviconBadge() {
  useFaviconBadge()
  return null
})

const LoadingFallback = memo(function LoadingFallback() {
  return (
    <div className="space-y-4 p-2">
      <div className="skeleton-pulse h-8 w-48" />
      <div className="skeleton-pulse h-4 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="skeleton-pulse h-32" />
        <div className="skeleton-pulse h-32" />
        <div className="skeleton-pulse h-32" />
      </div>
      <div className="skeleton-pulse h-64 mt-4" />
    </div>
  )
})

export default function App() {
  const [page, setPage] = useHashRouter('dashboard')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const Page = pages[page] || NotFound

  const handleCommandK = useCallback(() => {
    setCmdOpen(o => !o)
    setHelpOpen(false)
  }, [])

  const handleHelp = useCallback(() => {
    setHelpOpen(o => !o)
    setCmdOpen(false)
  }, [])

  const handleEscape = useCallback(() => {
    if (cmdOpen) {
      setCmdOpen(false)
    } else if (helpOpen) {
      setHelpOpen(false)
    } else {
      window.dispatchEvent(new CustomEvent('modal-close'))
    }
  }, [cmdOpen, helpOpen])

  const handleCmdClose = useCallback(() => setCmdOpen(false), [])
  const handleHelpClose = useCallback(() => setHelpOpen(false), [])

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onCommandK: handleCommandK,
    onHelp: handleHelp,
    onEscape: handleEscape,
    onNavigate: setPage,
    isCommandPaletteOpen: cmdOpen,
  })

  return (
    <LiveDataProvider>
      <NotificationProvider>
        <FaviconBadge />
        <ToastProvider>
          <ConnectionToast />
          <ConnectionBanner />
          <CommandPalette open={cmdOpen} onClose={handleCmdClose} onNavigate={setPage} />
          <KeyboardShortcutsHelp open={helpOpen} onClose={handleHelpClose} />
          <UpdateBanner />
          <Layout activePage={page} onNavigate={setPage}>
            <Suspense fallback={<LoadingFallback />}>
              <ErrorBoundary>
                <PageTransition key={page}>
                  <PageErrorBoundary key={page} pageName={pageNames[page] || page}>
                    <Page />
                  </PageErrorBoundary>
                </PageTransition>
              </ErrorBoundary>
            </Suspense>
          </Layout>
        </ToastProvider>
      </NotificationProvider>
    </LiveDataProvider>
  )
}
