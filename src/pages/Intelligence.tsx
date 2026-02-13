import { useState, useEffect, useCallback } from 'react'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'

/* ── Types ──────────────────────────────────── */
interface Article {
  id: string
  title: string
  summary: string
  source: string
  url?: string
  category: string
  relevance: 'high' | 'medium' | 'low'
  timestamp: string
  isNew: boolean
}

interface ArticleScan {
  id: string
  query: string
  articles: Article[]
  scannedAt: string
  status: 'scanning' | 'done' | 'error'
}

const CACHE_KEY = 'openclaw-intelligence-scans'

function loadCache(): ArticleScan[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveCache(scans: ArticleScan[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(scans)) } catch {}
}

/* ── Helpers ─────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'lige nu'
  if (mins < 60) return `${mins}m siden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}t siden`
  return `${Math.floor(hours / 24)}d siden`
}

function relevanceColor(r: string) {
  return r === 'high' ? '#30D158' : r === 'medium' ? '#FF9F0A' : 'rgba(255,255,255,0.4)'
}

function categoryColor(c: string) {
  const colors: Record<string, string> = {
    'AI': '#007AFF', 'SaaS': '#AF52DE', 'Restaurant': '#FF6B35',
    'Automation': '#30D158', 'Marketing': '#FF9F0A', 'Tech': '#5AC8FA',
  }
  return colors[c] || '#636366'
}

/* ── Parse articles from AI response ─────────── */
function parseArticlesFromResponse(text: string, query: string): Article[] {
  const articles: Article[] = []
  
  // Try to find numbered items or markdown headers
  const lines = text.split('\n')
  let currentArticle: Partial<Article> = {}
  let articleIndex = 0
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Match patterns like "1. **Title**" or "### Title" or "**Title**"
    const numberedMatch = trimmed.match(/^\d+[\.\)]\s*\*?\*?(.+?)\*?\*?\s*$/)
    const headerMatch = trimmed.match(/^#{1,3}\s+(.+)$/)
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*/)
    
    const titleMatch = numberedMatch || headerMatch || boldMatch
    
    if (titleMatch && titleMatch[1].length > 10 && titleMatch[1].length < 200) {
      // Save previous article
      if (currentArticle.title) {
        articles.push({
          id: `art-${articleIndex}`,
          title: currentArticle.title,
          summary: currentArticle.summary || '',
          source: currentArticle.source || 'Web',
          url: currentArticle.url,
          category: guessCategory(currentArticle.title + ' ' + (currentArticle.summary || ''), query),
          relevance: articleIndex < 5 ? 'high' : articleIndex < 10 ? 'medium' : 'low',
          timestamp: new Date().toISOString(),
          isNew: true,
        })
        articleIndex++
      }
      currentArticle = { title: titleMatch[1].replace(/\*\*/g, '').trim() }
    } else if (currentArticle.title && trimmed.length > 20) {
      // URL detection
      const urlMatch = trimmed.match(/https?:\/\/[^\s\)]+/)
      if (urlMatch) {
        currentArticle.url = urlMatch[0]
        currentArticle.source = new URL(urlMatch[0]).hostname.replace('www.', '')
      }
      // Summary text
      if (!currentArticle.summary && !trimmed.startsWith('http') && !trimmed.startsWith('[')) {
        currentArticle.summary = trimmed.replace(/^\-\s*/, '').replace(/\*\*/g, '').slice(0, 300)
      }
    }
  }
  
  // Push last article
  if (currentArticle.title) {
    articles.push({
      id: `art-${articleIndex}`,
      title: currentArticle.title,
      summary: currentArticle.summary || '',
      source: currentArticle.source || 'Web',
      url: currentArticle.url,
      category: guessCategory(currentArticle.title + ' ' + (currentArticle.summary || ''), query),
      relevance: articleIndex < 5 ? 'high' : articleIndex < 10 ? 'medium' : 'low',
      timestamp: new Date().toISOString(),
      isNew: true,
    })
  }
  
  // If parsing failed, create a single article from the whole text
  if (articles.length === 0 && text.length > 50) {
    articles.push({
      id: 'art-0',
      title: query,
      summary: text.slice(0, 500),
      source: 'AI Analyse',
      category: 'AI',
      relevance: 'high',
      timestamp: new Date().toISOString(),
      isNew: true,
    })
  }
  
  return articles
}

function guessCategory(text: string, query: string): string {
  const t = (text + ' ' + query).toLowerCase()
  if (t.includes('restaurant') || t.includes('food') || t.includes('dining')) return 'Restaurant'
  if (t.includes('ai') || t.includes('artificial') || t.includes('llm') || t.includes('gpt') || t.includes('claude')) return 'AI'
  if (t.includes('saas') || t.includes('software') || t.includes('platform')) return 'SaaS'
  if (t.includes('automat') || t.includes('workflow')) return 'Automation'
  if (t.includes('market') || t.includes('growth') || t.includes('seo')) return 'Marketing'
  return 'Tech'
}

/* ── API call to search ──────────────────────── */
async function searchArticles(query: string): Promise<string> {
  // Import dynamically to avoid circular deps
  const { default: invokeSearch } = await import('../api/openclaw').then(m => ({
    default: async (q: string) => {
      const url = localStorage.getItem('openclaw-gateway-url') || 'http://127.0.0.1:63362'
      const token = localStorage.getItem('openclaw-gateway-token') || ''
      
      // Use Tauri fetch if available
      let fetchFn: typeof fetch = fetch
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')
        fetchFn = tauriFetch
      }
      
      const resolvedUrl = (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') && url.includes('ts.net'))
        ? '/api/gateway' : url
      
      const res = await fetchFn(`${resolvedUrl}/tools/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          tool: 'web_search',
          args: { query: q }
        }),
      })
      const data = await res.json() as any
      return data?.result?.content?.[0]?.text || ''
    }
  }))
  return invokeSearch(query)
}

/* ── Components ──────────────────────────────── */
function ArticleCard({ article, onClick }: { article: Article; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-5 cursor-pointer transition-all duration-200"
      style={{ background: 'rgba(255,255,255,0.03)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start gap-4">
        <div className="w-1 h-12 rounded-full flex-shrink-0 mt-1" style={{ background: relevanceColor(article.relevance) }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
              background: `${categoryColor(article.category)}20`,
              color: categoryColor(article.category),
            }}>
              {article.category}
            </span>
            {article.isNew && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,122,255,0.15)', color: '#007AFF' }}>
                NY
              </span>
            )}
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{article.source}</span>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1 leading-snug">{article.title}</h3>
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {article.summary}
          </p>
        </div>
      </div>
    </div>
  )
}

function ArticleDetail({ article, onClose, onDeploy }: { article: Article; onClose: () => void; onDeploy: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] z-50 overflow-y-auto p-6"
        style={{ background: 'rgba(10,10,15,0.98)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
            background: `${categoryColor(article.category)}20`,
            color: categoryColor(article.category),
          }}>
            {article.category}
          </span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Icon name="xmark" size={14} className="text-white/60" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-white mb-3 leading-snug">{article.title}</h2>
        
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{article.source}</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(article.timestamp)}</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: relevanceColor(article.relevance) }} />
            <span className="text-xs" style={{ color: relevanceColor(article.relevance) }}>
              {article.relevance === 'high' ? 'Høj relevans' : article.relevance === 'medium' ? 'Medium relevans' : 'Lav relevans'}
            </span>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{article.summary}</p>
        </div>

        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm mb-6"
            style={{ color: '#007AFF' }}
          >
            <Icon name="link" size={14} />
            Åbn original artikel
          </a>
        )}

        <button
          onClick={onDeploy}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, #30D158, #34C759)' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(48,209,88,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          <Icon name="zap" size={14} className="inline mr-2" />
          Send til Workshop
        </button>
      </div>
    </>
  )
}

/* ── Preset Queries ──────────────────────────── */
const PRESET_QUERIES = [
  { label: 'AI i Restauration', query: 'AI automation restaurant industry 2025 2026 trends use cases', icon: 'sparkle' },
  { label: 'SaaS Trends', query: 'SaaS platform trends 2026 restaurant management software market', icon: 'chart' },
  { label: 'Marketing Automation', query: 'marketing automation restaurant food service AI personalization 2026', icon: 'lightbulb' },
  { label: 'OpenClaw / AI Agents', query: 'AI agent orchestration multi-agent systems 2026 autonomous agents trends', icon: 'robot' },
]

/* ── Main Page ───────────────────────────────── */
export default function Intelligence() {
  const { isConnected } = useLiveData()
  const [scans, setScans] = useState<ArticleScan[]>(loadCache)
  const [selectedScan, setSelectedScan] = useState<string>('')
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [customQuery, setCustomQuery] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  // Select latest scan by default
  useEffect(() => {
    if (scans.length > 0 && !selectedScan) {
      setSelectedScan(scans[0].id)
    }
  }, [scans, selectedScan])

  const runScan = useCallback(async (query: string) => {
    const scanId = `scan-${Date.now()}`
    const newScan: ArticleScan = {
      id: scanId,
      query,
      articles: [],
      scannedAt: new Date().toISOString(),
      status: 'scanning',
    }
    
    setScans(prev => {
      const updated = [newScan, ...prev].slice(0, 20)
      saveCache(updated)
      return updated
    })
    setSelectedScan(scanId)

    try {
      // Run 2-3 searches to get 10-15 articles
      const searches = [
        query,
        query + ' latest news articles',
        query + ' tools platforms solutions',
      ]
      
      const allArticles: Article[] = []
      
      for (const q of searches) {
        try {
          const result = await searchArticles(q)
          const parsed = parseArticlesFromResponse(result, query)
          allArticles.push(...parsed)
        } catch {}
      }
      
      // Deduplicate by title similarity
      const unique: Article[] = []
      for (const art of allArticles) {
        const isDupe = unique.some(u => 
          u.title.toLowerCase().includes(art.title.toLowerCase().slice(0, 30)) ||
          art.title.toLowerCase().includes(u.title.toLowerCase().slice(0, 30))
        )
        if (!isDupe) {
          art.id = `art-${unique.length}`
          unique.push(art)
        }
      }
      
      setScans(prev => {
        const updated = prev.map(s => s.id === scanId ? { ...s, articles: unique.slice(0, 15), status: 'done' as const } : s)
        saveCache(updated)
        return updated
      })
    } catch {
      setScans(prev => {
        const updated = prev.map(s => s.id === scanId ? { ...s, status: 'error' as const } : s)
        saveCache(updated)
        return updated
      })
    }
  }, [])

  const currentScan = scans.find(s => s.id === selectedScan)

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Icon name="exclamation-triangle" size={48} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold text-white mb-2">Ingen forbindelse til Gateway</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Gå til Indstillinger for at konfigurere</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Intelligens</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Web scanning og research · {scans.reduce((sum, s) => sum + s.articles.length, 0)} artikler fundet
          </p>
        </div>
      </div>

      {/* Quick Scan Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PRESET_QUERIES.map(pq => (
          <button
            key={pq.label}
            onClick={() => runScan(pq.query)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,122,255,0.15)'; e.currentTarget.style.color = '#5AC8FA' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          >
            <Icon name={pq.icon} size={14} />
            {pq.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}
        >
          <Icon name="plus" size={14} />
          Tilpasset søgning
        </button>
      </div>

      {/* Custom query input */}
      {showCustom && (
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={customQuery}
            onChange={e => setCustomQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && customQuery.trim()) { runScan(customQuery); setCustomQuery(''); setShowCustom(false) } }}
            placeholder="Hvad vil du researche?"
            className="flex-1 px-4 py-2 rounded-xl text-sm text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
            autoFocus
          />
          <button
            onClick={() => { if (customQuery.trim()) { runScan(customQuery); setCustomQuery(''); setShowCustom(false) } }}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#007AFF' }}
          >
            Scan
          </button>
        </div>
      )}

      {/* Scan History Tabs */}
      {scans.length > 0 && (
        <div className="flex gap-1 overflow-x-auto mb-6 pb-1">
          {scans.slice(0, 8).map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedScan(s.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: selectedScan === s.id ? 'rgba(0,122,255,0.2)' : 'rgba(255,255,255,0.03)',
                color: selectedScan === s.id ? '#5AC8FA' : 'rgba(255,255,255,0.4)',
              }}
            >
              {s.status === 'scanning' && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
              {s.status === 'done' && <span className="w-2 h-2 rounded-full bg-green-400" />}
              {s.status === 'error' && <span className="w-2 h-2 rounded-full bg-red-400" />}
              {s.query.slice(0, 30)}{s.query.length > 30 ? '...' : ''}
              <span className="opacity-50">({s.articles.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Articles Grid */}
      <div className="flex-1 overflow-y-auto">
        {currentScan?.status === 'scanning' && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-white mb-1">Scanner nettet...</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Finder relevante artikler for: {currentScan.query}</p>
          </div>
        )}

        {currentScan?.status === 'done' && currentScan.articles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {currentScan.articles.length} artikler fundet · {timeAgo(currentScan.scannedAt)}
            </p>
            {currentScan.articles.map(article => (
              <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
            ))}
          </div>
        )}

        {currentScan?.status === 'done' && currentScan.articles.length === 0 && (
          <div className="text-center py-16">
            <Icon name="magnifying-glass" size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Ingen artikler fundet for denne søgning</p>
          </div>
        )}

        {currentScan?.status === 'error' && (
          <div className="text-center py-16">
            <Icon name="exclamation-triangle" size={48} className="mx-auto mb-4 text-red-400 opacity-50" />
            <p className="text-sm text-red-400">Fejl under scanning — prøv igen</p>
          </div>
        )}

        {!currentScan && scans.length === 0 && (
          <div className="text-center py-16">
            <Icon name="sparkle" size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Start en scanning ovenfor
            </p>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Vælg et preset eller skriv din egen søgning
            </p>
          </div>
        )}
      </div>

      {/* Article Detail */}
      {selectedArticle && (
        <ArticleDetail
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onDeploy={() => {
            setSelectedArticle(null)
            // TODO: Send to workshop
          }}
        />
      )}
    </div>
  )
}
