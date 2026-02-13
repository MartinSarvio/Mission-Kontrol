import { useState, useMemo } from 'react'
import Card from '../components/Card'
import SearchBar from '../components/SearchBar'
import Modal from '../components/Modal'
import Icon from '../components/Icon'

interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'planning'
  techStack: string[]
  color: string
  icon: string
}

const PROJECTS: Project[] = [
  {
    id: 'mission-kontrol',
    name: 'Mission Kontrol',
    description: 'AI-assisteret dashboard og kontrolpanel til OpenClaw Gateway. React + TypeScript + Tailwind med live data streaming.',
    status: 'active',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Vercel'],
    color: '#007AFF',
    icon: 'chart-bar',
  },
  {
    id: 'flow',
    name: 'Flow',
    description: 'Alt-i-én restaurationsplatform med bordreservationer, online ordering, marketing automation og gæsteanalyse.',
    status: 'paused',
    techStack: ['Vanilla JS', 'Supabase', 'Vite', 'PostgreSQL'],
    color: '#FF6B35',
    icon: 'utensils',
  },
]

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  paused: 'På pause',
  planning: 'Planlægning',
}

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(52,199,89,0.1)', text: '#34C759' },
  paused: { bg: 'rgba(255,159,10,0.1)', text: '#FF9F0A' },
  planning: { bg: 'rgba(0,122,255,0.1)', text: '#007AFF' },
}

export default function Clients() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Project | null>(null)

  const filtered = useMemo(() => {
    if (!search) return PROJECTS
    const q = search.toLowerCase()
    return PROJECTS.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) ||
      p.techStack.some(t => t.toLowerCase().includes(q))
    )
  }, [search])

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Projekter</h1>
      <p className="caption mb-6">
        Projekter du bygger med Mission Kontrol
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Søg projekter..." />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(project => (
          <Card key={project.id}>
            <div 
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
              onClick={() => setSelected(project)}
            >
              <div className="flex items-start gap-4">
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${project.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon 
                    name={project.icon} 
                    size={24} 
                    style={{ color: project.color }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-semibold">{project.name}</p>
                    <span 
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: statusColors[project.status].bg,
                        color: statusColors[project.status].text,
                      }}
                    >
                      {statusLabels[project.status]}
                    </span>
                  </div>
                  <p className="caption mb-2 leading-relaxed">{project.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {project.techStack.map(tech => (
                      <span 
                        key={tech}
                        className="text-[10px] font-medium px-2 py-0.5 rounded"
                        style={{ 
                          background: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Icon name="chevron-right" size={16} className="text-white/30 flex-shrink-0" />
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <div className="text-center py-16 px-4">
            <Icon name="folder" size={40} className="text-white/30 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Ingen projekter fundet
            </p>
            <p className="caption max-w-md mx-auto">
              Prøv en anden søgning
            </p>
          </div>
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: `${selected.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon 
                  name={selected.icon} 
                  size={32} 
                  style={{ color: selected.color }}
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{selected.name}</h3>
                <span 
                  className="text-xs font-medium px-2.5 py-1 rounded-full inline-block"
                  style={{
                    background: statusColors[selected.status].bg,
                    color: statusColors[selected.status].text,
                  }}
                >
                  {statusLabels[selected.status]}
                </span>
              </div>
            </div>

            <div>
              <p className="caption mb-2">Beskrivelse</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {selected.description}
              </p>
            </div>

            <div>
              <p className="caption mb-2">Tech Stack</p>
              <div className="flex items-center gap-2 flex-wrap">
                {selected.techStack.map(tech => (
                  <span 
                    key={tech}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ 
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {selected.id === 'mission-kontrol' && (
              <div className="rounded-lg p-4" style={{ background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.2)' }}>
                <div className="flex items-start gap-3">
                  <Icon name="info-circle" size={16} style={{ color: '#007AFF', marginTop: '2px' }} />
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#5AC8FA' }}>
                      Live projekt
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Dette dashboard du bruger lige nu. Deployed på Vercel med automatisk CI/CD fra GitHub.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selected.id === 'flow' && (
              <div className="rounded-lg p-4" style={{ background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)' }}>
                <div className="flex items-start gap-3">
                  <Icon name="pause-circle" size={16} style={{ color: '#FF9F0A', marginTop: '2px' }} />
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#FF9F0A' }}>
                      På pause
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Udviklingen er sat på pause mens Mission Kontrol bygges. Genoptages senere i 2026.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
