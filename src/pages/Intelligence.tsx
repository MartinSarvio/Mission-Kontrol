import { useState, useEffect, useCallback } from 'react'
import Icon from '../components/Icon'

interface ResearchItem {
  id: string
  subject: string
  sources: ('x' | 'linkedin' | 'facebook')[]
  date: string
  preview: string
  read: boolean
  starred: boolean
  tags: string[]
  content: string
  flowRelevance: string
  citations: { title: string; url: string; source: string }[]
}

interface DeployedTask {
  id: string
  title: string
  type: string
  priority: 'critical' | 'high' | 'normal' | 'low'
  status: 'queued' | 'active'
  description: string
  articleId: string
  created: string
}

const sourceConfig = {
  x: { label: '𝕏', bg: 'bg-black', text: 'text-white' },
  linkedin: { label: 'LinkedIn', bg: 'bg-[#0A66C2]', text: 'text-white' },
  facebook: { label: 'Facebook', bg: 'bg-[#1877F2]', text: 'text-white' },
}

const mockResearch: ResearchItem[] = [
  {
    id: 'r1', subject: 'Top 5 Restaurant Automation Trends 2026', sources: ['linkedin', 'x'], date: '2026-02-12',
    preview: 'AI-drevet ordretagning, køkkenautomatisering og predictive inventory management dominerer restaurantbranchen i 2026.',
    read: false, starred: true, tags: ['automation', 'AI', 'trends'],
    content: 'Restaurantbranchen gennemgår en massiv digital transformation i 2026. De fem vigtigste trends er:\n\n1. **AI-drevet ordretagning**: Flere og flere restauranter implementerer AI-chatbots og stemmeassistenter.\n\n2. **Køkkenautomatisering**: Robotarme til simple tilberedningsopgaver er nu tilgængelige.\n\n3. **Predictive Inventory Management**: ML-modeller forudsiger madspild med 92% nøjagtighed.\n\n4. **Personaliserede digitale menukort**: Dynamiske menuer der tilpasser sig.\n\n5. **Integreret CRM og loyalitetsprogrammer**: Platforme der kombinerer POS, CRM og marketing.',
    flowRelevance: 'FLOW kan positionere sig som den danske one-stop-shop. Ved at kombinere dynamiske menukort med integreret CRM har FLOW en unik mulighed.',
    citations: [{ title: 'Restaurant Tech Trends 2026', url: '#', source: 'LinkedIn' }, { title: 'AI Ordering Adoption Rates', url: '#', source: '𝕏' }],
  },
  {
    id: 'r2', subject: 'Hvordan owner.com dominerer restaurant-markedet', sources: ['linkedin'], date: '2026-02-11',
    preview: 'Owner.com har nu over 10.000 restaurant-kunder og en ARR på $50M.',
    read: false, starred: false, tags: ['konkurrent', 'owner.com', 'strategi'],
    content: 'Owner.com har cementeret sin position som en af de hurtigst voksende restaurant-tech platforme.\n\n**Produktstrategi**: Owner.com tilbyder website, online ordering, marketing automation og loyalty program i én pakke.\n\n**Design og UX**: Konverteringsraten er 3x højere end branchegennemsnittet.\n\n**Begrænsninger**: Primært fokuseret på det amerikanske marked.',
    flowRelevance: 'Owner.com er den tætteste internationale konkurrent til FLOW. FLOWs fordel er lokal tilpasning: MobilePay, dansk sprog.',
    citations: [{ title: 'Owner.com Series B Announcement', url: '#', source: 'LinkedIn' }],
  },
  {
    id: 'r3', subject: 'SMS Marketing ROI for Restauranter', sources: ['x', 'facebook'], date: '2026-02-10',
    preview: 'SMS-kampagner viser en gennemsnitlig ROI på 25x.',
    read: true, starred: true, tags: ['marketing', 'SMS', 'ROI'],
    content: 'Nye data fra 2026 viser at SMS-marketing forbliver den mest effektive kanal for restauranter.\n\n**Nøgletal**: Åbningsrate: 98%, Konverteringsrate: 15%, ROI: 25x.',
    flowRelevance: 'SMS-marketing bør være en kernefunktion i FLOW.',
    citations: [{ title: 'Restaurant SMS Marketing Benchmarks', url: '#', source: '𝕏' }],
  },
  {
    id: 'r4', subject: 'Kundeloyalitet: Hvad virker i 2026?', sources: ['linkedin', 'facebook'], date: '2026-02-09',
    preview: 'Stempel-kort er døde. De nye loyalitetsprogrammer bruger gamification.',
    read: true, starred: false, tags: ['loyalitet', 'retention', 'gamification'],
    content: 'Kundeloyalitet har ændret sig fundamentalt.\n\n**Gamification slår point-systemer**: 2.3x højere engagement.\n\n**Subscription-modeller**: Vokset 80% i 2025-2026.',
    flowRelevance: 'FLOW bør inkludere et moderne loyalitetssystem med gamification.',
    citations: [{ title: 'Loyalty Program Evolution in F&B', url: '#', source: 'LinkedIn' }],
  },
  {
    id: 'r5', subject: 'AI-drevet Menukort Optimering', sources: ['x'], date: '2026-02-08',
    preview: 'Dynamisk prissætning og AI-optimerede menukort øger omsætningen med 8-15%.',
    read: true, starred: false, tags: ['AI', 'menu', 'pricing'],
    content: 'Menu engineering har fået et AI-boost i 2026.\n\n**Dynamisk prissætning**: 12% højere omsætning.\n\n**AI-genererede beskrivelser**: Øger salget med op til 20%.',
    flowRelevance: 'AI-menukort optimering kan være en stærk premium-feature for FLOW.',
    citations: [{ title: 'Dynamic Pricing for Restaurants', url: '#', source: '𝕏' }],
  },
  {
    id: 'r6', subject: 'Restaurant App vs. Website: Hvad foretrækker kunderne?', sources: ['x', 'linkedin', 'facebook'], date: '2026-02-07',
    preview: 'PWA\'er vinder over native apps for de fleste restauranter.',
    read: true, starred: true, tags: ['PWA', 'mobile', 'UX'],
    content: 'Debatten om app vs. website er afgjort.\n\n**PWA vinder**: 73% af restauranter der skiftede fra native app til PWA så øget engagement.',
    flowRelevance: 'FLOW bør bygge alle restaurant-sites som PWA\'er fra start.',
    citations: [{ title: 'PWA vs Native App for Restaurants', url: '#', source: '𝕏' }],
  },
  {
    id: 'r7', subject: 'Automatiseret Social Media for Mad-brands', sources: ['facebook'], date: '2026-02-06',
    preview: 'AI-genereret content øger social media engagement med 45%.',
    read: true, starred: false, tags: ['social media', 'automation', 'content'],
    content: 'Social media automatisering for restauranter er modnet.\n\n**AI Content Generation**: Restauranter sparer 8 timer om ugen.',
    flowRelevance: 'Social media automatisering kan være en add-on service i FLOW.',
    citations: [{ title: 'Restaurant Social Media Automation Guide', url: '#', source: 'Facebook' }],
  },
  {
    id: 'r8', subject: 'Supabase vs. Firebase til Restaurant-tech', sources: ['x', 'linkedin'], date: '2026-02-05',
    preview: 'Supabase vokser 3x hurtigere end Firebase i restaurant-tech segmentet.',
    read: true, starred: false, tags: ['tech stack', 'supabase', 'database'],
    content: 'Tech stack valget har en klar vinder.\n\n**Supabase fordele**: PostgreSQL, row-level security, realtime subscriptions, open source.',
    flowRelevance: 'Godt nyt — FLOW bruger allerede Supabase!',
    citations: [{ title: 'Supabase vs Firebase for SaaS 2026', url: '#', source: '𝕏' }],
  },
]

const defaultConfig = {
  frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
  time: '08:00',
  platforms: { x: true, linkedin: true, facebook: true },
  topics: ['restaurant automation', 'food delivery', 'CRM restaurant', 'marketing automation'],
  agent: 'research-agent',
  active: true,
}

interface Toast {
  id: string
  message: string
}

export default function Intelligence() {
  const [items, setItems] = useState(mockResearch)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState(defaultConfig)
  const [newTopic, setNewTopic] = useState('')
  const [deployedArticles, setDeployedArticles] = useState<Set<string>>(new Set())
  const [deployedTasks, setDeployedTasks] = useState<DeployedTask[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const selectedItem = items.find(i => i.id === selectedId) || null

  const showToast = useCallback((message: string) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  function toggleRead(id: string) { setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i)) }
  function toggleStar(id: string, e: React.MouseEvent) { e.stopPropagation(); setItems(prev => prev.map(i => i.id === id ? { ...i, starred: !i.starred } : i)) }
  function openItem(item: ResearchItem) { toggleRead(item.id); setSelectedId(item.id) }
  function addTopic() { if (newTopic.trim() && !config.topics.includes(newTopic.trim())) { setConfig(prev => ({ ...prev, topics: [...prev.topics, newTopic.trim()] })); setNewTopic('') } }
  function removeTopic(topic: string) { setConfig(prev => ({ ...prev, topics: prev.topics.filter(t => t !== topic) })) }

  function deployArticle(item: ResearchItem) {
    if (deployedArticles.has(item.id)) return
    const hasActive = deployedTasks.some(t => t.status === 'active')
    const task: DeployedTask = {
      id: `intel-${Date.now()}`,
      title: `Implementér: ${item.subject}`,
      type: 'intelligens',
      priority: 'normal',
      status: hasActive ? 'queued' : 'active',
      description: item.flowRelevance,
      articleId: item.id,
      created: new Date().toISOString(),
    }
    setDeployedTasks(prev => [...prev, task])
    setDeployedArticles(prev => new Set(prev).add(item.id))
    showToast(`Opgave oprettet: ${item.subject}`)
  }

  const unreadCount = items.filter(i => !i.read).length

  // Config panel (shared)
  const configPanel = showConfig && (
    <div className="card mb-4" style={{ border: '1px solid rgba(0,122,255,0.15)' }}>
      <h3 className="section-title mb-4">Research Konfiguration</h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#86868b' }}>Frekvens</label>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map(f => (
              <button key={f} onClick={() => setConfig(prev => ({ ...prev, frequency: f }))}
                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all ${config.frequency === f ? 'bg-blue-500 text-white' : 'btn-secondary'}`}>
                {f === 'daily' ? 'Dagligt' : f === 'weekly' ? 'Ugentligt' : 'Månedligt'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#86868b' }}>Tidspunkt</label>
          <input type="time" value={config.time} onChange={e => setConfig(prev => ({ ...prev, time: e.target.value }))} className="input text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#86868b' }}>Platforme</label>
          <div className="flex gap-3">
            {(['x', 'linkedin', 'facebook'] as const).map(p => (
              <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={config.platforms[p]} onChange={e => setConfig(prev => ({ ...prev, platforms: { ...prev.platforms, [p]: e.target.checked } }))} className="rounded" />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceConfig[p].bg} ${sourceConfig[p].text}`}>{sourceConfig[p].label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#86868b' }}>Agent</label>
          <select value={config.agent} onChange={e => setConfig(prev => ({ ...prev, agent: e.target.value }))} className="input text-sm w-full">
            <option value="research-agent">research-agent</option>
            <option value="analytics-agent">analytics-agent</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#86868b' }}>Emner</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {config.topics.map(topic => (
              <span key={topic} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,122,255,0.08)', color: '#007AFF' }}>
                {topic}
                <button onClick={() => removeTopic(topic)} className="hover:text-red-500 ml-0.5"><Icon name="xmark" size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Tilføj emne..." value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTopic()} className="input text-sm flex-1" />
            <button onClick={addTopic} className="btn-primary text-xs">Tilføj</button>
          </div>
        </div>
        <div className="col-span-2 flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Status</span>
            <button onClick={() => setConfig(prev => ({ ...prev, active: !prev.active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.active ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm ${config.active ? 'text-green-600 font-medium' : 'text-gray-400'}`}>{config.active ? 'Aktiv' : 'Inaktiv'}</span>
          </div>
          <button onClick={() => setShowConfig(false)} className="btn-primary text-xs">Gem konfiguration</button>
        </div>
      </div>
    </div>
  )

  // Left column: article list
  const articleList = (
    <div className="space-y-0.5">
      {items.map(item => (
        <div key={item.id} onClick={() => openItem(item)}
          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 rounded-xl ${
            selectedId === item.id ? '' : 'hover:bg-white/40'
          }`}
          style={selectedId === item.id
            ? { background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.15)' }
            : !item.read
              ? { background: 'rgba(0,122,255,0.03)' }
              : {}
          }>
          <button onClick={e => toggleStar(item.id, e)}
            className={`flex-shrink-0 transition-colors ${item.starred ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}>
            <Icon name={item.starred ? 'star-fill' : 'star'} size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {!item.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
              <h3 className={`text-[13px] truncate ${item.read ? 'font-medium' : 'font-bold'}`} style={{ color: item.read ? '#636366' : '#1d1d1f' }}>{item.subject}</h3>
            </div>
            <p className="text-[11px] line-clamp-1" style={{ color: '#86868b' }}>{item.preview}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {item.sources.map(s => (
                <span key={s} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${sourceConfig[s].bg} ${sourceConfig[s].text}`}>{sourceConfig[s].label}</span>
              ))}
              <span className="text-[10px] ml-auto" style={{ color: '#aeaeb2' }}>
                {new Date(item.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // Right column: article detail
  const articleDetail = selectedItem ? (
    <div className="p-6">
      {isMobile && (
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-sm text-blue-600 mb-4 font-medium">
          <Icon name="arrow-left" size={16} /> Tilbage til listen
        </button>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1d1d1f' }}>{selectedItem.subject}</h2>
          <div className="flex items-center gap-2 mb-1">
            {selectedItem.sources.map(s => (
              <span key={s} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sourceConfig[s].bg} ${sourceConfig[s].text}`}>{sourceConfig[s].label}</span>
            ))}
            <span className="text-xs ml-2" style={{ color: '#86868b' }}>
              {new Date(selectedItem.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {selectedItem.tags.map(tag => (
          <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.04)', color: '#636366' }}>#{tag}</span>
        ))}
      </div>

      <div className="prose prose-sm max-w-none mb-6">
        {selectedItem.content.split('\n\n').map((para, i) => (
          <p key={i} className="text-sm leading-relaxed mb-3" style={{ color: '#1d1d1f' }} dangerouslySetInnerHTML={{
            __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          }} />
        ))}
      </div>

      <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(0,122,255,0.06)' }}>
        <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#007AFF' }}>
          <Icon name="lightbulb" size={16} /> Relevans for FLOW
        </h4>
        <p className="text-sm leading-relaxed" style={{ color: '#007AFF' }}>{selectedItem.flowRelevance}</p>
      </div>

      {/* Deploy button */}
      <div className="mb-6">
        {deployedArticles.has(selectedItem.id) ? (
          <button disabled className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
            style={{ background: 'rgba(52,199,89,0.1)', color: '#34C759', cursor: 'default' }}>
            <Icon name="checkmark-circle" size={18} /> Deployed
          </button>
        ) : (
          <button onClick={() => deployArticle(selectedItem)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#007AFF' }}>
            <Icon name="rocket" size={18} /> Deploy til opgave
          </button>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#86868b' }}>Kilder</h4>
        <div className="space-y-2">
          {selectedItem.citations.map((cite, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: 'rgba(245,245,247,0.5)' }}>
              <span className="text-xs" style={{ color: '#86868b' }}>{cite.source}</span>
              <a href={cite.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">{cite.title}</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <div className="text-center" style={{ color: '#aeaeb2' }}>
        <Icon name="doc-text" size={48} className="mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Vælg en artikel fra listen</p>
      </div>
    </div>
  )

  return (
    <div className="relative h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="page-title">Intelligens</h1>
          <p className="caption">Research og indsigter til FLOW</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="badge text-blue-700" style={{ background: 'rgba(0,122,255,0.1)' }}>{unreadCount} ulæst{unreadCount > 1 ? 'e' : ''}</span>
          )}
          <button onClick={() => setShowConfig(!showConfig)} className="btn-secondary text-xs flex items-center gap-1.5">
            <Icon name="gear" size={14} /> Konfigurer
          </button>
        </div>
      </div>

      {configPanel}

      {/* Two-column layout */}
      {isMobile ? (
        // Mobile: single column with back nav
        <div className="mt-4">
          {selectedId ? articleDetail : articleList}
        </div>
      ) : (
        <div className="mt-4 flex gap-0 rounded-2xl overflow-hidden" style={{
          height: 'calc(100vh - 180px)',
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.04)',
        }}>
          {/* Left: article list */}
          <div className="w-[340px] flex-shrink-0 overflow-y-auto" style={{
            borderRight: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div className="p-3">
              {articleList}
            </div>
          </div>
          {/* Right: article detail */}
          <div className="flex-1 overflow-y-auto">
            {articleDetail}
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className="animate-slide-in rounded-2xl px-5 py-3 text-sm font-medium shadow-lg"
            style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.5)',
              color: '#1d1d1f',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}>
            <div className="flex items-center gap-2">
              <Icon name="checkmark-circle" size={18} className="text-green-500" />
              <span>Opgave oprettet: {toast.message.replace('Opgave oprettet: ', '')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
