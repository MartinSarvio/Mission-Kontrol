import { useState, useEffect } from 'react'

/**
 * Hash-baseret routing hook for Mission Kontrol
 * Gør sider bookmarkable og understøtter browser back/forward
 */
export function useHashRouter(defaultPage = 'dashboard'): [string, (page: string) => void] {
  const getPageFromHash = (): string => {
    const hash = window.location.hash.slice(1) // Fjern '#'
    return hash || defaultPage
  }

  const [page, setPageState] = useState<string>(getPageFromHash())

  useEffect(() => {
    const handleHashChange = () => {
      setPageState(getPageFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const setPage = (newPage: string) => {
    window.location.hash = newPage
    // State opdateres automatisk via hashchange event
  }

  return [page, setPage]
}
