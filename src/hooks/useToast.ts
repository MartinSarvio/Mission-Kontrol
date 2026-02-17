import { useCallback } from 'react'
import { useToast as useToastContext } from '../components/Toast'

/**
 * Convenience hook der eksponerer toast.success(), toast.error() osv.
 *
 * @example
 * const toast = useToast()
 * toast.success('Kopieret til udklipsholder')
 * toast.error('Noget gik galt')
 * toast.warning('Vær opmærksom')
 * toast.info('Handling modtaget')
 */
export function useToast() {
  const { showToast } = useToastContext()

  const success = useCallback(
    (message: string) => showToast('success', message),
    [showToast]
  )
  const error = useCallback(
    (message: string) => showToast('error', message),
    [showToast]
  )
  const warning = useCallback(
    (message: string) => showToast('warning', message),
    [showToast]
  )
  const info = useCallback(
    (message: string) => showToast('info', message),
    [showToast]
  )

  return { success, error, warning, info, showToast }
}
