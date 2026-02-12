import { useState, useEffect } from 'react'
import Card from '../components/Card'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'
import { getGatewayUrl, getGatewayToken, setGatewayUrl, setGatewayToken, testConnection, fetchSystemInfo } from '../api/openclaw'

interface SystemInfo {
  host?: string
  hostType?: string
  os?: string
  kernel?: string
  cpu?: string
  ramTotal?: string
  ramUsed?: string
  ramAvailable?: string
  diskTotal?: string
  diskUsed?: string
  diskPercent?: number
  uptime?: string
  nodeVersion?: string
  openclawVersion?: string
  gatewayMode?: string
}

function ApiConnectionSection() {
  const { isConnected, lastUpdated } = useLiveData()
  const [url, setUrl] = useState(getGatewayUrl)
  const [token, setToken] = useState(getGatewayToken)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)

  const handleSave = () => {
    setGatewayUrl(url)
    setGatewayToken(token)
    setTestResult(null)
    window.dispatchEvent(new Event('openclaw-settings-changed'))
  }

  const handleTest = async () => {
    setGatewayUrl(url)
    setGatewayToken(token)
    setTesting(true)
    setTestResult(null)
    const result = await testConnection()
    setTestResult(result)
    setTesting(false)
    if (result.ok) {
      window.dispatchEvent(new Event('openclaw-settings-changed'))
    }
  }

  return (
    <Card title="API Forbindelse" subtitle="Forbind til OpenClaw Gateway">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isConnected ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)' }}>
          <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}`} />
          <div>
            <p className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Forbundet' : 'Ikke forbundet'}
            </p>
            {lastUpdated && isConnected && (
              <p className="text-xs text-green-400">Sidst opdateret: {lastUpdated.toLocaleTimeString('da-DK')}</p>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Gateway URL</label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="http://127.0.0.1:63362"
            className="w-full px-3 py-2 text-sm rounded-xl transition-all duration-150"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', colorScheme: 'dark', minHeight: '44px' }}
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Auth Token</label>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Gateway auth token"
            className="w-full px-3 py-2 text-sm rounded-xl transition-all duration-150"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', colorScheme: 'dark', minHeight: '44px' }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleSave} className="btn-primary" style={{ minHeight: '44px' }}>Gem</button>
          <button onClick={handleTest} disabled={testing} className="btn-secondary" style={{ minHeight: '44px' }}>
            {testing ? 'Tester...' : 'Test Forbindelse'}
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-xl text-sm ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}
            style={{ background: testResult.ok ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)' }}>
            {testResult.ok ? '✅ Forbindelse OK!' : `❌ Fejl: ${testResult.error}`}
          </div>
        )}
      </div>
    </Card>
  )
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'api' | 'system' | 'modeller' | 'sikkerhed'>('api')
  const { isConnected, gatewayConfig } = useLiveData()
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({})
  const [loadingSystem, setLoadingSystem] = useState(false)

  useEffect(() => {
    if (isConnected && activeTab === 'system') {
      setLoadingSystem(true)
      fetchSystemInfo()
        .then(info => setSystemInfo(info || {}))
        .catch(() => setSystemInfo({}))
        .finally(() => setLoadingSystem(false))
    }
  }, [isConnected, activeTab])

  const liveChannels = gatewayConfig?.channels || {}
  const livePlugins = gatewayConfig?.plugins?.entries || {}
  const displayChannels = isConnected && gatewayConfig ? Object.entries(livePlugins).map(([key, conf]: [string, any]) => {
    const names: Record<string, string> = { telegram: 'Telegram', whatsapp: 'WhatsApp', discord: 'Discord', slack: 'Slack', imessage: 'iMessage', nostr: 'Nostr', signal: 'Signal', googlechat: 'Google Chat' }
    const chConf = liveChannels[key] || {}
    const enabled = conf.enabled !== false
    let status: string = 'setup'
    let detail = 'Ikke konfigureret'
    if (!enabled) { status = 'off'; detail = 'Deaktiveret' }
    else if (key === 'telegram' && chConf.botToken) { status = 'ok'; detail = `dmPolicy: ${chConf.dmPolicy || 'default'}` }
    else if (key === 'whatsapp' && chConf.dmPolicy) { status = 'warning'; detail = `dmPolicy: ${chConf.dmPolicy}` }
    else if (key === 'imessage' && chConf.cliPath) { status = 'warning'; detail = `cliPath: ${chConf.cliPath}` }
    return { name: names[key] || key, status, detail }
  }) : []

  const availableModels = gatewayConfig?.agents?.defaults?.model?.fallbacks || []
  const primaryModel = gatewayConfig?.agents?.defaults?.model?.primary || 'claude-opus-4-6'
  const allModels = [primaryModel, ...availableModels.filter((m: string) => m !== primaryModel)]

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Indstillinger</h1>
      <p className="caption mb-6">API forbindelse, systemkonfiguration, modeller og sikkerhed</p>

      <div className="overflow-x-auto mb-6">
        <div className="flex gap-1 min-w-fit">
          {(['api', 'system', 'modeller', 'sikkerhed'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab ? 'bg-apple-blue text-white' : 'px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white'}`}
              style={{ minHeight: '44px' }}>
              {tab === 'api' ? 'API Forbindelse' : tab === 'system' ? 'System' : tab === 'modeller' ? 'Modeller' : 'Sikkerhed'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'api' && (
        <div className="space-y-4">
          <ApiConnectionSection />

          {isConnected && gatewayConfig && (
            <Card title="Gateway Konfiguration" subtitle="Live data fra API">
              <div className="space-y-2 text-sm">
                {[
                  ['Port', gatewayConfig.gateway?.port],
                  ['Tilstand', gatewayConfig.gateway?.mode],
                  ['Bind', gatewayConfig.gateway?.bind],
                  ['Auth tilstand', gatewayConfig.gateway?.auth?.mode],
                  ['Primær model', gatewayConfig.agents?.defaults?.model?.primary],
                  ['Maks agenter', gatewayConfig.agents?.defaults?.maxConcurrent],
                  ['Maks sub-agenter', gatewayConfig.agents?.defaults?.subagents?.maxConcurrent],
                ].filter(([, v]) => v !== undefined).map(([label, value], i) => (
                  <div key={i} className="flex justify-between py-2 glass-row">
                    <span className="caption">{label}</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-4">
          {!isConnected ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-white/70 mb-2">Ingen forbindelse til Gateway</p>
                <p className="text-sm text-white/50">Gå til API Forbindelse for at konfigurere</p>
              </div>
            </Card>
          ) : loadingSystem ? (
            <Card>
              <div className="text-center py-8 text-white/50">Henter systeminformation...</div>
            </Card>
          ) : (
            <>
              <Card title="Systeminformation">
                {Object.keys(systemInfo).length === 0 ? (
                  <div className="text-center py-8 text-white/50">Ingen systemdata tilgængelig</div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {systemInfo.host && <div className="flex justify-between py-2 glass-row"><span className="caption">Vært</span><span className="font-medium">{systemInfo.host} {systemInfo.hostType && `(${systemInfo.hostType})`}</span></div>}
                    {systemInfo.os && <div className="flex justify-between py-2 glass-row"><span className="caption">OS</span><span className="font-medium">{systemInfo.os} {systemInfo.kernel && `— ${systemInfo.kernel}`}</span></div>}
                    {systemInfo.cpu && <div className="flex justify-between py-2 glass-row"><span className="caption">CPU</span><span className="font-medium">{systemInfo.cpu}</span></div>}
                    {systemInfo.ramTotal && <div className="flex justify-between py-2 glass-row"><span className="caption">RAM</span><span className="font-medium">{systemInfo.ramTotal} total{systemInfo.ramUsed && `, ${systemInfo.ramUsed} brugt`}{systemInfo.ramAvailable && `, ${systemInfo.ramAvailable} tilgængelig`}</span></div>}
                    {systemInfo.diskTotal && <div className="flex justify-between py-2 glass-row"><span className="caption">Disk</span><span className="font-medium">{systemInfo.diskTotal} total{systemInfo.diskUsed && `, ${systemInfo.diskUsed} brugt`}{systemInfo.diskPercent && ` (${systemInfo.diskPercent}%)`}</span></div>}
                    {systemInfo.nodeVersion && <div className="flex justify-between py-2 glass-row"><span className="caption">Node.js</span><span className="font-medium">{systemInfo.nodeVersion}</span></div>}
                    {systemInfo.uptime && <div className="flex justify-between py-2 glass-row"><span className="caption">Oppetid</span><span className="font-medium">{systemInfo.uptime}</span></div>}
                    {systemInfo.openclawVersion && <div className="flex justify-between py-2 glass-row"><span className="caption">OpenClaw Version</span><span className="font-medium">{systemInfo.openclawVersion}</span></div>}
                    {systemInfo.gatewayMode && <div className="flex justify-between py-2 glass-row"><span className="caption">Gateway</span><span className="font-medium">{systemInfo.gatewayMode}</span></div>}
                  </div>
                )}
              </Card>

              <Card title="Kanalkonfiguration">
                {displayChannels.length === 0 ? (
                  <div className="text-center py-8 text-white/50">Ingen kanaler konfigureret</div>
                ) : (
                  <div className="space-y-2">
                    {displayChannels.map((ch: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 glass-row text-sm">
                        <div>
                          <p className="font-medium">{ch.name}</p>
                          <p className="caption">{ch.detail}</p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          ch.status === 'ok' ? 'text-green-400' :
                          ch.status === 'warning' ? 'text-orange-400' :
                          ch.status === 'setup' ? 'text-white/50' : 'text-white/40'
                        }`} style={{ background: ch.status === 'ok' ? 'rgba(52,199,89,0.1)' : ch.status === 'warning' ? 'rgba(255,149,0,0.1)' : 'rgba(255,255,255,0.06)' }}>
                          {ch.status === 'ok' ? 'OK' : ch.status === 'warning' ? 'ADVARSEL' : ch.status === 'setup' ? 'OPSÆTNING' : 'FRA'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Workspace Filer">
                <div className="space-y-1">
                  {['AGENTS.md', 'BOOT.md', 'BOOTSTRAP.md', 'HEARTBEAT.md', 'IDENTITY.md', 'MEMORY.md', 'SOUL.md', 'TOOLS.md', 'USER.md'].map(f => (
                    <div key={f} className="flex items-center gap-2 py-1.5 text-sm">
                      <Icon name="doc" size={14} className="text-white/40" />
                      <span className="font-mono">{f}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === 'modeller' && (
        <div className="space-y-4">
          {!isConnected ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-white/70 mb-2">Ingen forbindelse til Gateway</p>
                <p className="text-sm text-white/50">Gå til API Forbindelse for at konfigurere</p>
              </div>
            </Card>
          ) : (
            <>
              <Card title="Primær Model">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(0,122,255,0.06)' }}>
                  <p className="font-semibold text-apple-blue">{primaryModel}</p>
                  <p className="caption mt-1">Standardmodel for alle agenter</p>
                </div>
              </Card>

              <Card title="Tilgængelige Modeller" subtitle={`${allModels.length} modeller konfigureret`}>
                {allModels.length === 0 ? (
                  <div className="text-center py-8 text-white/50">Ingen modeller konfigureret</div>
                ) : (
                  <div className="space-y-2">
                    {allModels.map((m: string, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 glass-row text-sm">
                        <span className="font-mono font-medium">{m}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full ${
                          m === primaryModel ? 'text-blue-400' : m.includes('haiku') ? 'text-orange-400' : 'text-white/50'
                        }`} style={{ background: m === primaryModel ? 'rgba(0,122,255,0.1)' : m.includes('haiku') ? 'rgba(255,149,0,0.1)' : 'rgba(255,255,255,0.06)' }}>
                          {m === primaryModel ? 'Primær' : m.includes('haiku') ? 'Under anbefalet' : 'Tilgængelig'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Samtidige Begrænsninger">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <p className="caption">Maks Samtidige Agenter</p>
                    <p className="text-2xl font-bold mt-1">{gatewayConfig?.agents?.defaults?.maxConcurrent || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <p className="caption">Maks Samtidige Sub-agenter</p>
                    <p className="text-2xl font-bold mt-1">{gatewayConfig?.agents?.defaults?.subagents?.maxConcurrent || 'N/A'}</p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === 'sikkerhed' && (
        <div className="space-y-4">
          {!isConnected ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-white/70 mb-2">Ingen forbindelse til Gateway</p>
                <p className="text-sm text-white/50">Gå til API Forbindelse for at konfigurere</p>
              </div>
            </Card>
          ) : (
            <>
              <Card title="Sikkerhedsadvarsler">
                <div className="space-y-3">
                  {allModels.some((m: string) => m.includes('haiku')) && (
                    <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(255,149,0,0.06)' }}>
                      <Icon name="exclamation" size={16} className="text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-400">Modeller under anbefalet niveau</p>
                        <p className="text-sm text-orange-400 mt-1">claude-haiku modeller er konfigureret men under de anbefalede niveauer for produktion.</p>
                      </div>
                    </div>
                  )}
                  <div className="text-center py-4 text-white/50 text-sm">Ingen kritiske advarsler</div>
                </div>
              </Card>

              <Card title="Autentificeringsprofiler">
                <div className="space-y-2">
                  {[
                    { name: 'anthropic:default', type: 'api_key', desc: 'Standard API-nøgle autentificering' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-3 glass-row">
                      <div>
                        <p className="text-sm font-medium font-mono">{p.name}</p>
                        <p className="caption">{p.desc}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{p.type}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Websøgning">
                <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p className="font-medium">Perplexity Sonar Pro Search</p>
                  <p className="caption mt-1">Via OpenRouter — aktiveret og konfigureret</p>
                </div>
              </Card>

              <Card title="Projekter">
                <div className="space-y-2">
                  {[
                    { name: 'Mission Kontrol', status: 'Aktiv', desc: 'Operations-dashboard webapp' },
                    { name: 'OrderFlow AI / FLOW', status: 'På pause', desc: 'AI-drevet ordrebehandling' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 glass-row text-sm">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="caption">{p.desc}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.status === 'Aktiv' ? 'text-green-400' : 'text-orange-400'}`}
                        style={{ background: p.status === 'Aktiv' ? 'rgba(52,199,89,0.1)' : 'rgba(255,149,0,0.1)' }}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}
