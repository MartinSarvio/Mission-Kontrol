import { useState } from 'react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'security' | 'rbac' | 'credentials'>('security')

  return (
    <div>
      <h1 className="page-title mb-1">Settings</h1>
      <p className="caption mb-6">Security, access control, and configuration</p>

      <div className="flex gap-1 mb-6">
        {(['security', 'rbac', 'credentials'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-apple-blue text-white' : 'bg-white text-apple-gray-500 hover:bg-apple-gray-100'}`}>
            {tab === 'rbac' ? 'RBAC' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'security' && (
        <div className="space-y-4">
          <Card title="Skills Allowlist">
            <div className="space-y-2">
              {['web_search', 'database', 'email', 'slack', 'knowledge_base', 'ticket_system', 'charts', 'image_gen', 'cms', 'metrics_api', 'pagerduty'].map(skill => (
                <div key={skill} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0">
                  <code className="text-sm">{skill}</code>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-apple-gray-200 peer-focus:ring-2 peer-focus:ring-apple-blue/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-apple-blue"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Audit Log" subtitle="Recent security events">
            <div className="space-y-2">
              {[
                { action: 'Agent created: Monitor Agent', user: 'admin@flow.dk', time: '2 hours ago' },
                { action: 'API key rotated for Acme Corp', user: 'admin@flow.dk', time: '5 hours ago' },
                { action: 'Permission changed: TechStart Inc → operator', user: 'admin@flow.dk', time: '1 day ago' },
                { action: 'Skill disabled: image_gen (temporary)', user: 'martin@flow.dk', time: '2 days ago' },
                { action: 'New client added: Nordic Health', user: 'admin@flow.dk', time: '3 days ago' },
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-apple-gray-50 last:border-0 text-sm">
                  <span>{log.action}</span>
                  <div className="flex items-center gap-4">
                    <span className="caption">{log.user}</span>
                    <span className="caption">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'rbac' && (
        <div className="space-y-4">
          <Card title="Roles & Permissions">
            <div className="space-y-4">
              {[
                { role: 'Admin', permissions: ['Full access', 'Manage users', 'Manage agents', 'View billing', 'Configure security'], users: 1, status: 'active' as const },
                { role: 'Operator', permissions: ['Run agents', 'View journal', 'Manage documents', 'View API usage'], users: 2, status: 'active' as const },
                { role: 'Viewer', permissions: ['View dashboard', 'View journal', 'View documents'], users: 2, status: 'active' as const },
              ].map((r, i) => (
                <div key={i} className="p-4 bg-apple-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{r.role}</h4>
                      <StatusBadge status={r.status} />
                    </div>
                    <span className="caption">{r.users} users</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.permissions.map(p => (
                      <span key={p} className="px-2 py-0.5 bg-white text-apple-gray-500 rounded text-xs">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'credentials' && (
        <Card title="Stored Credentials">
          <div className="space-y-2">
            {[
              { name: 'OpenRouter API Key', type: 'API Key', lastRotated: '2026-02-01', masked: 'sk-or-v1-****...5210' },
              { name: 'Supabase Service Key', type: 'Service Key', lastRotated: '2026-01-15', masked: 'eyJhbG****...Xk2w' },
              { name: 'Slack Bot Token', type: 'OAuth Token', lastRotated: '2026-01-20', masked: 'xoxb-****...9f3a' },
              { name: 'PagerDuty API', type: 'API Key', lastRotated: '2025-12-01', masked: 'pd-****...7c2e' },
              { name: 'GitHub PAT', type: 'Personal Access Token', lastRotated: '2026-02-10', masked: 'ghp_****...0MyU' },
            ].map((cred, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-apple-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{cred.name}</p>
                  <p className="caption">{cred.type}</p>
                </div>
                <div className="flex items-center gap-4">
                  <code className="text-xs bg-apple-gray-50 px-2 py-1 rounded font-mono">{cred.masked}</code>
                  <span className="caption">Rotated {cred.lastRotated}</span>
                  <button className="text-xs text-apple-blue hover:underline">Rotate</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
