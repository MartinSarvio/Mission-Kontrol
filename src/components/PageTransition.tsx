import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * PageTransition - Wrapper for smooth page navigation animations
 * Subtle fade-in with slight upward motion for polish
 */
export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <div 
      className="animate-page-in"
      style={{
        willChange: 'opacity, transform'
      }}
    >
      {children}
    </div>
  )
}
