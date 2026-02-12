import { useState } from 'react'
import Card from '../components/Card'
import { systemInfo, availableModels, channels } from '../data/mock'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'system' | 'modeller' | 'sikkerhed'>('system')

  return (
    <div>
      <h1 className="page-title mb-1">Indstillinger</h1>
      <p className="caption mb-6">Systemkonfiguration, modeller og sikkerhed</p>

      <div className="flex gap-1 mb-6">
        {(['system', 'modeller', 'sikkerhed'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-apple-blue text-white' : 'bg-white text-apple-gray-500 hover:bg-apple-gray-100'}`}>
            {tab === 'system' ? 'System' : tab === 'modeller' ? 'Modeller' : 'Sikkerhed'}
          </button>
        ))}
      </div>

      {activeTab === 'system' && (
        <div className="space-y-4">
          <Card title="Systeminformation">
            <div className="space-y-2 text-sm">
              {[
                ['Vært', `${systemInfo.host} (${systemInfo.hostType})`],
                ['OS', `${systemInfo.os} — ${systemInfo.kernel}`],
                ['CPU', systemInfo.cpu],
                ['RAM', `${systemInfo.ramTotal} total, ${systemInfo.ramUsed} brugt, ${systemInfo.ramAvailable} tilgængelig`],
                ['Disk', `${systemInfo.diskTotal} total, ${systemInfo.diskUsed} brugt (${systemInfo.diskPercent}%)`],
                ['Node.js', systemInfo.nodeVersion],
                ['Oppetid', systemInfo.uptime],
                ['OpenClaw Version', systemInfo.openclawVersion],
                ['Gateway', systemInfo.gatewayMode],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between py-2 border-b border-apple-gray-50 last:border-0">
                  <span className="caption">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Kanalkonfiguration">
            <div className="space-y-2">
              {channels.map((ch, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0 text-sm">
                  <div>
                    <p className="font-medium">{ch.name}</p>
                    <p className="caption">{ch.detail}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    ch.status === 'ok' ? 'bg-green-50 text-green-600' :
                    ch.status === 'warning' ? 'bg-orange-50 text-orange-600' :
                    ch.status === 'setup' ? 'bg-gray-100 text-gray-500' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {ch.status === 'ok' ? 'OK' : ch.status === 'warning' ? 'ADVARSEL' : ch.status === 'setup' ? 'OPSÆTNING' : 'FRA'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Workspace Filer">
            <div className="space-y-1">
              {['AGENTS.md', 'BOOT.md', 'BOOTSTRAP.md', 'HEARTBEAT.md', 'IDENTITY.md', 'MEMORY.md', 'SOUL.md', 'TOOLS.md', 'USER.md'].map(f => (
                <div key={f} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="text-apple-gray-400">📄</span>
                  <span className="font-mono">{f}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'modeller' && (
        <div className="space-y-4">
          <Card title="Primær Model">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold text-apple-blue">{systemInfo.primaryModel}</p>
              <p className="caption mt-1">Standardmodel for alle agenter</p>
            </div>
          </Card>

          <Card title="Tilgængelige Modeller" subtitle={`${availableModels.length} modeller konfigureret`}>
            <div className="space-y-2">
              {availableModels.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0 text-sm">
                  <span className="font-mono font-medium">{m}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    m === 'claude-opus-4-6' ? 'bg-blue-50 text-blue-600' :
                    m.includes('haiku') ? 'bg-orange-50 text-orange-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {m === 'claude-opus-4-6' ? 'Primær' : m.includes('haiku') ? '⚠️ Under anbefalet' : 'Tilgængelig'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Samtidige Begrænsninger">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-apple-gray-50 rounded-lg">
                <p className="caption">Maks Samtidige Agenter</p>
                <p className="text-2xl font-bold mt-1">{systemInfo.maxAgents}</p>
              </div>
              <div className="p-4 bg-apple-gray-50 rounded-lg">
                <p className="caption">Maks Samtidige Sub-agenter</p>
                <p className="text-2xl font-bold mt-1">{systemInfo.maxSubagents}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'sikkerhed' && (
        <div className="space-y-4">
          <Card title="Sikkerhedsadvarsler">
            <div className="space-y-3">
              {[
                { title: 'Modeller under anbefalet niveau', desc: 'claude-haiku modeller er konfigureret men under de anbefalede niveauer for produktion.', severity: 'warning' },
                { title: 'Credentials-mappe tilgængelig', desc: 'Credentials-mappen har tilladelser mode 755. Anbefalet: chmod 700 for at begrænse adgang.', severity: 'warning' },
              ].map((w, i) => (
                <div key={i} className="p-4 bg-orange-50 rounded-lg">
                  <p className="font-medium text-orange-700">{w.title}</p>
                  <p className="text-sm text-orange-600 mt-1">{w.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Autentificeringsprofiler">
            <div className="space-y-2">
              {[
                { name: 'anthropic:default', type: 'api_key', desc: 'Standard API-nøgle autentificering' },
                { name: 'anthropic:flow-agent', type: 'token', desc: 'Token-baseret autentificering for flow-agent' },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-apple-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium font-mono">{p.name}</p>
                    <p className="caption">{p.desc}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-apple-gray-100 text-apple-gray-500 rounded text-xs">{p.type}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Websøgning">
            <div className="p-4 bg-apple-gray-50 rounded-lg text-sm">
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
                <div key={i} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0 text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="caption">{p.desc}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${p.status === 'Aktiv' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
