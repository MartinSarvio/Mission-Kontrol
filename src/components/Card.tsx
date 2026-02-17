import { ReactNode, memo } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
  style?: React.CSSProperties
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

const Card = memo(function Card({ children, className = '', title, subtitle, action, style, onClick }: CardProps) {
  const isClickable = !!onClick
  
  return (
    <div 
      className={`card animate-card-in ${className}`} 
      style={style} 
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault()
          onClick(e as any)
        }
      } : undefined}
    >
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
})

export default Card
