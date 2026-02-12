export type Status = 'active' | 'idle' | 'running' | 'failed' | 'paused' | 'warning' | 'success' | 'error' | 'blocked' | 'completed' | 'setup' | 'off' | 'ok'
export type Severity = 'info' | 'warning' | 'error' | 'critical'
export type Role = 'admin' | 'operator' | 'viewer'

export interface Agent {
  id: string; name: string; status: Status; purpose: string; model: string
  instructions: string; tools: string[]; skills: string[]; memoryPolicy: string
  rateLimit: string; timeout: string; retries: number; lastRun: string; runsToday: number
}

export interface JournalEntry {
  id: string; timestamp: string; agent: string; client: string; task: string
  severity: Severity; prompt: string; output: string; tools: string[]
  documentsRead: string[]; documentsWritten: string[]; latencyMs: number
  cost: number; error?: string; pinned: boolean; notes: string; tags: string[]
}

export interface Document {
  id: string; name: string; type: string; size: string; version: number
  tags: string[]; lastModified: string; usedInRuns: number; doNotUse: boolean
  uploadedBy: string
}

export interface Client {
  id: string; name: string; email: string; company: string; status: Status
  activeTasks: number; documents: number; apiKey: string; role: Role
  lastActive: string; totalSpend: number
}

export interface CronJob {
  id: string; name: string; schedule: string; status: Status; lastRun: string
  nextRun: string; duration: string; retries: number; maxRetries: number
  errorLog?: string; agent: string
}

export interface ApiUsageRecord {
  date: string; tokens: number; requests: number; cost: number; errors: number
}

export interface EvalDataset {
  id: string; name: string; testCases: number; lastRun: string; avgScore: number
  passRate: number; status: Status
}

export interface EvalRun {
  id: string; dataset: string; agent: string; timestamp: string; score: number
  passRate: number; duration: string; comparison?: { before: number; after: number }
}

export interface WorkshopTemplate {
  id: string; name: string; prompt: string; lastUsed: string; runs: number
}

export interface Incident {
  id: string; title: string; severity: Severity; status: Status; agent: string
  client: string; timestamp: string; description: string
}

export interface WeeklyMetrics {
  tasksCompleted: number; tasksInProgress: number; tasksBlocked: number
  totalCost: number; qualityScore: number; incidents: Incident[]
  costPerClient: { client: string; cost: number }[]
  suggestions: string[]
}
