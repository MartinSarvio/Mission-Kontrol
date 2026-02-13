import { useState, useEffect } from 'react'
import Icon from './Icon'

const CURRENT_VERSION = '1.1.1'
const GITHUB_REPO = 'MartinSarvio/Mission-Kontrol'
const CHECK_INTERVAL = 30 * 60 * 1000 // 30 min
const DISMISS_KEY = 'openclaw-update-dismissed'

interface Release {
  tag_name: string
  name: string
  html_url: string
  assets: { name: string; browser_download_url: string }[]
  published_at: string
}

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

export default function UpdateBanner() {
  const [release, setRelease] = useState<Release | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [dmgUrl, setDmgUrl] = useState<string>('')

  useEffect(() => {
    // Only show in desktop app
    if (typeof window === 'undefined' || !('__TAURI__' in window)) return

    const dismissedVersion = localStorage.getItem(DISMISS_KEY)

    async function checkUpdate() {
      try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
        if (!res.ok) return
        const data: Release = await res.json()
        
        const latestVersion = data.tag_name.replace(/^v/, '')
        if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
          if (dismissedVersion === latestVersion) return
          
          const dmg = data.assets.find(a => a.name.endsWith('.dmg'))
          if (dmg) setDmgUrl(dmg.browser_download_url)
          setRelease(data)
        }
      } catch {}
    }

    checkUpdate()
    const id = setInterval(checkUpdate, CHECK_INTERVAL)
    return () => clearInterval(id)
  }, [])

  if (!release || dismissed) return null

  const version = release.tag_name.replace(/^v/, '')

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, version)
    setDismissed(true)
  }

  return (
    <div
      className="fixed top-4 right-4 z-[200] max-w-sm rounded-2xl p-4 animate-fadeIn"
      style={{
        background: 'rgba(0,122,255,0.12)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(0,122,255,0.25)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,122,255,0.2)' }}>
          <Icon name="arrow-path" size={20} style={{ color: '#007AFF' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-0.5">
            Ny version tilgængelig
          </p>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
            v{version} · {new Date(release.published_at).toLocaleDateString('da-DK')}
          </p>
          <div className="flex gap-2">
            {dmgUrl ? (
              <a
                href={dmgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                style={{ background: '#007AFF' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0066DD' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#007AFF' }}
              >
                <Icon name="arrow-down" size={12} />
                Download .dmg
              </a>
            ) : (
              <a
                href={release.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                style={{ background: '#007AFF' }}
              >
                Se release
              </a>
            )}
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            >
              Senere
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
