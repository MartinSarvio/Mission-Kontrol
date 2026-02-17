import { useEffect } from 'react'
import { useLiveData } from '../api/LiveDataContext'
import { useNotifications } from '../api/NotificationContext'

/**
 * Custom hook der sætter document title med connection status og ulæste notifikationer.
 *
 * Format eksempler:
 *   "(3) ⚠ Dashboard — Mission Kontrol"  (ulæste + afbrudt)
 *   "(3) Dashboard — Mission Kontrol"     (ulæste, forbundet)
 *   "⚠ Dashboard — Mission Kontrol"       (afbrudt, ingen ulæste)
 *   "Dashboard — Mission Kontrol"         (forbundet, ingen ulæste)
 *
 * @param title - Sidens navn på dansk
 */
export function usePageTitle(title: string) {
  const { isConnected } = useLiveData()
  const { unreadCount } = useNotifications()

  useEffect(() => {
    const countPrefix = unreadCount > 0 ? `(${unreadCount}) ` : ''
    const warningPrefix = !isConnected ? '\u26a0 ' : ''
    document.title = `${countPrefix}${warningPrefix}${title} \u2014 Mission Kontrol`

    return () => {
      document.title = 'Mission Kontrol'
    }
  }, [title, isConnected, unreadCount])
}
