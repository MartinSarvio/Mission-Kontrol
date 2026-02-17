import React from 'react'
import { vi } from 'vitest'

// ── Mock useLiveData ───────────────────────────────────────────────────────────
export const mockLiveData = {
  isConnected: true,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastUpdated: new Date('2026-02-17T22:00:00Z'),
  consecutiveErrors: 0,
  sessions: [
    { id: 'session-1', kind: 'main', label: 'main', model: 'opus', status: 'active' },
    { id: 'session-2', kind: 'subagent', label: 'elon', model: 'sonnet', status: 'active' },
  ],
  statusText: 'Online',
  cronJobs: [
    { id: 'cron-1', name: 'Heartbeat', enabled: true, schedule: '*/5 * * * *' },
    { id: 'cron-2', name: 'Backup', enabled: true, schedule: '0 3 * * *' },
    { id: 'cron-3', name: 'Disabled', enabled: false, schedule: '0 0 * * *' },
  ],
  gatewayConfig: null,
  skills: [],
  refresh: vi.fn().mockResolvedValue(undefined),
}

vi.mock('../api/LiveDataContext', () => ({
  useLiveData: () => mockLiveData,
  LiveDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ── Mock Icon ──────────────────────────────────────────────────────────────────
vi.mock('../components/Icon', () => ({
  default: ({ name, size }: { name: string; size?: number; className?: string; style?: React.CSSProperties }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}))

// ── Mock ConnectionStatus ──────────────────────────────────────────────────────
vi.mock('../components/ConnectionStatus', () => ({
  default: () => <span data-testid="connection-status" />,
}))

// ── Mock NUMBER_SHORTCUTS ──────────────────────────────────────────────────────
vi.mock('../hooks/useKeyboardShortcuts', () => ({
  NUMBER_SHORTCUTS: {
    '1': 'dashboard',
    '2': 'tasks',
    '3': 'agents',
  },
}))
