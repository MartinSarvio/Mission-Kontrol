import { useEffect, useRef } from 'react'
import { useLiveData } from '../api/LiveDataContext'
import { useToast } from './Toast'

/**
 * ConnectionToast overvåger LiveDataContext og viser toast-notifikationer
 * ved API-fejl (første gang) og ved genoprettet forbindelse.
 * Undgår spam ved kun at vise én fejl-toast indtil forbindelsen genoprettes.
 */
export default function ConnectionToast() {
  const { isConnected, error } = useLiveData()
  const { showToast } = useToast()
  
  const wasConnected = useRef<boolean | null>(null)
  const hasShownErrorToast = useRef(false)

  useEffect(() => {
    // Skip first render (initialization)
    if (wasConnected.current === null) {
      wasConnected.current = isConnected
      return
    }

    // Connection lost → show error toast (only once)
    if (wasConnected.current && !isConnected && !hasShownErrorToast.current) {
      showToast('error', 'Kunne ikke oprette forbindelse til Gateway')
      hasShownErrorToast.current = true
    }

    // Connection recovered → show success toast
    if (!wasConnected.current && isConnected) {
      showToast('success', 'Forbindelse til Gateway genoprettet')
      hasShownErrorToast.current = false
    }

    wasConnected.current = isConnected
  }, [isConnected, showToast])

  return null
}
