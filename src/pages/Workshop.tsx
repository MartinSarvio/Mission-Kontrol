import { useState } from 'react'
import Card from '../components/Card'
import { workshopTemplates } from '../data/mock'

export default function Workshop() {
  const [prompt, setPrompt] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  return (
    <div>
      <h1 className="page-title mb-1">Workshop</h1>
      <p className="caption mb-6">Prompt playground and workflow testing</p>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card title="Prompt Editor">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Enter your prompt or workflow here..."
              className="w-full h-64 input resize-none font-mono text-sm"
            />
            <div className="flex items-center gap-3 mt-4">
              <button className="btn-primary">Run</button>
              <button className="btn-secondary">Save as Template</button>
              <select className="input text-sm">
                <option>OrderFlow Agent</option>
                <option>Support Agent</option>
                <option>Analytics Agent</option>
                <option>Content Agent</option>
              </select>
            </div>
          </Card>

          <Card title="Output" className="mt-4">
            <div className="bg-apple-gray-50 rounded-lg p-4 min-h-[120px] text-sm text-apple-gray-500 font-mono">
              Run a prompt to see output here...
            </div>
            <div className="flex gap-3 mt-3">
              <button className="text-xs text-apple-blue hover:underline">View in Journal →</button>
              <button className="text-xs text-apple-blue hover:underline">View Trace →</button>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Templates" subtitle={`${workshopTemplates.length} saved`}>
            <div className="space-y-2">
              {workshopTemplates.map(t => (
                <div
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t.id); setPrompt(t.prompt) }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedTemplate === t.id ? 'bg-blue-50 border border-apple-blue/20' : 'bg-apple-gray-50 hover:bg-apple-gray-100'}`}
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="caption mt-1">{t.runs} runs · Last used {t.lastUsed}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Test Data" className="mt-4">
            <textarea
              placeholder='{"order_data": "..."}'
              className="w-full h-32 input resize-none font-mono text-xs"
            />
            <p className="caption mt-2">JSON variables to inject into {"{{placeholders}}"}</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
