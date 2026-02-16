import { useState, useEffect, lazy, Suspense } from 'react'
import { LiveDataProvider } from './api/LiveDataContext'
import { NotificationProvider } from './api/NotificationContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import UpdateBanner from './components/UpdateBanner'
import CommandPalette from './components/CommandPalette'
import ErrorBoundary from './components/ErrorBoundary'

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
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-white/50">Indlæser...</p>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [cmdOpen, setCmdOpen] = useState(false)
  const Page = pages[page] || Dashboard

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K → open Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(o => !o)
        return
      }
      // Esc → close command palette or modals
      if (e.key === 'Escape') {
        if (cmdOpen) { setCmdOpen(false); return }
        window.dispatchEvent(new CustomEvent('modal-close'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cmdOpen])

  return (
    <LiveDataProvider>
      <NotificationProvider>
        <ToastProvider>
          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNavigate={setPage} />
          <UpdateBanner />
          <Layout activePage={page} onNavigate={setPage}>
            <Suspense fallback={<LoadingFallback />}>
              <ErrorBoundary>
                <Page />
              </ErrorBoundary>
            </Suspense>
          </Layout>
        </ToastProvider>
      </NotificationProvider>
    </LiveDataProvider>
  )
}
