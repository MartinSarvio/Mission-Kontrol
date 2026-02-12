import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { incidents, channels } from '../data/mock'

export default function Intelligence() {
  const activeIncidents = incidents.filter(i => i.status === 'active')

  return (
    <div>
      <h1 className="page-title mb-1">Intelligens</h1>
      <p className="caption mb-6">Anomalidetektion og indsigter</p>

      <Card title="Hvad Har Ændret Sig" subtitle="Aktuelle anomalier og advarsler" className="mb-6">
        <div className="space-y-3">
          {activeIncidents.map(inc => (
            <div key={inc.id} className="flex items-center justify-between py-3 border-b border-apple-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <StatusBadge status={inc.severity} />
                <div>
                  <p className="text-sm font-medium">{inc.title}</p>
                  <p className="caption">{inc.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm">{inc.agent}</p>
                <p className="caption">{inc.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Kanalstatus Oversigt" className="mb-6">
        <div className="space-y-3">
          {channels.map(ch => (
            <div key={ch.name} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <StatusBadge status={ch.status === 'ok' ? 'active' : ch.status === 'warning' ? 'warning' : ch.status === 'setup' ? 'idle' : 'paused'} />
                <div>
                  <p className="text-sm font-medium">{ch.name}</p>
                  <p className="caption">{ch.detail}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${ch.enabled ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                {ch.enabled ? 'TIL' : 'FRA'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Rodårsagsanalyse" className="mt-4">
        <div className="space-y-2">
          {[
            'Credentials-mappen (mode 755) er tilgængelig for alle brugere. Kør chmod 700 for at begrænse adgang.',
            'WhatsApp Web-session er udløbet. Genopret forbindelse via QR-kode scanning.',
            'Haiku-modeller er under anbefalede niveauer — overvej at bruge sonnet eller opus til produktionskritiske opgaver.',
            'Discord, Slack, Google Chat og Nostr er konfigureret men ikke aktiveret. Tilføj tokens for at aktivere.',
          ].map((hint, i) => (
            <div key={i} className="flex gap-2 py-2 text-sm">
              <span className="text-apple-blue">💡</span>
              <p className="text-apple-gray-600">{hint}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
