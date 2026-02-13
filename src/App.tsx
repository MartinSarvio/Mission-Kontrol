import { useState } from 'react'
import { LiveDataProvider } from './api/LiveDataContext'
import Layout from './components/Layout'
import UpdateBanner from './components/UpdateBanner'
import Dashboard from './pages/Dashboard'
import Journal from './pages/Journal'
import Documents from './pages/Documents'
import Agents from './pages/Agents'
import Skills from './pages/Skills'
import Intelligence from './pages/Intelligence'
import Tasks from './pages/Tasks'
import WeeklyRecap from './pages/WeeklyRecap'
import Clients from './pages/Clients'
import CronJobs from './pages/CronJobs'
import ApiUsage from './pages/ApiUsage'
import Workshop from './pages/Workshop'
import Index from './pages/Index'
import Evals from './pages/Evals'
import Settings from './pages/Settings'

const pages: Record<string, () => JSX.Element> = {
  dashboard: Dashboard,
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
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const Page = pages[page] || Dashboard

  return (
    <LiveDataProvider>
      <UpdateBanner />
      <Layout activePage={page} onNavigate={setPage}>
        <Page />
      </Layout>
    </LiveDataProvider>
  )
}
