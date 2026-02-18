import { useEffect, useState, useRef } from 'react'
import { useLiveData } from '../api/LiveDataContext'
import Icon from './Icon'

/**
 * OfflineBanner — Global forbindelsesstatus-banner
 *
 * Slider ned fra toppen når Gateway-forbindelsen er nede.
 * Viser "Forbindelse genoprettet" i grønt i 3 sekunder ved genopretning.
 *
 * Placering: fast (position: fixed) over alt indhold.
 * Integreret i Layout.tsx.
 */
export default function OfflineBanner() {
  const { isConnected, lastUpdated, consecutiveErrors } = useLiveData()
  const [showReconnected, setShowReconnected] = useState(false)
  const prevConnected = useRef<boolean | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Undgå at vise "genoprettet" ved første render
    if (prevConnected.current === null) {
      prevConnected.current = isConnected
      return
    }

    // Forbindelsen er netop genoprettet
    if (prevConnected.current === false && isConnected === true) {
      setShowReconnected(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setShowReconnected(false), 3000)
    }

    prevConnected.current = isConnected
  }, [isConnected])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Vis kun offline-tilstand efter mindst ét mislykket forsøg
  const shouldShowOffline = !isConnected && (lastUpdated !== null || consecutiveErrors > 0)
  const visible = shouldShowOffline || showReconnected

  return (
    <>
      <style>{`
        @keyframes offline-banner-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.72; }
        }
      `}</style>

      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        aria-label={
          shouldShowOffline
            ? 'Forbindelse til Gateway afbrudt'
            : showReconnected
            ? 'Forbindelse genoprettet'
            : undefined
        }
        className="lg:left-60"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 42,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          // Gradientbaggrund: rød/orange ved offline, grøn ved genoprettet
          background: showReconnected
            ? 'linear-gradient(90deg, rgba(30, 140, 60, 0.28) 0%, rgba(48, 209, 88, 0.22) 50%, rgba(30, 140, 60, 0.28) 100%)'
            : 'linear-gradient(90deg, rgba(255, 69, 58, 0.22) 0%, rgba(255, 159, 10, 0.20) 50%, rgba(255, 69, 58, 0.22) 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderBottom: showReconnected
            ? '1px solid rgba(48, 209, 88, 0.32)'
            : '1px solid rgba(255, 69, 58, 0.32)',
          boxShadow: showReconnected
            ? '0 2px 20px rgba(48, 209, 88, 0.18), inset 0 1px 0 rgba(48, 209, 88, 0.12)'
            : '0 2px 24px rgba(255, 69, 58, 0.22), inset 0 1px 0 rgba(255, 159, 10, 0.14)',
          // Slide-in/slide-out
          transform: visible ? 'translateY(0)' : 'translateY(-100%)',
          transition:
            'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), background 400ms ease, border-color 400ms ease, box-shadow 400ms ease',
          pointerEvents: visible ? 'auto' : 'none',
          // Pulserende animation kun når offline
          animation: shouldShowOffline
            ? 'offline-banner-pulse 2.8s ease-in-out infinite'
            : 'none',
        }}
      >
        <Icon
          name={showReconnected ? 'check-circle' : 'exclamation-triangle'}
          size={15}
          style={{
            color: showReconnected ? '#30D158' : '#FF6B35',
            flexShrink: 0,
            filter: showReconnected
              ? 'drop-shadow(0 0 4px rgba(48, 209, 88, 0.5))'
              : 'drop-shadow(0 0 4px rgba(255, 107, 53, 0.5))',
          }}
        />

        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: showReconnected
              ? 'rgba(48, 209, 88, 0.95)'
              : 'rgba(255, 255, 255, 0.90)',
            whiteSpace: 'nowrap',
            transition: 'color 400ms ease',
          }}
        >
          {showReconnected
            ? 'Forbindelse genoprettet'
            : 'Forbindelse til Gateway afbrudt — forsøger at genoprette...'}
        </span>
      </div>
    </>
  )
}
