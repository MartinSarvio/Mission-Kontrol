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
  category?: string
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

const categoryColors: Record<string, { bg: string; text: string }> = {
  'BUSINESS INTELLIGENCE': { bg: 'rgba(88,86,214,0.2)', text: '#8B8AFF' },
  'KONKURRENTANALYSE': { bg: 'rgba(255,69,58,0.15)', text: '#FF6B6B' },
  'MARKETING': { bg: 'rgba(48,209,88,0.15)', text: '#32D74B' },
  'KUNDEADFÆRD': { bg: 'rgba(255,159,10,0.15)', text: '#FFB340' },
  'TEKNOLOGI': { bg: 'rgba(0,122,255,0.15)', text: '#64B5FF' },
  'STRATEGI': { bg: 'rgba(191,90,242,0.15)', text: '#BF5AF2' },
  'SOCIAL MEDIA': { bg: 'rgba(255,55,95,0.15)', text: '#FF375F' },
  'TECH STACK': { bg: 'rgba(100,210,255,0.15)', text: '#64D2FF' },
}

const mockResearch: ResearchItem[] = [
  {
    id: 'r1', subject: 'Top 5 Restaurant Automation Trends 2026', sources: ['linkedin', 'x'], date: '2026-02-12',
    preview: 'AI-drevet ordretagning, køkkenautomatisering og predictive inventory management dominerer restaurantbranchen i 2026.',
    read: false, starred: true, tags: ['automation', 'AI', 'trends'], category: 'BUSINESS INTELLIGENCE',
    content: 'Restaurantbranchen gennemgår en massiv digital transformation i 2026. De fem vigtigste trends er:\n\n1. **AI-drevet ordretagning**: Flere og flere restauranter implementerer AI-chatbots og stemmeassistenter til at håndtere ordrer. Teknologien reducerer ventetider med op til 40% og øger ordrenøjagtigheden til 99.2%.\n\n2. **Køkkenautomatisering**: Robotarme til simple tilberedningsopgaver er nu tilgængelige for under $10.000. De håndterer repetitive opgaver som friture, grill-overvågning og portionering.\n\n3. **Predictive Inventory Management**: ML-modeller forudsiger madspild med 92% nøjagtighed. Restauranter rapporterer 25-35% reduktion i madspild efter implementering.\n\n4. **Personaliserede digitale menukort**: Dynamiske menuer der tilpasser sig baseret på tidspunkt, vejr, kundehistorik og lagerbeholdning. Konverteringsraten stiger med 18%.\n\n5. **Integreret CRM og loyalitetsprogrammer**: Platforme der kombinerer POS, CRM og marketing automation i én løsning dominerer markedet.',
    flowRelevance: 'FLOW kan positionere sig som den danske one-stop-shop. Ved at kombinere dynamiske menukort med integreret CRM har FLOW en unik mulighed.',
    citations: [{ title: 'Restaurant Tech Trends 2026', url: '#', source: 'LinkedIn' }, { title: 'AI Ordering Adoption Rates', url: '#', source: '𝕏' }],
  },
  {
    id: 'r2', subject: 'Hvordan owner.com dominerer restaurant-markedet', sources: ['linkedin'], date: '2026-02-11',
    preview: 'Owner.com har nu over 10.000 restaurant-kunder og en ARR på $50M.',
    read: false, starred: false, tags: ['konkurrent', 'owner.com', 'strategi'], category: 'KONKURRENTANALYSE',
    content: 'Owner.com har cementeret sin position som en af de hurtigst voksende restaurant-tech platforme.\n\n**Produktstrategi**: Owner.com tilbyder website, online ordering, marketing automation og loyalty program i én pakke. Deres "alt-i-én" tilgang eliminerer behovet for multiple leverandører.\n\n**Design og UX**: Konverteringsraten er 3x højere end branchegennemsnittet takket være deres fokus på mobiloptimeret design og friktionsfri checkout.\n\n**Begrænsninger**: Primært fokuseret på det amerikanske marked. Ingen MobilePay-integration, begrænset flersprogssupport.',
    flowRelevance: 'Owner.com er den tætteste internationale konkurrent til FLOW. FLOWs fordel er lokal tilpasning: MobilePay, dansk sprog.',
    citations: [{ title: 'Owner.com Series B Announcement', url: '#', source: 'LinkedIn' }],
  },
  {
    id: 'r3', subject: 'SMS Marketing ROI for Restauranter', sources: ['x', 'facebook'], date: '2026-02-10',
    preview: 'SMS-kampagner viser en gennemsnitlig ROI på 25x.',
    read: true, starred: true, tags: ['marketing', 'SMS', 'ROI'], category: 'MARKETING',
    content: 'Nye data fra 2026 viser at SMS-marketing forbliver den mest effektive kanal for restauranter.\n\n**Nøgletal**: Åbningsrate: 98%, Konverteringsrate: 15%, ROI: 25x. Sammenlignet med email (20% åbningsrate) og push notifications (7% åbningsrate) er SMS stadig suverænt.\n\n**Best practices**: Personaliserede beskeder med kundens navn og ordrehistorik øger konverteringen med 45%. Timing er kritisk — de bedste resultater ses tirsdag-torsdag kl. 11-12.',
    flowRelevance: 'SMS-marketing bør være en kernefunktion i FLOW. Med 25x ROI er det den mest overbevisende feature for restauratører.',
    citations: [{ title: 'Restaurant SMS Marketing Benchmarks', url: '#', source: '𝕏' }],
  },
  {
    id: 'r4', subject: 'Kundeloyalitet: Hvad virker i 2026?', sources: ['linkedin', 'facebook'], date: '2026-02-09',
    preview: 'Stempel-kort er døde. De nye loyalitetsprogrammer bruger gamification.',
    read: true, starred: false, tags: ['loyalitet', 'retention', 'gamification'], category: 'KUNDEADFÆRD',
    content: 'Kundeloyalitet har ændret sig fundamentalt.\n\n**Gamification slår point-systemer**: Restauranter med gamificerede loyalitetsprogrammer ser 2.3x højere engagement end traditionelle stempel-kort.\n\n**Subscription-modeller**: Subscription-baserede loyalty programmer er vokset 80% i 2025-2026. Kunder betaler en månedlig fee for eksklusive fordele.',
    flowRelevance: 'FLOW bør inkludere et moderne loyalitetssystem med gamification-elementer og subscription-muligheder.',
    citations: [{ title: 'Loyalty Program Evolution in F&B', url: '#', source: 'LinkedIn' }],
  },
  {
    id: 'r5', subject: 'AI-drevet Menukort Optimering', sources: ['x'], date: '2026-02-08',
    preview: 'Dynamisk prissætning og AI-optimerede menukort øger omsætningen med 8-15%.',
    read: true, starred: false, tags: ['AI', 'menu', 'pricing'], category: 'TEKNOLOGI',
    content: 'Menu engineering har fået et AI-boost i 2026.\n\n**Dynamisk prissætning**: Restauranter der bruger AI til dynamisk prissætning rapporterer 12% højere omsætning uden at påvirke kundetilfredsheden negativt.\n\n**AI-genererede beskrivelser**: Menubeskrivelser genereret af AI øger salget af individuelle retter med op til 20%. Nøglen er sensoriske ord og emotionelle triggers.',
    flowRelevance: 'AI-menukort optimering kan være en stærk premium-feature for FLOW der differentierer fra konkurrenterne.',
    citations: [{ title: 'Dynamic Pricing for Restaurants', url: '#', source: '𝕏' }],
  },
  {
    id: 'r6', subject: 'Restaurant App vs. Website: Hvad foretrækker kunderne?', sources: ['x', 'linkedin', 'facebook'], date: '2026-02-07',
    preview: 'PWA\'er vinder over native apps for de fleste restauranter.',
    read: true, starred: true, tags: ['PWA', 'mobile', 'UX'], category: 'STRATEGI',
    content: 'Debatten om app vs. website er afgjort.\n\n**PWA vinder**: 73% af restauranter der skiftede fra native app til PWA så øget engagement. Installationsraten er 5x højere for PWA\'er end native apps.',
    flowRelevance: 'FLOW bør bygge alle restaurant-sites som PWA\'er fra start. Det reducerer udviklingsomkostninger og øger reach.',
    citations: [{ title: 'PWA vs Native App for Restaurants', url: '#', source: '𝕏' }],
  },
  {
    id: 'r7', subject: 'Automatiseret Social Media for Mad-brands', sources: ['facebook'], date: '2026-02-06',
    preview: 'AI-genereret content øger social media engagement med 45%.',
    read: true, starred: false, tags: ['social media', 'automation', 'content'], category: 'SOCIAL MEDIA',
    content: 'Social media automatisering for restauranter er modnet.\n\n**AI Content Generation**: Restauranter der bruger AI til at generere social media content sparer gennemsnitligt 8 timer om ugen og ser 45% højere engagement.',
    flowRelevance: 'Social media automatisering kan være en add-on service i FLOW platformens marketing suite.',
    citations: [{ title: 'Restaurant Social Media Automation Guide', url: '#', source: 'Facebook' }],
  },
  {
    id: 'r8', subject: 'Supabase vs. Firebase til Restaurant-tech', sources: ['x', 'linkedin'], date: '2026-02-05',
    preview: 'Supabase vokser 3x hurtigere end Firebase i restaurant-tech segmentet.',
    read: true, starred: false, tags: ['tech stack', 'supabase', 'database'], category: 'TECH STACK',
    content: 'Tech stack valget har en klar vinder i restaurant-tech.\n\n**Supabase fordele**: PostgreSQL-baseret, row-level security, realtime subscriptions, og open source. Perfekt til multi-tenant restaurant platforme.\n\n**Firebase begrænsninger**: NoSQL-strukturen gør komplekse queries vanskelige. Vendor lock-in er en voksende bekymring.',
    flowRelevance: 'Godt nyt — FLOW bruger allerede Supabase! Vi er på den rigtige side af denne trend.',
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
  const [selectedId, setSelectedId] = useState<string>(mockResearch[0].id)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState(defaultConfig)
  const [newTopic, setNewTopic] = useState('')
  const [deployedArticles, setDeployedArticles] = useState<Set<string>>(new Set())
  const [deployedTasks, setDeployedTasks] = useState<DeployedTask[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileList, setShowMobileList] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const selectedItem = items.find(i => i.id === selectedId) || items[0]

  const showToast = useCallback((message: string) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  function toggleRead(id: string) { setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i)) }
  function toggleStar(id: string, e: React.MouseEvent) { e.stopPropagation(); setItems(prev => prev.map(i => i.id === id ? { ...i, starred: !i.starred } : i)) }
  function openItem(item: ResearchItem) { toggleRead(item.id); setSelectedId(item.id); setShowMobileList(false) }
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
  const catColor = selectedItem.category ? categoryColors[selectedItem.category] : null

  // Render content with markdown-like formatting
  function renderContent(content: string) {
    return content.split('\n\n').map((para, i) => {
      // Check if it's a numbered item
      const numberedMatch = para.match(/^(\d+)\.\s\*\*(.*?)\*\*:?\s*(.*)/)
      if (numberedMatch) {
        return (
          <div key={i} className="flex gap-4 mb-5">
            <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'rgba(0,122,255,0.15)', color: '#007AFF' }}>
              {numberedMatch[1]}
            </span>
            <div className="flex-1">
              <h4 className="font-semibold text-[15px] mb-1" style={{ color: '#FFD60A' }}>{numberedMatch[2]}</h4>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{numberedMatch[3]}</p>
            </div>
          </div>
        )
      }
      return (
        <p key={i} className="text-[15px] leading-[1.7] mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}
          dangerouslySetInnerHTML={{
            __html: para
              .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#FFD60A;font-weight:600">$1</strong>')
          }}
        />
      )
    })
  }

  return (
    <div className="relative h-full" style={{
      background: '#0a0a0f',
      margin: '-24px',
      padding: '0',
      minHeight: 'calc(100vh - 60px)',
    }}>
      {/* Dark overlay to ensure full coverage */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: -1,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Left Sidebar */}
        {(!isMobile || showMobileList) && (
          <div style={{
            width: isMobile ? '100%' : '280px',
            flexShrink: 0,
            borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255,255,255,0.02)',
            ...(isMobile ? { position: 'fixed', inset: 0, zIndex: 50, background: '#0a0a0f' } : {}),
          }}>
            {/* Sidebar header */}
            <div style={{
              padding: '20px 16px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div className="flex items-center justify-between mb-2">
                <h1 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>Intelligens</h1>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span style={{
                      background: '#007AFF',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}>{unreadCount}</span>
                  )}
                  <button onClick={() => setShowConfig(!showConfig)}
                    style={{ color: 'rgba(255,255,255,0.4)', padding: '4px' }}
                    className="hover:opacity-80 transition-opacity">
                    <Icon name="gear" size={16} />
                  </button>
                  {isMobile && (
                    <button onClick={() => setShowMobileList(false)}
                      style={{ color: 'rgba(255,255,255,0.4)', padding: '4px' }}>
                      <Icon name="xmark" size={16} />
                    </button>
                  )}
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Research og indsigter til FLOW</p>
            </div>

            {/* Article list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {items.map(item => {
                const isActive = selectedId === item.id
                const cat = item.category ? categoryColors[item.category] : null
                return (
                  <div key={item.id} onClick={() => openItem(item)}
                    style={{
                      padding: '12px',
                      marginBottom: '2px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isActive ? 'rgba(0,122,255,0.12)' : 'transparent',
                      borderLeft: isActive ? '3px solid #007AFF' : '3px solid transparent',
                    }}
                    className="hover:bg-white/5"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {cat && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: cat.bg,
                            color: cat.text,
                            display: 'inline-block',
                            marginBottom: '4px',
                          }}>{item.category}</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          {!item.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#007AFF', flexShrink: 0 }} />}
                          <h3 style={{
                            fontSize: '13px',
                            fontWeight: item.read ? 500 : 700,
                            color: isActive ? '#ffffff' : item.read ? 'rgba(255,255,255,0.5)' : '#ffffff',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>{item.subject}</h3>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                            {new Date(item.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                          </span>
                          <div className="flex items-center gap-1">
                            {item.starred && <Icon name="star-fill" size={11} className="text-yellow-400" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {/* Mobile header bar */}
          {isMobile && !showMobileList && (
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <button onClick={() => setShowMobileList(true)}
                className="flex items-center gap-2"
                style={{ color: '#007AFF', fontSize: '14px', fontWeight: 500 }}>
                <Icon name="list" size={18} /> Artikler
                {unreadCount > 0 && (
                  <span style={{
                    background: '#007AFF', color: '#fff', fontSize: '10px', fontWeight: 700,
                    padding: '1px 6px', borderRadius: '8px', marginLeft: '4px',
                  }}>{unreadCount}</span>
                )}
              </button>
              <button onClick={() => setShowConfig(!showConfig)}
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Icon name="gear" size={16} />
              </button>
            </div>
          )}

          {/* Config panel */}
          {showConfig && (
            <div style={{
              margin: '20px',
              padding: '24px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <h3 style={{ color: '#ffffff', fontSize: '15px', fontWeight: 700, marginBottom: '20px' }}>Research Konfiguration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '8px' }}>Frekvens</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['daily', 'weekly', 'monthly'] as const).map(f => (
                      <button key={f} onClick={() => setConfig(prev => ({ ...prev, frequency: f }))}
                        style={{
                          padding: '10px 16px',
                          fontSize: '13px',
                          borderRadius: '20px',
                          fontWeight: 500,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: config.frequency === f ? '#007AFF' : 'rgba(255,255,255,0.08)',
                          color: config.frequency === f ? '#fff' : 'rgba(255,255,255,0.6)',
                          minHeight: '44px',
                        }}>
                        {f === 'daily' ? 'Dagligt' : f === 'weekly' ? 'Ugentligt' : 'Månedligt'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '8px' }}>Tidspunkt</label>
                  <input type="time" value={config.time} onChange={e => setConfig(prev => ({ ...prev, time: e.target.value }))}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '8px' }}>Platforme</label>
                  <div className="flex gap-3">
                    {(['x', 'linkedin', 'facebook'] as const).map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '12px' }}>
                        <input type="checkbox" checked={config.platforms[p]}
                          onChange={e => setConfig(prev => ({ ...prev, platforms: { ...prev.platforms, [p]: e.target.checked } }))}
                          style={{ accentColor: '#007AFF' }}
                        />
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sourceConfig[p].bg} ${sourceConfig[p].text}`}>{sourceConfig[p].label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '8px' }}>Agent</label>
                  <select value={config.agent} onChange={e => setConfig(prev => ({ ...prev, agent: e.target.value }))}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#fff',
                      fontSize: '13px',
                      width: '100%',
                    }}>
                    <option value="research-agent">research-agent</option>
                    <option value="analytics-agent">analytics-agent</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '8px' }}>Emner</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {config.topics.map(topic => (
                      <span key={topic} className="inline-flex items-center gap-1" style={{
                        fontSize: '11px', fontWeight: 500, padding: '4px 10px', borderRadius: '20px',
                        background: 'rgba(0,122,255,0.12)', color: '#007AFF',
                      }}>
                        {topic}
                        <button onClick={() => removeTopic(topic)} className="hover:text-red-400 ml-1" style={{ color: 'rgba(0,122,255,0.5)' }}><Icon name="xmark" size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Tilføj emne..." value={newTopic}
                      onChange={e => setNewTopic(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTopic()}
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '6px 12px', color: '#fff', fontSize: '13px',
                      }}
                    />
                    <button onClick={addTopic} style={{
                      background: '#007AFF', color: '#fff', border: 'none', borderRadius: '8px',
                      padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', minHeight: '44px',
                    }}>Tilføj</button>
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3">
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500 }}>Status</span>
                    <button onClick={() => setConfig(prev => ({ ...prev, active: !prev.active }))}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      style={{ background: config.active ? '#32D74B' : 'rgba(255,255,255,0.15)' }}>
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        style={{ transform: config.active ? 'translateX(22px)' : 'translateX(4px)' }} />
                    </button>
                    <span style={{ fontSize: '13px', color: config.active ? '#32D74B' : 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                      {config.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  <button onClick={() => setShowConfig(false)} style={{
                    background: '#007AFF', color: '#fff', border: 'none', borderRadius: '8px',
                    padding: '10px 24px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', minHeight: '44px',
                  }}>Gem konfiguration</button>
                </div>
              </div>
            </div>
          )}

          {/* Article Content */}
          {selectedItem && (
            <div style={{ padding: isMobile ? '24px 20px' : '40px 56px', maxWidth: '800px' }}>
              {/* Category badge */}
              {catColor && selectedItem.category && (
                <span style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  background: catColor.bg,
                  color: catColor.text,
                  marginBottom: '16px',
                }}>{selectedItem.category}</span>
              )}

              {/* Title */}
              <h1 style={{
                color: '#ffffff',
                fontSize: isMobile ? '28px' : '34px',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '12px',
              }}>{selectedItem.subject}</h1>

              {/* Subtitle / preview */}
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '16px',
                lineHeight: 1.5,
                marginBottom: '20px',
              }}>{selectedItem.preview}</p>

              {/* Source & date bar */}
              <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: '32px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <Icon name="magnifying-glass" size={12} />
                  KILDE: {selectedItem.sources.map(s => sourceConfig[s].label).join(', ')}
                </span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(selectedItem.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                {selectedItem.starred && (
                  <button onClick={(e) => toggleStar(selectedItem.id, e)} style={{ color: '#FFD60A' }}>
                    <Icon name="star-fill" size={16} />
                  </button>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '32px' }} />

              {/* Article content */}
              <div style={{ marginBottom: '32px' }}>
                {renderContent(selectedItem.content)}
              </div>

              {/* Flow Relevance box */}
              <div style={{
                borderRadius: '14px',
                padding: '20px 24px',
                marginBottom: '28px',
                background: 'rgba(0,122,255,0.08)',
                border: '1px solid rgba(0,122,255,0.15)',
              }}>
                <h4 className="flex items-center gap-2" style={{
                  fontSize: '13px', fontWeight: 700, color: '#007AFF', marginBottom: '8px',
                }}>
                  <Icon name="lightbulb" size={16} /> Relevans for FLOW
                </h4>
                <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(0,122,255,0.85)' }}>
                  {selectedItem.flowRelevance}
                </p>
              </div>

              {/* Deploy button */}
              <div style={{ marginBottom: '28px' }}>
                {deployedArticles.has(selectedItem.id) ? (
                  <button disabled style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                    background: 'rgba(52,199,89,0.1)', color: '#34C759', border: '1px solid rgba(52,199,89,0.2)',
                    cursor: 'default', minHeight: '44px',
                  }}>
                    <Icon name="checkmark-circle" size={18} /> Deployed
                  </button>
                ) : (
                  <button onClick={() => deployArticle(selectedItem)} style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                    color: '#fff', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #007AFF, #0055CC)',
                    boxShadow: '0 4px 16px rgba(0,122,255,0.3)',
                    transition: 'all 0.15s', minHeight: '44px',
                  }}
                    className="hover:opacity-90 active:scale-95"
                  >
                    <Icon name="rocket" size={18} /> Deploy til opgave
                  </button>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2" style={{ marginBottom: '28px' }}>
                {selectedItem.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: '11px', fontWeight: 500, padding: '4px 10px', borderRadius: '20px',
                    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>#{tag}</span>
                ))}
              </div>

              {/* Citations */}
              <div>
                <h4 style={{
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  color: 'rgba(255,255,255,0.3)', marginBottom: '12px',
                }}>Kilder</h4>
                <div className="space-y-2">
                  {selectedItem.citations.map((cite, i) => (
                    <div key={i} className="flex items-center gap-3" style={{
                      padding: '10px 14px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{cite.source}</span>
                      <a href={cite.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '13px', color: '#007AFF', textDecoration: 'none' }}
                        className="hover:underline truncate">{cite.title}</a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className="animate-slide-in" style={{
            borderRadius: '14px',
            padding: '12px 20px',
            fontSize: '13px',
            fontWeight: 500,
            background: 'rgba(30,30,35,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <div className="flex items-center gap-2">
              <Icon name="checkmark-circle" size={18} className="text-green-400" />
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
