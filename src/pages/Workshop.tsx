import { useState } from 'react'
import Card from '../components/Card'
import { workshopTemplates, availableModels } from '../data/mock'

export default function Workshop() {
  const [prompt, setPrompt] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  return (
    <div>
      <h1 className="page-title mb-1">Værksted</h1>
      <p className="caption mb-6">Prompt-legeplads og workflow-test</p>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card title="Prompt Editor">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Skriv din prompt eller workflow her..."
              className="w-full h-64 input resize-none font-mono text-sm"
            />
            <div className="flex items-center gap-3 mt-4">
              <button className="btn-primary">Kør</button>
              <button className="px-4 py-2 text-sm font-medium rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>Gem som Skabelon</button>
              <select className="input text-sm">
                {availableModels.slice(0, 5).map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </Card>

          <Card title="Output" className="mt-4">
            <div className="rounded-xl p-4 min-h-[120px] text-sm font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
              Kør en prompt for at se output her...
            </div>
            <div className="flex gap-3 mt-3">
              <button className="text-xs text-apple-blue hover:underline">Vis i Journal</button>
              <button className="text-xs text-apple-blue hover:underline">Vis Trace</button>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Skabeloner" subtitle={`${workshopTemplates.length} gemt`}>
            <div className="space-y-2">
              {workshopTemplates.map(t => (
                <div
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t.id); setPrompt(t.prompt) }}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${selectedTemplate === t.id ? '' : ''}`}
                  style={{ background: selectedTemplate === t.id ? 'rgba(0,122,255,0.06)' : 'rgba(255,255,255,0.06)', border: selectedTemplate === t.id ? '1px solid rgba(0,122,255,0.15)' : '1px solid transparent' }}
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="caption mt-1">{t.runs} kørsler · Sidst brugt {t.lastUsed}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Testdata" className="mt-4">
            <textarea
              placeholder='{"emne": "..."}'
              className="w-full h-32 input resize-none font-mono text-xs"
            />
            <p className="caption mt-2">JSON-variabler til indsætning i {"{{pladsholdere}}"}</p>
          </Card>

          <Card title="Installerede Færdigheder" className="mt-4">
            <div className="space-y-2">
              {[
                { name: 'perplexity', desc: 'Websøgning via Sonar Pro' },
                { name: 'youtube-watcher', desc: 'Video-transskriptioner' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 glass-row text-sm">
                  <span className="font-medium font-mono">{s.name}</span>
                  <span className="caption">{s.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
