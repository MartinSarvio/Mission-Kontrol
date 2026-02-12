import { useState } from 'react'

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

const sourceConfig = {
  x: { label: '𝕏', bg: 'bg-black', text: 'text-white' },
  linkedin: { label: 'LinkedIn', bg: 'bg-[#0A66C2]', text: 'text-white' },
  facebook: { label: 'Facebook', bg: 'bg-[#1877F2]', text: 'text-white' },
}

const mockResearch: ResearchItem[] = [
  {
    id: 'r1',
    subject: 'Top 5 Restaurant Automation Trends 2026',
    sources: ['linkedin', 'x'],
    date: '2026-02-12',
    preview: 'AI-drevet ordretagning, køkkenautomatisering og predictive inventory management dominerer restaurantbranchen i 2026. Se hvad de førende kæder gør anderledes.',
    read: false, starred: true,
    tags: ['automation', 'AI', 'trends'],
    content: 'Restaurantbranchen gennemgår en massiv digital transformation i 2026. De fem vigtigste trends er:\n\n1. **AI-drevet ordretagning**: Flere og flere restauranter implementerer AI-chatbots og stemmeassistenter til at håndtere ordrer. Toast og Square rapporterer en 40% stigning i AI-ordrer sammenlignet med 2025.\n\n2. **Køkkenautomatisering**: Robotarme til simple tilberedningsopgaver er nu tilgængelige for mellemstore restauranter. Miso Robotics har lanceret en ny model til under $15.000.\n\n3. **Predictive Inventory Management**: Machine learning-modeller forudsiger nu madspild med 92% nøjagtighed, hvilket sparer restauranter gennemsnitligt 15% på fødevareomkostninger.\n\n4. **Personaliserede digitale menukort**: Dynamiske menuer der tilpasser sig baseret på vejr, tidspunkt og kundehistorik ser en adoption rate på 35% blandt fine-dining restauranter.\n\n5. **Integreret CRM og loyalitetsprogrammer**: Platforme der kombinerer POS, CRM og marketing automation i én løsning vokser med 60% år-over-år.',
    flowRelevance: 'FLOW kan positionere sig som den danske one-stop-shop for trend 4 og 5. Ved at kombinere dynamiske menukort med integreret CRM har FLOW en unik mulighed for at differentiere sig fra internationale konkurrenter som Toast og Square, der endnu ikke har etableret sig i Norden.',
    citations: [
      { title: 'Restaurant Tech Trends 2026 — NRA Report', url: 'https://restaurant.org/research', source: 'LinkedIn' },
      { title: 'AI Ordering Adoption Rates', url: 'https://toasttab.com/blog/ai-2026', source: 'X' },
    ],
  },
  {
    id: 'r2',
    subject: 'Hvordan owner.com dominerer restaurant-markedet',
    sources: ['linkedin'],
    date: '2026-02-11',
    preview: 'Owner.com har nu over 10.000 restaurant-kunder og en ARR på $50M. Deres strategi med "alt-i-én" platformen og aggressiv SEO giver resultater.',
    read: false, starred: false,
    tags: ['konkurrent', 'owner.com', 'strategi'],
    content: 'Owner.com har cementeret sin position som en af de hurtigst voksende restaurant-tech platforme i USA. Deres succes bygger på flere nøgleelementer:\n\n**Produktstrategi**: Owner.com tilbyder website, online ordering, marketing automation og loyalty program i én pakke. Deres "zero commission" model appellerer til restauranter der er trætte af DoorDash og Uber Eats\' høje gebyrer.\n\n**Vækstmotor**: Virksomheden bruger en kombination af SEO-optimerede restaurant-websites og Google Ads management til at drive trafik direkte til restauranternes egne bestillingssider. Dette sparer restauranter 15-30% i kommission.\n\n**Design og UX**: Deres templates er visuelt imponerende med fokus på food photography, hurtig loading og mobil-først design. Konverteringsraten på deres bestillingssider er 3x højere end branchegennemsnittet.\n\n**Begrænsninger**: Owner.com er primært fokuseret på det amerikanske marked og har ingen tilstedeværelse i Europa. Deres platform understøtter ikke dansk MobilePay eller lokale betalingsmetoder.',
    flowRelevance: 'Owner.com er den tætteste internationale konkurrent til FLOW. Deres "zero commission" model og alt-i-én tilgang er præcis hvad FLOW bygger. FLOWs fordel er lokal tilpasning: MobilePay integration, dansk sprog, kendskab til det danske restaurantmarked og personlig support. Kopiér deres bedste UX-patterns men differentiér på lokalt kendskab.',
    citations: [
      { title: 'Owner.com Series B Announcement', url: 'https://linkedin.com/posts/owner-com', source: 'LinkedIn' },
    ],
  },
  {
    id: 'r3',
    subject: 'SMS Marketing ROI for Restauranter',
    sources: ['x', 'facebook'],
    date: '2026-02-10',
    preview: 'SMS-kampagner for restauranter viser en gennemsnitlig ROI på 25x — langt højere end email (8x) og social media (4x). Timing og personalisering er nøglen.',
    read: true, starred: true,
    tags: ['marketing', 'SMS', 'ROI'],
    content: 'Nye data fra 2026 viser at SMS-marketing forbliver den mest effektive kanal for restauranter:\n\n**Nøgletal**:\n- Åbningsrate: 98% (vs. 20% for email)\n- Konverteringsrate: 15% for tidsbegrænsede tilbud\n- Gennemsnitlig ROI: 25x investeringen\n- Bedste sendetidspunkt: 11:00-11:30 og 16:00-16:30\n\n**Hvad virker**:\nDe mest succesfulde kampagner kombinerer personalisering med urgency. Eksempel: "Hej [navn], din favorit margherita er klar til afhentning med 20% rabat de næste 2 timer!"\n\n**Compliance**:\nGDPR-krav i Europa betyder at restauranter skal have eksplicit samtykke. De bedste platforme integrerer opt-in direkte i bestillingsflowet.\n\n**Automatisering**:\nTrigger-baserede SMS\'er (f.eks. "du har ikke bestilt i 30 dage") har 3x højere konvertering end broadcast-kampagner.',
    flowRelevance: 'SMS-marketing bør være en kernefunktion i FLOW. Med integration til MobilePay kan FLOW tilbyde en unik "bestil direkte fra SMS" oplevelse. Overvej at bygge automatiserede kampagne-flows som en premium feature.',
    citations: [
      { title: 'Restaurant SMS Marketing Benchmarks 2026', url: 'https://x.com/restaurantdive', source: 'X' },
      { title: 'SMS vs Email for Food Businesses', url: 'https://facebook.com/restaurantmarketing', source: 'Facebook' },
    ],
  },
  {
    id: 'r4',
    subject: 'Kundeloyalitet: Hvad virker i 2026?',
    sources: ['linkedin', 'facebook'],
    date: '2026-02-09',
    preview: 'Stempel-kort er døde. De nye loyalitetsprogrammer bruger gamification, personaliserede belønninger og social proof til at fastholde kunder.',
    read: true, starred: false,
    tags: ['loyalitet', 'retention', 'gamification'],
    content: 'Kundeloyalitet i restaurantbranchen har ændret sig fundamentalt:\n\n**Gamification slår point-systemer**: Restauranter der bruger gamification-elementer (badges, streaks, challenges) ser 2.3x højere engagement end traditionelle point-programmer.\n\n**Personaliserede belønninger**: "Køb 10, få 1 gratis" er passé. De bedste programmer tilbyder belønninger baseret på kundens præferencer og historik. Eksempel: "Du elsker vores Caesar salat — prøv den nye med avocado gratis!"\n\n**Social proof og deling**: Programmer der opfordrer til social deling (Instagram stories, anmeldelser) giver restauranter gratis markedsføring. Restauranter rapporterer 30% flere nye kunder fra referral-programmer.\n\n**Subscription-modeller**: Fast månedlig betaling for fordele (f.eks. gratis kaffe, 10% rabat) er vokset 80% i 2025-2026. Det giver forudsigelig indtægt og højere besøgsfrekvens.',
    flowRelevance: 'FLOW bør inkludere et moderne loyalitetssystem med gamification og personalisering fra dag 1. Subscription-modellen er særligt interessant for danske caféer og lunch-restauranter. Overvej at bygge dette som en differentiator mod owner.com.',
    citations: [
      { title: 'Loyalty Program Evolution in F&B', url: 'https://linkedin.com/pulse/loyalty-2026', source: 'LinkedIn' },
      { title: 'Gamification in Restaurants Case Study', url: 'https://facebook.com/restaurantinnovation', source: 'Facebook' },
    ],
  },
  {
    id: 'r5',
    subject: 'AI-drevet Menukort Optimering',
    sources: ['x'],
    date: '2026-02-08',
    preview: 'Dynamisk prissætning og AI-optimerede menukort øger restaurant-omsætningen med 8-15%. Menu engineering møder machine learning.',
    read: true, starred: false,
    tags: ['AI', 'menu', 'pricing'],
    content: 'Menu engineering har fået et AI-boost i 2026:\n\n**Dynamisk prissætning**: Restauranter der justerer priser baseret på efterspørgsel, tidspunkt og lager ser gennemsnitligt 12% højere omsætning. Algorithmen tager højde for råvarepriser, vejr, og lokale events.\n\n**AI-genererede beskrivelser**: GPT-drevne menubeskrivelser øger salget af specifikke retter med op til 20%. De bedste beskrivelser fokuserer på sensoriske ord og oprindelse.\n\n**Intelligent menu-layout**: Eye-tracking data kombineret med A/B-testing viser at den optimale menu-placering afhænger af restauranttype. Fine dining: øverst til højre. Fast casual: midten af skærmen.\n\n**Allergen og ernærings-AI**: Automatisk generering af allergen-information og ernæringsdata sparer timer af manuelt arbejde og reducerer fejl med 95%.',
    flowRelevance: 'AI-menukort optimering kan være en stærk premium-feature for FLOW. Start med automatiske menubeskrivelser og allergen-detection, og byg senere dynamisk prissætning. Dette differentierer FLOW fra simple website-builders.',
    citations: [
      { title: 'Dynamic Pricing for Restaurants 2026', url: 'https://x.com/menuengineering', source: 'X' },
    ],
  },
  {
    id: 'r6',
    subject: 'Restaurant App vs. Website: Hvad foretrækker kunderne?',
    sources: ['x', 'linkedin', 'facebook'],
    date: '2026-02-07',
    preview: 'PWA\'er (Progressive Web Apps) vinder over native apps for de fleste restauranter. Installationsbarrieren er for høj for single-restaurant apps.',
    read: true, starred: true,
    tags: ['PWA', 'mobile', 'UX'],
    content: 'Debatten om app vs. website er afgjort for de fleste restauranter:\n\n**PWA vinder**: Progressive Web Apps kombinerer det bedste fra begge verdener. De er hurtige, kan installeres på homescreen, virker offline og kræver ingen app store godkendelse. 73% af restauranter der skiftede fra native app til PWA så øget engagement.\n\n**Native apps for kæder**: Kun restauranter med 10+ lokationer og stærk brand-loyalitet bør investere i native apps. For alle andre er PWA\'er den bedste løsning.\n\n**Nøglefunktioner**: De vigtigste features for en restaurant PWA er: hurtig loading (<2s), nem bestilling (max 3 taps), push notifications, og offline menu-adgang.\n\n**Konverteringsdata**: PWA bestillingssider konverterer 2.5x bedre end mobile websites og 1.3x bedre end native apps (pga. lavere friktion).',
    flowRelevance: 'FLOW bør bygge alle restaurant-sites som PWA\'er fra start. Dette giver restaurants "app-lignende" oplevelse uden app store-kompleksiteten. Push notifications via PWA kan erstatte dyre SMS-kampagner for daglige tilbud.',
    citations: [
      { title: 'PWA vs Native App for Restaurants', url: 'https://x.com/webdev', source: 'X' },
      { title: 'Mobile Ordering Conversion Benchmarks', url: 'https://linkedin.com/pulse/mobile-ordering', source: 'LinkedIn' },
      { title: 'Restaurant Digital Experience Study', url: 'https://facebook.com/restauranttech', source: 'Facebook' },
    ],
  },
  {
    id: 'r7',
    subject: 'Automatiseret Social Media for Mad-brands',
    sources: ['facebook'],
    date: '2026-02-06',
    preview: 'AI-genereret content og automatisk posting øger social media engagement for restauranter med 45%. De bedste tools og strategier.',
    read: true, starred: false,
    tags: ['social media', 'automation', 'content'],
    content: 'Social media automatisering for restauranter er modnet betydeligt:\n\n**AI Content Generation**: Tools som Jasper og Copy.ai genererer nu restaurant-specifikt content inklusiv billedforslag, hashtags og optimale posting-tidspunkter. Restauranter sparer gennemsnitligt 8 timer om ugen.\n\n**Automatisk posting**: Integration med POS-systemer muliggør automatisk "dagens ret" posts baseret på hvad der faktisk serveres. Dette sikrer konsistens og aktualitet.\n\n**User-Generated Content**: De mest succesfulde restauranter på sociale medier kuraterer kundebilleder automatisk. AI identificerer de bedste billeder tagget med restaurantens lokation og beder om tilladelse til at reposte.\n\n**ROI-tracking**: Nye attribution-modeller kan nu spore social media engagement direkte til bestillinger. Gennemsnitlig ROI for restaurant social media i 2026 er 4.2x.',
    flowRelevance: 'Social media automatisering kan være en add-on service i FLOW. Overvej integration med POS for automatisk "dagens ret" posts. Dette er en lavthængende frugt der giver umiddelbar værdi for restauratører der mangler tid til social media.',
    citations: [
      { title: 'Restaurant Social Media Automation Guide', url: 'https://facebook.com/business/restaurants', source: 'Facebook' },
    ],
  },
  {
    id: 'r8',
    subject: 'Supabase vs. Firebase til Restaurant-tech',
    sources: ['x', 'linkedin'],
    date: '2026-02-05',
    preview: 'Supabase vokser 3x hurtigere end Firebase i restaurant-tech segmentet. PostgreSQL, row-level security og realtime subscriptions er hovedårsagerne.',
    read: true, starred: false,
    tags: ['tech stack', 'supabase', 'database'],
    content: 'Tech stack valget for restaurant-platforme har en klar vinder i 2026:\n\n**Supabase fordele**:\n- PostgreSQL giver fuld SQL-kraft til komplekse forespørgsler (menuanalyse, rapportering)\n- Row-level security er ideel til multi-tenant restaurant platforme\n- Realtime subscriptions til live ordre-tracking\n- Edge Functions til serverless logik\n- Open source: ingen vendor lock-in\n\n**Firebase begrænsninger**:\n- NoSQL gør komplekse joins vanskelige (f.eks. ordre + menu + kunde data)\n- Pricing skalerer dårligt med mange reads (menukort browses konstant)\n- Vendor lock-in til Google-økosystemet\n\n**Migrationshistorier**: Tre restaurant-tech startups der migrerede fra Firebase til Supabase rapporterer 40% lavere infrastrukturomkostninger og 60% hurtigere fejlfinding.\n\n**Anbefaling**: For nye restaurant-tech projekter er Supabase det klare valg. For eksisterende Firebase-projekter er migrering kun anbefalet hvis man oplever skaleringsudfordringer.',
    flowRelevance: 'Godt nyt — FLOW bruger allerede Supabase! Dette er det rigtige valg ifølge branchen. Fokusér på at udnytte Supabase\'s realtime features til live ordre-tracking og RLS til multi-restaurant isolation.',
    citations: [
      { title: 'Supabase vs Firebase for SaaS 2026', url: 'https://x.com/supabase', source: 'X' },
      { title: 'Database Choice for Restaurant Platforms', url: 'https://linkedin.com/pulse/restaurant-tech-stack', source: 'LinkedIn' },
    ],
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

export default function Intelligence() {
  const [items, setItems] = useState(mockResearch)
  const [selectedItem, setSelectedItem] = useState<ResearchItem | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState(defaultConfig)
  const [newTopic, setNewTopic] = useState('')

  function toggleRead(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i))
  }

  function toggleStar(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setItems(prev => prev.map(i => i.id === id ? { ...i, starred: !i.starred } : i))
  }

  function openItem(item: ResearchItem) {
    toggleRead(item.id)
    setSelectedItem(item)
  }

  function addTopic() {
    if (newTopic.trim() && !config.topics.includes(newTopic.trim())) {
      setConfig(prev => ({ ...prev, topics: [...prev.topics, newTopic.trim()] }))
      setNewTopic('')
    }
  }

  function removeTopic(topic: string) {
    setConfig(prev => ({ ...prev, topics: prev.topics.filter(t => t !== topic) }))
  }

  const unreadCount = items.filter(i => !i.read).length

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="page-title">Intelligens</h1>
          <p className="caption">Research og indsigter til FLOW</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="badge bg-blue-100 text-blue-700">{unreadCount} ulæst{unreadCount > 1 ? 'e' : ''}</span>
          )}
          <button onClick={() => setShowConfig(!showConfig)} className="btn-secondary text-xs flex items-center gap-1.5">
            ⚙ Konfigurer
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="card mb-6 mt-4 border border-blue-100">
          <h3 className="section-title mb-4">Research Konfiguration</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Frekvens</label>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setConfig(prev => ({ ...prev, frequency: f }))}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${config.frequency === f ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {f === 'daily' ? 'Dagligt' : f === 'weekly' ? 'Ugentligt' : 'Månedligt'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Tidspunkt</label>
              <input
                type="time"
                value={config.time}
                onChange={e => setConfig(prev => ({ ...prev, time: e.target.value }))}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Platforme</label>
              <div className="flex gap-3">
                {(['x', 'linkedin', 'facebook'] as const).map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.platforms[p]}
                      onChange={e => setConfig(prev => ({ ...prev, platforms: { ...prev.platforms, [p]: e.target.checked } }))}
                      className="rounded"
                    />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceConfig[p].bg} ${sourceConfig[p].text}`}>
                      {sourceConfig[p].label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Agent</label>
              <select value={config.agent} onChange={e => setConfig(prev => ({ ...prev, agent: e.target.value }))} className="input text-sm w-full">
                <option value="research-agent">research-agent</option>
                <option value="analytics-agent">analytics-agent</option>
                <option value="mission-kontrol-builder">mission-kontrol-builder</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Emner</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {config.topics.map(topic => (
                  <span key={topic} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                    {topic}
                    <button onClick={() => removeTopic(topic)} className="hover:text-red-500 ml-0.5">✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tilføj emne..."
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTopic()}
                  className="input text-sm flex-1"
                />
                <button onClick={addTopic} className="btn-primary text-xs">Tilføj</button>
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, active: !prev.active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-sm ${config.active ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {config.active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
              <button onClick={() => setShowConfig(false)} className="btn-primary text-xs">Gem konfiguration</button>
            </div>
          </div>
        </div>
      )}

      {/* Research Inbox */}
      <div className="mt-5 space-y-1">
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => openItem(item)}
            className={`flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all duration-150 hover:shadow-md ${
              item.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/60'
            } ${selectedItem?.id === item.id ? 'ring-2 ring-blue-200' : ''}`}
          >
            <button
              onClick={e => toggleStar(item.id, e)}
              className={`text-lg flex-shrink-0 transition-colors ${item.starred ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}
            >
              {item.starred ? '★' : '☆'}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className={`text-sm truncate ${item.read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                  {item.subject}
                </h3>
                {!item.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
              </div>
              <p className="text-xs text-gray-500 line-clamp-1">{item.preview}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.sources.map(s => (
                <span key={s} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sourceConfig[s].bg} ${sourceConfig[s].text}`}>
                  {sourceConfig[s].label}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-gray-400 flex-shrink-0 w-16 text-right">
              {new Date(item.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/20 z-50" onClick={() => setSelectedItem(null)} />
          <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedItem.subject}</h2>
                  <div className="flex items-center gap-2 mb-1">
                    {selectedItem.sources.map(s => (
                      <span key={s} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sourceConfig[s].bg} ${sourceConfig[s].text}`}>
                        {sourceConfig[s].label}
                      </span>
                    ))}
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(selectedItem.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {selectedItem.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">#{tag}</span>
                ))}
              </div>

              <div className="prose prose-sm max-w-none mb-6">
                {selectedItem.content.split('\n\n').map((para, i) => (
                  <p key={i} className="text-sm text-gray-700 leading-relaxed mb-3" dangerouslySetInnerHTML={{
                    __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  }} />
                ))}
              </div>

              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                  🎯 Relevans for FLOW
                </h4>
                <p className="text-sm text-blue-700 leading-relaxed">{selectedItem.flowRelevance}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Kilder</h4>
                <div className="space-y-2">
                  {selectedItem.citations.map((cite, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50">
                      <span className="text-xs text-gray-400">{cite.source}</span>
                      <a href={cite.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                        {cite.title}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
