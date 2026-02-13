import { useState, useEffect, useCallback } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { fetchInstalledSkills, installSkill, searchSkills, SkillInfo } from '../api/openclaw'

interface Skill extends SkillInfo {
  path?: string
}

interface ClawHubSkill {
  name: string
  version: string
  description: string
  score?: number
}

interface RecommendedSkill {
  name: string
  description: string
  reason: string
  category: string
  owner: string
  url: string
  version: string
  score?: number
}

// Detect category from skill name/path
function detectCategory(name: string): string {
  const map: Record<string, string> = {
    'perplexity': 'Søgning', 'youtube-watcher': 'Medier', 'clawhub': 'System',
    'healthcheck': 'Sikkerhed', 'weather': 'Data', 'openai-image-gen': 'AI / Kreativ',
    'openai-whisper-api': 'AI / Lyd', 'openai-whisper': 'AI / Lyd', 'skill-creator': 'Udvikling',
    'github': 'Udvikling', 'coding-agent': 'Udvikling', 'discord': 'Kommunikation',
    'slack': 'Kommunikation', 'notion': 'Produktivitet', 'trello': 'Produktivitet',
    'spotify-player': 'Medier', 'canvas': 'Visuel', 'summarize': 'AI / Tekst',
    'session-logs': 'System', 'model-usage': 'System', 'voice-call': 'Kommunikation',
    'imsg': 'Kommunikation', 'apple-notes': 'Produktivitet', 'apple-reminders': 'Produktivitet',
    'bear-notes': 'Produktivitet', 'things-mac': 'Produktivitet', 'obsidian': 'Produktivitet',
  }
  return map[name] || 'Andet'
}

const categoryColors: Record<string, { text: string; bg: string }> = {
  'Søgning': { text: 'text-blue-400', bg: 'rgba(0,122,255,0.1)' },
  'Medier': { text: 'text-purple-400', bg: 'rgba(175,82,222,0.1)' },
  'System': { text: 'text-gray-400', bg: 'rgba(142,142,147,0.1)' },
  'Sikkerhed': { text: 'text-red-400', bg: 'rgba(255,59,48,0.1)' },
  'Data': { text: 'text-green-400', bg: 'rgba(52,199,89,0.1)' },
  'AI / Kreativ': { text: 'text-pink-400', bg: 'rgba(255,45,85,0.1)' },
  'AI / Lyd': { text: 'text-orange-400', bg: 'rgba(255,149,0,0.1)' },
  'AI / Tekst': { text: 'text-cyan-400', bg: 'rgba(0,199,190,0.1)' },
  'Udvikling': { text: 'text-yellow-400', bg: 'rgba(255,204,0,0.1)' },
  'Kommunikation': { text: 'text-indigo-400', bg: 'rgba(88,86,214,0.1)' },
  'Produktivitet': { text: 'text-teal-400', bg: 'rgba(48,176,199,0.1)' },
  'Visuel': { text: 'text-violet-400', bg: 'rgba(139,92,246,0.1)' },
  'Restaurant': { text: 'text-orange-400', bg: 'rgba(255,149,0,0.1)' },
  'Andet': { text: 'text-gray-400', bg: 'rgba(142,142,147,0.1)' },
}

export default function Skills() {
  const { isConnected } = useLiveData()
  const [installedSkills, setInstalledSkills] = useState<Skill[]>([])
  const [recommendedSkills, setRecommendedSkills] = useState<RecommendedSkill[]>([])
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [tab, setTab] = useState<'installed' | 'recommended' | 'browse'>('installed')
  const [searchQuery, setSearchQuery] = useState('')
  const [installUrl, setInstallUrl] = useState('')
  const [installing, setInstalling] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [loadingInstalled, setLoadingInstalled] = useState(true)
  const [loadingRecommended, setLoadingRecommended] = useState(false)
  const [browseQuery, setBrowseQuery] = useState('')
  const [browseResults, setBrowseResults] = useState<ClawHubSkill[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)

  // Fetch installed skills from API
  const fetchInstalledSkillsData = useCallback(async () => {
    if (!isConnected) { setLoadingInstalled(false); return }
    setLoadingInstalled(true)
    try {
      const skillsData = await fetchInstalledSkills()
      const skills: Skill[] = skillsData.map(s => ({
        ...s,
        path: s.location === 'workspace' 
          ? `/data/.openclaw/workspace/skills/${s.name}`
          : `/usr/local/lib/node_modules/openclaw/skills/${s.name}`,
      }))
      setInstalledSkills(skills)
    } catch (err) {
      console.error('Failed to fetch skills:', err)
    } finally {
      setLoadingInstalled(false)
    }
  }, [isConnected])

  // Fetch recommended skills from ClawHub search using API
  const fetchRecommended = useCallback(async () => {
    if (!isConnected) return
    setLoadingRecommended(true)
    try {
      // Search for skills relevant to our stack
      const searches = ['supabase', 'vercel', 'github', 'restaurant', 'deploy']
      const seen = new Set<string>()
      const results: RecommendedSkill[] = []
      const reasons: Record<string, string> = {
        'supabase': 'Database integration til dine projekter',
        'vercel': 'Deploy management for Mission Kontrol',
        'github': 'Repo og PR management',
        'restaurant': 'Relevant for OrderFlow / FLOW',
        'deploy': 'Deployment automation',
      }
      const categories: Record<string, string> = {
        'supabase': 'Udvikling', 'vercel': 'Udvikling', 'github': 'Udvikling',
        'restaurant': 'Restaurant', 'deploy': 'Udvikling',
      }

      for (const query of searches) {
        const skillResults = await searchSkills(query)
        
        for (const skill of skillResults) {
          if (!seen.has(skill.name) && skill.score >= 0.2) {
            seen.add(skill.name)
            const owner = skill.name.includes('-') ? skill.name.split('-')[0] : 'clawhub'
            results.push({
              name: skill.name,
              version: skill.version,
              description: skill.description,
              reason: reasons[query] || `Relevant for ${query}`,
              category: categories[query] || 'Andet',
              owner,
              url: `https://clawhub.com/${skill.name}`,
              score: skill.score,
            })
          }
        }
      }

      setRecommendedSkills(results.slice(0, 12))
    } catch (err) {
      console.error('Failed to fetch recommended:', err)
    } finally {
      setLoadingRecommended(false)
    }
  }, [isConnected])

  // Search ClawHub using API
  const searchClawHub = useCallback(async (query: string) => {
    if (!query.trim()) { setBrowseResults([]); return }
    setBrowseLoading(true)
    try {
      const results = await searchSkills(query)
      setBrowseResults(results.map(s => ({
        name: s.name,
        version: s.version,
        description: s.description,
        score: s.score,
      })))
    } catch (err) { 
      console.error('Failed to search ClawHub:', err)
      setBrowseResults([]) 
    }
    finally { setBrowseLoading(false) }
  }, [])

  // Install skill using API
  const handleInstall = async (name: string) => {
    setInstalling(name)
    try {
      await installSkill(name)
      // Refresh installed skills after short delay
      setTimeout(() => {
        fetchInstalledSkillsData()
      }, 2000)
    } catch (err) {
      console.error('Install failed:', err)
    } finally {
      setInstalling(null)
    }
  }

  useEffect(() => { fetchInstalledSkillsData() }, [fetchInstalledSkillsData])
  useEffect(() => { if (tab === 'recommended' && recommendedSkills.length === 0) fetchRecommended() }, [tab, fetchRecommended, recommendedSkills.length])

  const categories = [...new Set(installedSkills.map(s => s.category))]
  
  const filteredSkills = installedSkills.filter(s => {
    if (filterCategory && s.category !== filterCategory) return false
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const workspaceSkills = filteredSkills.filter(s => s.location === 'workspace')
  const systemSkills = filteredSkills.filter(s => s.location === 'system')

  const CategoryBadge = ({ category }: { category: string }) => {
    const c = categoryColors[category] || { text: 'text-white/50', bg: 'rgba(255,255,255,0.05)' }
    return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.text}`} style={{ background: c.bg }}>{category}</span>
  }

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Færdigheder</h1>
        <div className="overflow-x-auto w-full sm:w-auto">
          <div className="flex items-center gap-1 p-1 rounded-xl min-w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['installed', 'recommended', 'browse'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap"
                style={{
                  background: tab === t ? 'rgba(0,122,255,0.2)' : 'transparent',
                  color: tab === t ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: tab === t ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent',
                  minHeight: '44px',
                }}>
                {t === 'installed' ? `Installeret (${installedSkills.length})` : t === 'recommended' ? 'Anbefalede' : 'Gennemse'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="caption mb-5">Administrer agent-færdigheder og plugins</p>

      {tab === 'installed' && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input text-xs py-1.5 w-full sm:w-auto" style={{ minHeight: '44px' }}>
              <option value="">Alle kategorier</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative w-full sm:w-auto">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"><Icon name="magnifying-glass" size={14} /></span>
              <input type="text" placeholder="Søg i skills..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input text-xs py-1.5 w-full sm:w-48 pl-8" style={{ minHeight: '44px' }} />
            </div>
          </div>

          {loadingInstalled ? (
            <div className="text-center py-12">
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>Henter installerede skills...</p>
            </div>
          ) : installedSkills.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="sparkle" size={32} className="text-white/20 mx-auto mb-3" />
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>Ingen skills fundet</p>
              <p className="caption mt-1">Tjek Gateway forbindelsen i Indstillinger</p>
            </div>
          ) : (
            <>
              {workspaceSkills.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <h3 className="text-sm font-semibold text-white">Bruger-installerede</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>{workspaceSkills.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {workspaceSkills.map(s => (
                      <div key={s.name} onClick={() => setSelectedSkill(s)} className="rounded-xl p-4 cursor-pointer transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', minHeight: '44px' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(0,122,255,0.3)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon name="sparkle" size={18} className="text-green-400" />
                            <h4 className="text-sm font-semibold text-white">{s.name}</h4>
                          </div>
                          <CategoryBadge category={s.category} />
                        </div>
                        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.description}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,199,89,0.1)', color: 'rgba(52,199,89,0.8)' }}>workspace</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {systemSkills.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <h3 className="text-sm font-semibold text-white">System Skills</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>{systemSkills.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {systemSkills.map(s => (
                      <div key={s.name} onClick={() => setSelectedSkill(s)} className="rounded-xl p-4 cursor-pointer transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', minHeight: '44px' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,122,255,0.2)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon name="gear" size={16} className="text-white/40" />
                            <h4 className="text-sm font-semibold text-white">{s.name}</h4>
                          </div>
                          <CategoryBadge category={s.category} />
                        </div>
                        <p className="text-xs line-clamp-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {tab === 'recommended' && (
        <>
          <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(0,122,255,0.05)', border: '1px solid rgba(0,122,255,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="sparkle" size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-blue-400">Anbefalede fra ClawHub</h3>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Live søgeresultater fra clawhub.com baseret på din tech stack (Supabase, Vercel, GitHub, Restauranter).
            </p>
          </div>
          {loadingRecommended ? (
            <div className="text-center py-12">
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>Søger på ClawHub...</p>
            </div>
          ) : recommendedSkills.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>Ingen anbefalinger fundet</p>
              <button onClick={fetchRecommended} className="mt-3 text-xs px-4 py-2 rounded-lg" style={{ background: '#007AFF', color: '#fff', minHeight: '44px' }}>
                Prøv igen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendedSkills.map(s => (
                <div key={s.name} className="rounded-xl p-4 transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', minHeight: '44px' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon name="sparkle" size={16} className="text-yellow-400" />
                      <h4 className="text-sm font-semibold text-white">{s.name}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>v{s.version}</span>
                    </div>
                    <CategoryBadge category={s.category} />
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.description}</p>
                  <p className="text-[11px] mb-3" style={{ color: 'rgba(0,122,255,0.7)' }}>
                    <Icon name="info-circle" size={11} className="inline mr-1" />
                    {s.reason}
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button onClick={() => handleInstall(s.name)}
                      disabled={installing === s.name}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{ background: '#007AFF', color: '#fff', minHeight: '44px', opacity: installing === s.name ? 0.6 : 1 }}>
                      {installing === s.name ? 'Installerer...' : 'Installer'}
                    </button>
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all inline-flex items-center justify-center gap-1"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', minHeight: '44px' }}>
                      <Icon name="doc" size={11} /> Se på ClawHub
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'browse' && (
        <>
          <div className="space-y-4 mb-6">
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-semibold text-white mb-3">Søg på ClawHub</h3>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Find og installer skills fra clawhub.com</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={browseQuery} onChange={e => setBrowseQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchClawHub(browseQuery)}
                  placeholder="Søg efter skills..." className="input flex-1 text-sm" style={{ minHeight: '44px' }} />
                <button onClick={() => searchClawHub(browseQuery)}
                  disabled={browseLoading}
                  className="px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap"
                  style={{ background: '#007AFF', color: '#fff', minHeight: '44px', opacity: browseLoading ? 0.6 : 1 }}>
                  {browseLoading ? 'Søger...' : 'Søg'}
                </button>
              </div>
            </div>

            {browseResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {browseResults.map(s => (
                  <div key={s.name} className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-white">{s.name}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>v{s.version}</span>
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.description}</p>
                    {s.score !== undefined && (
                      <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Relevans: {(s.score * 100).toFixed(0)}%</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleInstall(s.name)}
                        disabled={installing === s.name}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: '#007AFF', color: '#fff', minHeight: '44px', opacity: installing === s.name ? 0.6 : 1 }}>
                        {installing === s.name ? 'Installerer...' : 'Installer'}
                      </button>
                      <a href={`https://clawhub.com/${s.name}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', minHeight: '44px' }}>
                        ClawHub
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-semibold text-white mb-3">Installer fra URL</h3>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Indsæt en URL til en GitHub repo eller skill-pakke</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="url" value={installUrl} onChange={e => setInstallUrl(e.target.value)}
                  placeholder="https://github.com/user/skill-name" className="input flex-1 text-sm" style={{ minHeight: '44px' }} />
                <button onClick={() => { if (installUrl) handleInstall(installUrl) }}
                  className="px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap"
                  style={{ background: '#007AFF', color: '#fff', minHeight: '44px' }}>
                  Installer
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setSelectedSkill(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-[500px] max-w-[500px] z-50 p-4 sm:p-6 rounded-xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(28,28,30,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Icon name="sparkle" size={24} className={selectedSkill.location === 'workspace' ? 'text-green-400' : 'text-blue-400'} />
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedSkill.name}</h2>
                  <CategoryBadge category={selectedSkill.category} />
                </div>
              </div>
              <button onClick={() => setSelectedSkill(null)} className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', minWidth: '44px', minHeight: '44px' }}>
                <Icon name="xmark" size={14} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>{selectedSkill.description}</p>
            <div className="space-y-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Placering</p>
                <p className="text-xs font-mono text-white/70">{selectedSkill.path}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Type</p>
                <p className="text-sm text-white">{selectedSkill.location === 'workspace' ? 'Bruger-installeret' : 'System skill'}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
