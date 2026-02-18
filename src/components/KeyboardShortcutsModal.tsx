/**
 * KeyboardShortcutsModal.tsx
 *
 * Glassmorphism hjælpe-modal der viser alle keyboard shortcuts.
 * Åbnes med `?` (kun uden aktivt inputfelt), lukkes med Escape eller klik udenfor.
 */
import Icon from './Icon'
import { NUMBER_SHORTCUTS } from '../hooks/useKeyboardShortcuts'

// ── Typer ────────────────────────────────────────────────────────────────────

interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
}

// ── Hjælpere ─────────────────────────────────────────────────────────────────

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Oversigt',
  tasks: 'Opgaver',
  agents: 'Agenter',
  skills: 'Færdigheder',
  communication: 'Kommunikation',
  journal: 'Journal',
  documents: 'Dokumenter',
  intelligence: 'Intelligens',
  settings: 'Indstillinger',
}

/** Stiliseret tastatur-tast */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 24,
        padding: '2px 7px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 650,
        lineHeight: '18px',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        background: 'rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.80)',
        border: '1px solid rgba(255,255,255,0.13)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }}
    >
      {children}
    </kbd>
  )
}

/** En enkelt genvej-række: taster til venstre, beskrivelse til højre */
function ShortcutRow({
  keys,
  label,
}: {
  keys: React.ReactNode[]
  label: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '7px 10px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.055)',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        {keys.map((k, i) => (
          <span key={i}>{k}</span>
        ))}
      </div>
    </div>
  )
}

/** Separator mellom taster, fx "+" eller "/" */
function Sep({ char = '/' }: { char?: string }) {
  return (
    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '0 1px' }}>
      {char}
    </span>
  )
}

// ── Komponent ─────────────────────────────────────────────────────────────────

export default function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!open) return null

  const navShortcuts = Object.entries(NUMBER_SHORTCUTS).map(([key, pageId]) => ({
    key,
    pageId,
    label: PAGE_LABELS[pageId] ?? pageId,
  }))

  return (
    /* Baggrunds-overlay – klik udenfor lukker */
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(10,10,15,0.70)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '10vh 16px 40px',
        overflowY: 'auto',
      }}
    >
      {/* Modal-boks – stop propagation så klik inde i modalen ikke lukker */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tastaturgenveje"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 820,
          background: 'rgba(18,18,28,0.82)',
          border: '1px solid rgba(255,255,255,0.11)',
          borderRadius: 20,
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.70)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {/* Ikon + titel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="command" size={18} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <div
                style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                Tastaturgenveje
              </div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Tryk Esc for at lukke
              </div>
            </div>
          </div>

          {/* Luk-knap */}
          <button
            onClick={onClose}
            aria-label="Luk"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.65)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background =
                'rgba(255,255,255,0.12)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background =
                'rgba(255,255,255,0.06)'
              ;(e.currentTarget as HTMLButtonElement).style.color =
                'rgba(255,255,255,0.65)'
            }}
          >
            <Icon name="xmark" size={16} />
          </button>
        </div>

        {/* ── Indhold ────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 12,
            }}
          >
            {/* ── Globale genveje ──────────────────────────────────────── */}
            <section
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  marginBottom: 10,
                }}
              >
                <Icon
                  name="command"
                  size={14}
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                />
                <span
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Globalt
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <ShortcutRow
                  label="Kommandopalet"
                  keys={[
                    <Kbd>Cmd</Kbd>,
                    <Sep char="+" />,
                    <Kbd>K</Kbd>,
                    <Sep char="/" />,
                    <Kbd>Ctrl</Kbd>,
                    <Sep char="+" />,
                    <Kbd>K</Kbd>,
                  ]}
                />
                <ShortcutRow
                  label="Vis denne hjælp"
                  keys={[<Kbd>?</Kbd>]}
                />
                <ShortcutRow
                  label="Vis genveje (alternativ)"
                  keys={[<Kbd>Ctrl</Kbd>, <Sep char="+" />, <Kbd>/</Kbd>]}
                />
                <ShortcutRow
                  label="Luk overlays og modaler"
                  keys={[<Kbd>Esc</Kbd>]}
                />
              </div>
            </section>

            {/* ── Navigations-genveje ──────────────────────────────────── */}
            <section
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  marginBottom: 10,
                }}
              >
                <Icon
                  name="grid"
                  size={14}
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                />
                <span
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Sidenavigation
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 5,
                }}
              >
                {navShortcuts.map((s) => (
                  <div
                    key={s.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '7px 10px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.055)',
                    }}
                  >
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.label}
                    </span>
                    <Kbd>{s.key}</Kbd>
                  </div>
                ))}
              </div>

              <p
                style={{
                  marginTop: 10,
                  color: 'rgba(255,255,255,0.38)',
                  fontSize: 11,
                  lineHeight: 1.4,
                }}
              >
                Tal-genveje virker kun uden aktivt inputfelt.
              </p>
            </section>
          </div>

          {/* ── Tip-banner ───────────────────────────────────────────────── */}
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Icon
              name="info-circle"
              size={15}
              style={{ color: '#818cf8', flexShrink: 0 }}
            />
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.5 }}>
              Brug <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>⌘K</strong> /
              {' '}<strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Ctrl+K</strong> til
              hurtigt at søge og navigere med kommandopaletten.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
