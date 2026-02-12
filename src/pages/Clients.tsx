import { useState, useMemo } from 'react'
import Card from '../components/Card'
import SearchBar from '../components/SearchBar'
import Modal from '../components/Modal'
import Icon from '../components/Icon'
import { useLiveData } from '../api/LiveDataContext'

interface ChannelInfo {
  id: string
  name: string
  type: string
  status: 'active' | 'inactive' | 'error'
  config: Record<string, any>
}

export default function Clients() {
  const { isConnected, gatewayConfig, isLoading } = useLiveData()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ChannelInfo | null>(null)

  const channels = useMemo(() => {
    if (!gatewayConfig?.channels) return []
    
    const result: ChannelInfo[] = []
    const channelsObj = gatewayConfig.channels

    Object.keys(channelsObj).forEach(key => {
      const config = channelsObj[key]
      if (!config || typeof config !== 'object') return

      const isActive = config.enabled !== false && config.token
      result.push({
        id: key,
        name: config.name || key,
        type: key,
        status: isActive ? 'active' : 'inactive',
        config,
      })
    })

    return result
  }, [gatewayConfig])

  const filtered = useMemo(() => {
    if (!search) return channels
    const q = search.toLowerCase()
    return channels.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.type.toLowerCase().includes(q)
    )
  }, [channels, search])

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Brugere & Kanaler</h1>
      <p className="caption mb-6">
        {isLoading ? 'Indlæser...' : `${channels.length} ${channels.length === 1 ? 'kanal' : 'kanaler'} konfigureret`}
        {!isConnected && <span className="ml-2 text-orange-400">(offline)</span>}
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Søg kanaler..." />
        </div>
      </div>

      {isLoading ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-white/30 mb-3">
              <Icon name="clock" size={32} />
            </div>
            <p className="caption">Indlæser kanalkonfiguration...</p>
          </div>
        </Card>
      ) : channels.length === 0 ? (
        <Card>
          <div className="text-center py-16 px-4">
            <Icon name="person" size={40} className="text-white/30 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Ingen kanaler konfigureret
            </p>
            <p className="caption max-w-md mx-auto">
              Konfigurer kanaler i Gateway indstillinger for at forbinde til Telegram, Discord eller andre platforme.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(channel => (
            <Card key={channel.id}>
              <div 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                onClick={() => setSelected(channel)}
              >
                <div className="flex items-center gap-4">
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: channel.status === 'active' 
                      ? 'rgba(52,199,89,0.15)' 
                      : 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon 
                      name={channel.status === 'active' ? 'checkmark-circle' : 'xmark'} 
                      size={20} 
                      className={channel.status === 'active' ? 'text-[#34C759]' : 'text-white/30'}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{channel.name}</p>
                    <p className="caption capitalize">{channel.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span 
                    className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{
                      background: channel.status === 'active' 
                        ? 'rgba(52,199,89,0.1)' 
                        : 'rgba(255,255,255,0.06)',
                      color: channel.status === 'active' ? '#34C759' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {channel.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                  </span>
                  <Icon name="chevron-right" size={16} className="text-white/30" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="caption">Type</p>
                <p className="font-medium capitalize">{selected.type}</p>
              </div>
              <div>
                <p className="caption">Status</p>
                <span 
                  className="text-xs font-medium px-2.5 py-1 rounded-full inline-block"
                  style={{
                    background: selected.status === 'active' 
                      ? 'rgba(52,199,89,0.1)' 
                      : 'rgba(255,255,255,0.06)',
                    color: selected.status === 'active' ? '#34C759' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {selected.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
              {selected.config.token && (
                <div className="sm:col-span-2">
                  <p className="caption">Token</p>
                  <p className="font-mono text-xs px-2 py-1 rounded-lg break-all" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {selected.config.token.slice(0, 20)}...
                  </p>
                </div>
              )}
              {selected.config.dmPolicy && (
                <div>
                  <p className="caption">DM Policy</p>
                  <p className="font-medium capitalize">{selected.config.dmPolicy}</p>
                </div>
              )}
              {selected.config.enabled !== undefined && (
                <div>
                  <p className="caption">Enabled</p>
                  <p className="font-medium">{selected.config.enabled ? 'Ja' : 'Nej'}</p>
                </div>
              )}
            </div>

            {Object.keys(selected.config).length > 0 && (
              <div>
                <p className="caption mb-2">Fuld Konfiguration</p>
                <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ 
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.6)',
                }}>
                  {JSON.stringify(selected.config, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
