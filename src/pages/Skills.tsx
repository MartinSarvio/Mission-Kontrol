import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'

interface Skill {
  name: string
  description: string
  location: 'workspace' | 'system'
  path: string
  category: string
}

interface RecommendedSkill {
  name: string
  description: string
  reason: string
  category: string
  owner: string
  url: string
  version: string
}

const INSTALLED_SKILLS: Skill[] = [
  // Workspace skills (user-installed)
  { name: 'perplexity', description: 'Søg på nettet med AI-drevne svar via Perplexity API. Returnerer grundede svar med kilder. Understøtter batch-forespørgsler.', location: 'workspace', path: '/data/.openclaw/workspace/skills/perplexity', category: 'Søgning' },
  { name: 'youtube-watcher', description: 'Hent og læs transskriptioner fra YouTube-videoer. Brug til at opsummere videoer eller udtrække information.', location: 'workspace', path: '/data/.openclaw/workspace/skills/youtube-watcher', category: 'Medier' },
  
  // System skills (built-in)
  { name: 'clawhub', description: 'Søg, installer, opdater og publicer agent skills fra clawhub.com.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/clawhub', category: 'System' },
  { name: 'healthcheck', description: 'Sikkerhedsaudit og hardening for OpenClaw deployments. Firewall, SSH, opdateringer.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/healthcheck', category: 'Sikkerhed' },
  { name: 'weather', description: 'Aktuel vejrudsigt og prognoser (ingen API-nøgle påkrævet).', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/weather', category: 'Data' },
  { name: 'openai-image-gen', description: 'Generer billeder via OpenAI Images API. Random prompt sampler + gallerivisning.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/openai-image-gen', category: 'AI / Kreativ' },
  { name: 'openai-whisper-api', description: 'Transskriber lyd via OpenAI Whisper API.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/openai-whisper-api', category: 'AI / Lyd' },
  { name: 'skill-creator', description: 'Opret eller opdater AgentSkills. Design, strukturer og pakkér skills med scripts og referencer.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/skill-creator', category: 'Udvikling' },
  { name: 'github', description: 'GitHub integration — repos, issues, PRs, actions.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/github', category: 'Udvikling' },
  { name: 'coding-agent', description: 'Avanceret kodnings-agent med multi-fil redigering og projekt-forståelse.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/coding-agent', category: 'Udvikling' },
  { name: 'discord', description: 'Discord bot integration og server management.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/discord', category: 'Kommunikation' },
  { name: 'slack', description: 'Slack workspace integration og besked-håndtering.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/slack', category: 'Kommunikation' },
  { name: 'notion', description: 'Notion workspace integration — sider, databaser, blokke.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/notion', category: 'Produktivitet' },
  { name: 'trello', description: 'Trello board og task management integration.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/trello', category: 'Produktivitet' },
  { name: 'spotify-player', description: 'Styr Spotify afspilning — søg, afspil, kø.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/spotify-player', category: 'Medier' },
  { name: 'canvas', description: 'Opret og vis interaktive canvases med HTML/JS.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/canvas', category: 'Visuel' },
  { name: 'summarize', description: 'Opsummer lange tekster, dokumenter og samtaler.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/summarize', category: 'AI / Tekst' },
  { name: 'session-logs', description: 'Se og analyser session-logs og samtalehistorik.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/session-logs', category: 'System' },
  { name: 'model-usage', description: 'Overvåg model-forbrug, tokens og omkostninger.', location: 'system', path: '/usr/local/lib/node_modules/openclaw/skills/model-usage', category: 'System' },
]

// Only verified skills from ClawHub with known owners
const RECOMMENDED_SKILLS: RecommendedSkill[] = [
  { name: 'supabase', description: 'Forbind til Supabase for database-operationer, vector search og storage. Kør SQL queries, similarity search med pgvector, og administrer tabeller.', reason: 'Direkte integration med FLOW backend', category: 'Udvikling', owner: 'stopmoclay', url: 'https://clawhub.com/stopmoclay/supabase', version: '1.0.0' },
  { name: 'vercel', description: 'Deploy applikationer og administrer projekter. Kommandoer til deployments, projekter, domæner, environment variables og live docs.', reason: 'Styr Mission Kontrol og FLOW deployments', category: 'Udvikling', owner: 'TheSethRose', url: 'https://clawhub.com/TheSethRose/vercel', version: '1.0.1' },
  { name: 'github', description: 'Interager med GitHub via gh CLI. Issues, PRs, CI runs og avancerede API queries.', reason: 'Repo management for alle dine projekter', category: 'Udvikling', owner: 'steipete', url: 'https://clawhub.com/steipete/github', version: '1.0.0' },
  { name: 'wolt-orders', description: 'Find restauranter med avancerede filtre, bestil mad, track status i realtid, automatisk delay-detektion.', reason: 'Relevant for restaurations-branchen (FLOW)', category: 'Restaurant', owner: 'Dviros', url: 'https://clawhub.com/Dviros/wolt-orders', version: '1.0.0' },
  { name: 'restaurants', description: 'Restaurant discovery og management skill.', reason: 'Direkte relevant for OrderFlow AI', category: 'Restaurant', owner: 'clawhub', url: 'https://clawhub.com/restaurants', version: '1.0.0' },
]

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
  'Design': { text: 'text-rose-400', bg: 'rgba(251,113,133,0.1)' },
  'Overvågning': { text: 'text-amber-400', bg: 'rgba(245,158,11,0.1)' },
  'Restaurant': { text: 'text-orange-400', bg: 'rgba(255,149,0,0.1)' },
}

export default function Skills() {
  const { isConnected } = useLiveData()
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [tab, setTab] = useState<'installed' | 'recommended' | 'browse'>('installed')
  const [searchQuery, setSearchQuery] = useState('')
  const [installUrl, setInstallUrl] = useState('')
  const [installing, setInstalling] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState('')

  const categories = [...new Set(INSTALLED_SKILLS.map(s => s.category))]
  
  const filteredSkills = INSTALLED_SKILLS.filter(s => {
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
      <div className="flex items-center justify-between mb-1">
        <h1 className="page-title">Færdigheder</h1>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {(['installed', 'recommended', 'browse'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
              style={{
                background: tab === t ? 'rgba(0,122,255,0.2)' : 'transparent',
                color: tab === t ? '#fff' : 'rgba(255,255,255,0.5)',
                border: tab === t ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent'
              }}>
              {t === 'installed' ? `Installeret (${INSTALLED_SKILLS.length})` : t === 'recommended' ? 'Anbefalede' : 'Gennemse'}
            </button>
          ))}
        </div>
      </div>
      <p className="caption mb-5">Administrer agent-færdigheder og plugins</p>

      {tab === 'installed' && (
        <>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input text-xs py-1.5">
              <option value="">Alle kategorier</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"><Icon name="magnifying-glass" size={14} /></span>
              <input type="text" placeholder="Søg i skills..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input text-xs py-1.5 w-48 pl-8" />
            </div>
          </div>

          {workspaceSkills.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <h3 className="text-sm font-semibold text-white">Bruger-installerede</h3>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>{workspaceSkills.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {workspaceSkills.map(s => (
                  <div key={s.name} onClick={() => setSelectedSkill(s)} className="rounded-xl p-4 cursor-pointer transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
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
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,199,89,0.1)', color: 'rgba(52,199,89,0.8)' }}>workspace</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <h3 className="text-sm font-semibold text-white">System Skills</h3>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>{systemSkills.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {systemSkills.map(s => (
              <div key={s.name} onClick={() => setSelectedSkill(s)} className="rounded-xl p-4 cursor-pointer transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
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

      {tab === 'recommended' && (
        <>
          <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(0,122,255,0.05)', border: '1px solid rgba(0,122,255,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="sparkle" size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-blue-400">Anbefalede til dit setup</h3>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Baseret på dine projekter (FLOW, Mission Kontrol) og din tech stack (Supabase, Vercel, React).
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RECOMMENDED_SKILLS.map(s => (
              <div key={s.name} className="rounded-xl p-4 transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon name="sparkle" size={16} className="text-yellow-400" />
                    <h4 className="text-sm font-semibold text-white">{s.name}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>v{s.version}</span>
                  </div>
                  <CategoryBadge category={s.category} />
                </div>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.description}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>af <span className="text-white/50">{s.owner}</span></span>
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                  <span className="text-[10px]" style={{ color: 'rgba(52,199,89,0.7)' }}>Verificeret på ClawHub</span>
                </div>
                <p className="text-[11px] mb-3" style={{ color: 'rgba(0,122,255,0.7)' }}>
                  <Icon name="info-circle" size={11} className="inline mr-1" />
                  {s.reason}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setInstalling(s.name)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: 'rgba(0,122,255,0.15)', border: '1px solid rgba(0,122,255,0.3)', color: '#007AFF' }}>
                    {installing === s.name ? 'Installerer...' : 'Installer'}
                  </button>
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all inline-flex items-center gap-1"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                    <Icon name="doc" size={11} /> Se på ClawHub
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'browse' && (
        <>
          <div className="space-y-4 mb-6">
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-semibold text-white mb-3">Installer fra URL</h3>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Indsæt en URL til en GitHub repo eller skill-pakke</p>
              <div className="flex gap-2">
                <input type="url" value={installUrl} onChange={e => setInstallUrl(e.target.value)}
                  placeholder="https://github.com/user/skill-name" className="input flex-1 text-sm" />
                <button onClick={() => { if (installUrl) setInstalling('url') }}
                  className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
                  style={{ background: 'rgba(0,122,255,0.15)', border: '1px solid rgba(0,122,255,0.3)', color: '#007AFF' }}>
                  Installer
                </button>
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-semibold text-white mb-3">Søg på ClawHub</h3>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Find og installer skills fra clawhub.com</p>
              <div className="flex gap-2">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Søg efter skills..." className="input flex-1 text-sm" />
                <button className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
                  style={{ background: 'rgba(0,122,255,0.15)', border: '1px solid rgba(0,122,255,0.3)', color: '#007AFF' }}>
                  Søg
                </button>
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-semibold text-white mb-2">Alle tilgængelige system skills</h3>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                53 skills tilgængelige i OpenClaw. Disse kan aktiveres via konfiguration.
              </p>
              <div className="flex flex-wrap gap-2">
                {['1password','apple-notes','apple-reminders','bear-notes','blogwatcher','blucli','bluebubbles','camsnap','canvas','clawhub','coding-agent','discord','food-order','gemini','gifgrep','github','goplaces','healthcheck','himalaya','imsg','local-places','model-usage','nano-banana-pro','nano-pdf','notion','obsidian','openai-image-gen','openai-whisper','openai-whisper-api','openhue','oracle','peekaboo','session-logs','sherpa-onnx-tts','skill-creator','slack','songsee','sonoscli','spotify-player','summarize','things-mac','tmux','trello','video-frames','voice-call','wacli','weather'].map(name => (
                  <span key={name} className="text-[11px] px-2 py-1 rounded-lg cursor-pointer transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setSelectedSkill(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] z-50 p-6 rounded-2xl"
            style={{ background: 'rgba(28,28,30,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Icon name="sparkle" size={24} className={selectedSkill.location === 'workspace' ? 'text-green-400' : 'text-blue-400'} />
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedSkill.name}</h2>
                  <CategoryBadge category={selectedSkill.category} />
                </div>
              </div>
              <button onClick={() => setSelectedSkill(null)} className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
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
