import { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
  activePage: string
  onNavigate: (page: string) => void
}

export default function Layout({ children, activePage, onNavigate }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-apple-bg">
      <Sidebar active={activePage} onNavigate={onNavigate} />
      <main className="flex-1 ml-60 p-8 max-w-[1400px]">
        {children}
      </main>
    </div>
  )
}
