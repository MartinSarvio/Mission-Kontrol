import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { listSkills, installSkill, searchSkills } from '../api/openclaw'

/* ── Types ──────────────────────────────────────────────────── */
interface Skill {
  name: string
  description: string
  version?: string
  scripts: string[]
  updatedAt?: string
  path?: string
}

interface SearchResult {
  name: string
  description: string
  author?: string
  stars?: number
}

/* ── Small components ───────────────────────────────────────── */
function SkillCard({ skill, onClick }: { skill: Skill; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl p-4 cursor-pointer transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.borderColor = 'rgba(0,122,255,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
          >
            <Icon name="sparkle" size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{skill.name}</h3>
            {skill.version && (
              <span
                className="text-[10px] font-mono"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                v{skill.version}
              </span>
            )}
          </div>
        </div>
        {skill.scripts.length > 0 && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              background: 'rgba(48,209,88,0.12)',
              color: '#30D158',
            }}
          >
            {skill.scripts.length} scripts
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {skill.description || 'Ingen beskrivelse tilgængelig'}
      </p>
      {skill.updatedAt && (
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Opdateret: {skill.updatedAt}
        </p>
      )}
    </div>
  )
}

function SearchResultCard({ result, onInstall, installing }: { result: SearchResult; onInstall: () => void; installing: boolean }) {
  return (
    <div
      className="rounded-xl p-4 transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">{result.name}</h3>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {result.description}
          </p>
        </div>
        <button
          onClick={onInstall}
          disabled={installing}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
          style={{
            background: installing ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.2)',
            border: '1px solid rgba(0,122,255,0.4)',
            opacity: installing ? 0.6 : 1,
          }}
        >
          {installing ? 'Installerer...' : 'Installer'}
        </button>
      </div>
      {result.author && (
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Af {result.author}
          {result.stars && ` · ${result.stars} ⭐`}
        </p>
      )}
    </div>
  )
}

function SkillDetailModal({ skill, onClose }: { skill: Skill | null; onClose: () => void }) {
  if (!skill) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(20,20,22,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(40px)',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
            >
              <Icon name="sparkle" size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{skill.name}</h2>
              {skill.version && (
                <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Version {skill.version}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          >
            <Icon name="xmark" size={14} className="text-white/60" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Beskrivelse
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {skill.description || 'Ingen beskrivelse tilgængelig'}
            </p>
          </div>

          {skill.scripts.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Scripts ({skill.scripts.length})
              </p>
              <div className="space-y-1">
                {skill.scripts.map((script, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 rounded-lg text-xs font-mono"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)' }}
                  >
                    {script}
                  </div>
                ))}
              </div>
            </div>
          )}

          {skill.path && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Sti
              </p>
              <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {skill.path}
              </p>
            </div>
          )}

          {skill.updatedAt && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Sidst Opdateret
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {skill.updatedAt}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Toast({ message, visible, type = 'success' }: { message: string; visible: boolean; type?: 'success' | 'error' }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium text-white transition-all duration-500"
      style={{
        background: type === 'success' ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)',
        border: type === 'success' ? '1px solid rgba(48,209,88,0.3)' : '1px solid rgba(255,69,58,0.3)',
        backdropFilter: 'blur(20px)',
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <span className="inline-flex items-center mr-2">
        <Icon name={type === 'success' ? 'check' : 'exclamation'} size={14} className={type === 'success' ? 'text-green-400' : 'text-red-400'} />
      </span>
      {message}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────── */
type TabView = 'installed' | 'install' | 'search'

export default function Skills() {
  const [tab, setTab] = useState<TabView>('installed')
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [installUrl, setInstallUrl] = useState('')
  const [installing, setInstalling] = useState<string | null>(null)
  const [toast, setToast] = useState({ message: '', visible: false, type: 'success' as 'success' | 'error' })

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, visible: true, type })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000)
  }

  const loadSkills = async () => {
    setLoading(true)
    try {
      const result: any = await listSkills()
      const text = result.result?.content?.[0]?.text || ''
      
      // Parse skills from command output
      const lines = text.split('\n')
      const parsedSkills: Skill[] = []
      
      let currentSkill: Partial<Skill> | null = null
      
      for (const line of lines) {
        if (line === '---') {
          if (currentSkill?.name) {
            parsedSkills.push({
              name: currentSkill.name,
              description: currentSkill.description || '',
              version: currentSkill.version,
              scripts: currentSkill.scripts || [],
              updatedAt: currentSkill.updatedAt,
              path: currentSkill.path,
            })
          }
          currentSkill = {}
        } else if (currentSkill !== null) {
          if (!currentSkill.name && line.trim()) {
            currentSkill.name = line.trim()
            currentSkill.path = `/data/.openclaw/workspace/skills/${line.trim()}`
          } else if (line.trim()) {
            if (!currentSkill.description) {
              currentSkill.description = line.trim()
            }
          }
        }
      }
      
      // Add last skill
      if (currentSkill?.name) {
        parsedSkills.push({
          name: currentSkill.name,
          description: currentSkill.description || '',
          version: currentSkill.version,
          scripts: currentSkill.scripts || [],
          updatedAt: currentSkill.updatedAt,
          path: currentSkill.path,
        })
      }
      
      setSkills(parsedSkills)
    } catch (e: any) {
      showToast(`Kunne ikke indlæse skills: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const result: any = await searchSkills(searchQuery)
      const text = result.result?.content?.[0]?.text || ''
      
      // Parse search results (simplified - adjust based on actual clawhub output)
      const lines = text.split('\n').filter((l: string) => l.trim())
      const results: SearchResult[] = lines.slice(0, 10).map((line: string) => ({
        name: line.trim(),
        description: 'Skill fra ClawHub',
      }))
      
      setSearchResults(results)
    } catch (e: any) {
      showToast(`Søgning fejlede: ${e.message}`, 'error')
    } finally {
      setSearching(false)
    }
  }

  const handleInstallFromHub = async (skillName: string) => {
    setInstalling(skillName)
    try {
      await installSkill(skillName)
      showToast(`${skillName} installeret`)
      loadSkills()
      setTab('installed')
    } catch (e: any) {
      showToast(`Installation fejlede: ${e.message}`, 'error')
    } finally {
      setInstalling(null)
    }
  }

  const handleInstallFromUrl = async () => {
    if (!installUrl.trim()) return
    setInstalling('url')
    try {
      // Extract skill name from URL
      const skillName = installUrl.split('/').filter(Boolean).pop() || 'unknown'
      await installSkill(installUrl)
      showToast(`Skill installeret fra URL`)
      loadSkills()
      setInstallUrl('')
      setTab('installed')
    } catch (e: any) {
      showToast(`Installation fra URL fejlede: ${e.message}`, 'error')
    } finally {
      setInstalling(null)
    }
  }

  useEffect(() => {
    loadSkills()
  }, [])

  const tabs: { key: TabView; label: string; icon: string }[] = [
    { key: 'installed', label: 'Installerede', icon: 'sparkle' },
    { key: 'install', label: 'Installer', icon: 'upload' },
    { key: 'search', label: 'ClawHub', icon: 'magnifying-glass' },
  ]

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    borderRadius: '0.75rem',
    padding: '0.625rem 0.875rem',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title mb-1">Færdigheder</h1>
          <p className="caption">{skills.length} installerede skills</p>
        </div>
        <button
          onClick={loadSkills}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'rgba(0,122,255,0.2)', border: '1px solid rgba(0,122,255,0.3)' }}
        >
          <Icon name="restart" size={14} />
          {loading ? 'Indlæser...' : 'Opdater'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            style={{
              background: tab === t.key ? 'rgba(0,122,255,0.2)' : 'transparent',
              color: tab === t.key ? '#5AC8FA' : 'rgba(255,255,255,0.4)',
              border: tab === t.key ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent',
            }}
          >
            <Icon name={t.icon} size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'installed' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading && <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Indlæser...</p>}
            {!loading && skills.length === 0 && (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Ingen skills installeret</p>
            )}
            {skills.map(skill => (
              <SkillCard key={skill.name} skill={skill} onClick={() => setSelectedSkill(skill)} />
            ))}
          </div>
        )}

        {tab === 'install' && (
          <div className="max-w-2xl">
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(40px)',
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Installer fra URL</h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Indsæt URL til en skill repository eller ZIP-fil
              </p>
              <div className="flex gap-2">
                <input
                  value={installUrl}
                  onChange={e => setInstallUrl(e.target.value)}
                  placeholder="https://github.com/user/skill"
                  style={inputStyle}
                  onKeyDown={e => e.key === 'Enter' && handleInstallFromUrl()}
                />
                <button
                  onClick={handleInstallFromUrl}
                  disabled={!installUrl.trim() || installing === 'url'}
                  className="px-5 py-2 rounded-xl font-semibold text-white text-sm transition-all"
                  style={{
                    background: installing === 'url' ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.2)',
                    border: '1px solid rgba(0,122,255,0.4)',
                    opacity: !installUrl.trim() || installing === 'url' ? 0.6 : 1,
                  }}
                >
                  {installing === 'url' ? 'Installerer...' : 'Installer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'search' && (
          <div className="max-w-3xl">
            <div
              className="rounded-2xl p-6 mb-4"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(40px)',
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Søg ClawHub</h3>
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Søg efter skills..."
                  style={inputStyle}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || searching}
                  className="px-5 py-2 rounded-xl font-semibold text-white text-sm transition-all"
                  style={{
                    background: searching ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.2)',
                    border: '1px solid rgba(0,122,255,0.4)',
                    opacity: !searchQuery.trim() || searching ? 0.6 : 1,
                  }}
                >
                  {searching ? 'Søger...' : 'Søg'}
                </button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Søgeresultater ({searchResults.length})
                </p>
                {searchResults.map((result, idx) => (
                  <SearchResultCard
                    key={idx}
                    result={result}
                    onInstall={() => handleInstallFromHub(result.name)}
                    installing={installing === result.name}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <SkillDetailModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
    </div>
  )
}
