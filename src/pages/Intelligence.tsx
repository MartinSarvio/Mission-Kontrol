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

const CACHE_KEY = 'openclaw-intelligence-articles'

function loadCache(): Article[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveCache(articles: Article[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(articles)) } catch {}
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'I dag'
  if (diffDays === 1) return 'I går'
  if (diffDays < 7) return `${diffDays} dage siden`
  
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
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
  
  const lines = text.split('\n')
  let currentArticle: Partial<Article> = {}
  let articleIndex = 0
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    const numberedMatch = trimmed.match(/^\d+[\.\)]\s*\*?\*?(.+?)\*?\*?\s*$/)
    const headerMatch = trimmed.match(/^#{1,3}\s+(.+)$/)
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*/)
    
    const titleMatch = numberedMatch || headerMatch || boldMatch
    
    if (titleMatch && titleMatch[1].length > 10 && titleMatch[1].length < 200) {
      if (currentArticle.title) {
        articles.push({
          id: `art-${Date.now()}-${articleIndex}`,
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
      const urlMatch = trimmed.match(/https?:\/\/[^\s\)]+/)
      if (urlMatch) {
        currentArticle.url = urlMatch[0]
        currentArticle.source = new URL(urlMatch[0]).hostname.replace('www.', '')
      }
      if (!currentArticle.summary && !trimmed.startsWith('http') && !trimmed.startsWith('[')) {
        currentArticle.summary = trimmed.replace(/^\-\s*/, '').replace(/\*\*/g, '').slice(0, 300)
      }
    }
  }
  
  if (currentArticle.title) {
    articles.push({
      id: `art-${Date.now()}-${articleIndex}`,
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
  
  if (articles.length === 0 && text.length > 50) {
    articles.push({
      id: `art-${Date.now()}-0`,
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
  const { default: invokeSearch } = await import('../api/openclaw').then(m => ({
    default: async (q: string) => {
      const url = localStorage.getItem('openclaw-gateway-url') || 'http://127.0.0.1:63362'
      const token = localStorage.getItem('openclaw-gateway-token') || ''
      
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

/* ── Main Page ───────────────────────────────── */
export default function Intelligence() {
  const { isConnected } = useLiveData()
  const [articles, setArticles] = useState<Article[]>(loadCache)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Select latest article by default
  useEffect(() => {
    if (articles.length > 0 && !selectedArticle) {
      setSelectedArticle(articles[0])
    }
  }, [articles, selectedArticle])

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) return
    
    setIsSearching(true)
    
    try {
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
          unique.push(art)
        }
      }
      
      setArticles(prev => {
        const updated = [...unique.slice(0, 15), ...prev].slice(0, 100)
        saveCache(updated)
        return updated
      })
      
      if (unique.length > 0) {
        setSelectedArticle(unique[0])
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }, [])

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
      {/* Header & Search */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-4">Intelligens</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) { performSearch(searchQuery); setSearchQuery('') } }}
            placeholder="Søg efter artikler, trends, teknologier..."
            className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
          />
          <button
            onClick={() => { if (searchQuery.trim()) { performSearch(searchQuery); setSearchQuery('') } }}
            disabled={isSearching || !searchQuery.trim()}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ 
              background: isSearching ? 'rgba(0,122,255,0.4)' : '#007AFF',
              opacity: !searchQuery.trim() ? 0.5 : 1,
              cursor: !searchQuery.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {isSearching ? 'Søger...' : 'Søg'}
          </button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: Article list */}
        <div className="w-80 flex-shrink-0 overflow-y-auto rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {articles.length} artikler
            </p>
          </div>
          
          {articles.length === 0 && (
            <div className="p-8 text-center">
              <Icon name="magnifying-glass" size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Ingen artikler endnu
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Søg for at finde artikler
              </p>
            </div>
          )}
          
          {articles.map(article => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="p-3 cursor-pointer border-b transition-all"
              style={{
                borderColor: 'rgba(255,255,255,0.04)',
                background: selectedArticle?.id === article.id ? 'rgba(0,122,255,0.1)' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = selectedArticle?.id === article.id ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { e.currentTarget.style.background = selectedArticle?.id === article.id ? 'rgba(0,122,255,0.1)' : 'transparent' }}
            >
              <div className="flex items-start gap-2 mb-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                  background: `${categoryColor(article.category)}20`,
                  color: categoryColor(article.category),
                }}>
                  {article.category}
                </span>
                <span className="text-[10px] ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {formatDate(article.timestamp)}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-white mb-1 leading-snug line-clamp-2">
                {article.title}
              </h4>
              <p className="text-[10px] leading-relaxed line-clamp-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {article.source}
              </p>
            </div>
          ))}
        </div>

        {/* Right: Article content */}
        <div className="flex-1 overflow-y-auto rounded-lg p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {selectedArticle ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                  background: `${categoryColor(selectedArticle.category)}20`,
                  color: categoryColor(selectedArticle.category),
                }}>
                  {selectedArticle.category}
                </span>
                {selectedArticle.isNew && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,122,255,0.15)', color: '#007AFF' }}>
                    NY
                  </span>
                )}
                <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {timeAgo(selectedArticle.timestamp)}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
                {selectedArticle.title}
              </h2>

              <div className="flex items-center gap-4 mb-6 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-1.5">
                  <Icon name="globe" size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {selectedArticle.source}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: relevanceColor(selectedArticle.relevance) }} />
                  <span className="text-xs" style={{ color: relevanceColor(selectedArticle.relevance) }}>
                    {selectedArticle.relevance === 'high' ? 'Høj relevans' : selectedArticle.relevance === 'medium' ? 'Medium relevans' : 'Lav relevans'}
                  </span>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {selectedArticle.summary}
                </p>
              </div>

              {selectedArticle.url && (
                <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <a
                    href={selectedArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,122,255,0.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,122,255,0.1)' }}
                  >
                    <Icon name="arrow-up-right" size={14} />
                    Åbn original artikel
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Icon name="document" size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Vælg en artikel fra listen
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
