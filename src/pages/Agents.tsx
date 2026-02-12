import { useState } from 'react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { agents } from '../data/mock'
import { Agent } from '../types'

export default function Agents() {
  const [selected, setSelected] = useState<Agent | null>(null)

  return (
    <div>
      <h1 className="page-title mb-1">Agents</h1>
      <p className="caption mb-6">{agents.length} agents configured</p>

      <div className="grid grid-cols-1 gap-4">
        {agents.map(a => (
          <Card key={a.id} className="cursor-pointer" >
            <div onClick={() => setSelected(a)} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-apple-gray-100 flex items-center justify-center text-lg">
                  {a.name.charAt(0)}
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
                  <p className="font-medium">{a.runsToday}</p>
                  <p className="caption">runs today</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{a.lastRun}</p>
                  <p className="caption">last run</p>
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
              <p className="caption mb-1">System Instructions</p>
              <p className="bg-apple-gray-50 p-3 rounded-lg">{selected.instructions}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="caption mb-1">Tools</p>
                <div className="flex flex-wrap gap-1">{selected.tools.map(t => <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{t}</span>)}</div>
              </div>
              <div>
                <p className="caption mb-1">Skills</p>
                <div className="flex flex-wrap gap-1">{selected.skills.map(s => <span key={s} className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs">{s}</span>)}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="caption">Memory Policy</p><p className="font-medium">{selected.memoryPolicy}</p></div>
              <div><p className="caption">Rate Limit</p><p className="font-medium">{selected.rateLimit}</p></div>
              <div><p className="caption">Timeout</p><p className="font-medium">{selected.timeout}</p></div>
              <div><p className="caption">Retries</p><p className="font-medium">{selected.retries}</p></div>
              <div><p className="caption">Runs Today</p><p className="font-medium">{selected.runsToday}</p></div>
              <div><p className="caption">Last Run</p><p className="font-medium">{selected.lastRun}</p></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="btn-primary">Replay Last Run</button>
              <button className="btn-secondary">View Run History</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
