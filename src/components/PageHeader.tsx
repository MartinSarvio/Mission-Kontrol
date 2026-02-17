import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumb?: { label: string; href?: string }[]
  actions?: ReactNode
}

export default function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return (
    <header style={{ marginBottom: '32px' }}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" style={{ marginBottom: '12px' }}>
          <ol style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
            {breadcrumb.map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>/</span>}
                {item.href ? (
                  <a
                    href={item.href}
                    style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textDecoration: 'none', transition: 'color 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span aria-current="page" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', margin: 0 }}>
            {title}
          </h1>
          {description && (
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', marginBottom: 0 }}>
              {description}
            </p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>{actions}</div>}
      </div>
    </header>
  )
}
