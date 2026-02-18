import Icon from './Icon'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div
        style={{
          maxWidth: '400px',
          width: '100%',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '20px',
          padding: '48px 32px',
          textAlign: 'center',
        }}
      >
        {/* Ikon boks */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <Icon name={icon} size={28} style={{ color: 'rgba(255, 255, 255, 0.25)' }} />
        </div>

        {/* Titel */}
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.65)',
            marginBottom: description || action ? '8px' : '0',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h3>

        {/* Beskrivelse */}
        {description && (
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.32)',
              lineHeight: '1.6',
              marginBottom: action ? '24px' : '0',
            }}
          >
            {description}
          </p>
        )}

        {/* Handling */}
        {action && (
          <button
            onClick={action.onClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '9px 22px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'white',
              background: 'linear-gradient(135deg, #007AFF 0%, rgba(0, 122, 255, 0.88) 100%)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 122, 255, 0.22)',
              transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 122, 255, 0.38)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 122, 255, 0.22)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
