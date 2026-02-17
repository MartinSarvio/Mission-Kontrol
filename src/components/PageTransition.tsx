import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * PageTransition — Wrapper-komponent til smooth sideskift-animationer.
 *
 * Bruger ren CSS (ingen externe libraries):
 *   - Fade-in: opacity 0 → 1
 *   - Subtle slide-up: translateY(8px) → translateY(0)
 *   - Varighed: 200ms med ease-out kurve
 *
 * Skal bruges med `key={page}` i App.tsx, så React unmounter og
 * remounter komponenten ved hvert sideskift, hvilket trigger animationen.
 *
 * CSS-klassen `.animate-page-in` er defineret i index.css.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <div
      className="animate-page-in"
      style={{
        // Fortæller browseren at opacity og transform vil ændre sig
        // — muliggør GPU-acceleration for flydende animation
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
