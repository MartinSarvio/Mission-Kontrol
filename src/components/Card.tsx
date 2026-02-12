import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
  style?: React.CSSProperties
}

export default function Card({ children, className = '', title, subtitle, action, style }: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="section-title">{title}</h3>}
            {subtitle && <p className="caption mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
