import { useState } from 'react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { agents } from '../data/mock'
import { Agent } from '../types'

export default function Agents() {
  const [selected, setSelected] = useState<Agent | null>(null)

  const mainAgent = agents.find(a => a.name === 'Hovedagent')
  const subAgents = agents.filter(a => a.name !== 'Hovedagent')

  return (
    <div>
      <h1 className="page-title mb-1">Agenter</h1>
      <p className="caption mb-6">{agents.length} agenter konfigureret</p>

      {/* Main Agent */}
      {mainAgent && (
        <div className="mb-6">
          <h2 className="section-title mb-3">Hovedagent</h2>
          <Card className="cursor-pointer ring-1 ring-apple-blue/20">
            <div onClick={() => setSelected(mainAgent)} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                  H
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{mainAgent.name}</span>
                    <StatusBadge status={mainAgent.status} />
                  </div>
                  <p className="caption">{mainAgent.purpose}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="font-medium">{mainAgent.model}</p>
                  <p className="caption">model</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">200k</p>
                  <p className="caption">kontekst</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Telegram</p>
                  <p className="caption">kanal</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Sub-agents */}
      <h2 className="section-title mb-3">Sub-agenter</h2>
      <div className="grid grid-cols-1 gap-4">
        {subAgents.map(a => (
          <Card key={a.id} className="cursor-pointer">
            <div onClick={() => setSelected(a)} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-apple-gray-100 flex items-center justify-center text-lg">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{a.name}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="caption">{a.purpose}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="font-medium">{a.lastRun}</p>
                  <p className="caption">status</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{a.model}</p>
                  <p className="caption">model</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} />
              <span className="text-apple-gray-500">{selected.model}</span>
            </div>
            <div>
              <p className="caption mb-1">Systeminstruktioner</p>
              <p className="bg-apple-gray-50 p-3 rounded-lg">{selected.instructions}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="caption mb-1">Værktøjer</p>
                <div className="flex flex-wrap gap-1">{selected.tools.map(t => <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{t}</span>)}</div>
              </div>
              <div>
                <p className="caption mb-1">Færdigheder</p>
                <div className="flex flex-wrap gap-1">
                  {selected.skills.length > 0
                    ? selected.skills.map(s => <span key={s} className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs">{s}</span>)
                    : <span className="text-apple-gray-400">Ingen</span>
                  }
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="caption">Hukommelsespolitik</p><p className="font-medium">{selected.memoryPolicy}</p></div>
              <div><p className="caption">Begrænsning</p><p className="font-medium">{selected.rateLimit}</p></div>
              <div><p className="caption">Timeout</p><p className="font-medium">{selected.timeout}</p></div>
              <div><p className="caption">Genforsøg</p><p className="font-medium">{selected.retries}</p></div>
              <div><p className="caption">Kørsler i Dag</p><p className="font-medium">{selected.runsToday}</p></div>
              <div><p className="caption">Seneste Kørsel</p><p className="font-medium">{selected.lastRun}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
