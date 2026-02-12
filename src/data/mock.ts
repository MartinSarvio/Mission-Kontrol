import { Agent, JournalEntry, Document, Client, CronJob, ApiUsageRecord, EvalDataset, EvalRun, WorkshopTemplate, Incident, WeeklyMetrics } from '../types'

export const agents: Agent[] = [
  { id: 'a1', name: 'OrderFlow Agent', status: 'running', purpose: 'Process and manage customer orders', model: 'claude-opus-4', instructions: 'Handle incoming orders, validate data, route to fulfillment...', tools: ['web_search', 'database', 'email', 'slack'], skills: ['order-processing', 'validation', 'routing'], memoryPolicy: 'Last 50 conversations', rateLimit: '100 req/min', timeout: '30s', retries: 3, lastRun: '2 min ago', runsToday: 847 },
  { id: 'a2', name: 'Support Agent', status: 'idle', purpose: 'Handle customer support tickets', model: 'claude-sonnet-4', instructions: 'Respond to customer inquiries, escalate complex issues...', tools: ['web_search', 'knowledge_base', 'ticket_system'], skills: ['customer-support', 'escalation', 'faq'], memoryPolicy: 'Per-ticket context', rateLimit: '50 req/min', timeout: '45s', retries: 2, lastRun: '15 min ago', runsToday: 234 },
  { id: 'a3', name: 'Analytics Agent', status: 'running', purpose: 'Generate reports and insights', model: 'claude-opus-4', instructions: 'Analyze business data, generate weekly reports, identify trends...', tools: ['database', 'charts', 'email'], skills: ['data-analysis', 'reporting', 'visualization'], memoryPolicy: 'Stateless', rateLimit: '30 req/min', timeout: '120s', retries: 1, lastRun: '5 min ago', runsToday: 56 },
  { id: 'a4', name: 'Content Agent', status: 'paused', purpose: 'Create and manage content', model: 'claude-sonnet-4', instructions: 'Write blog posts, social media content, product descriptions...', tools: ['web_search', 'image_gen', 'cms'], skills: ['copywriting', 'seo', 'social-media'], memoryPolicy: 'Brand guidelines persistent', rateLimit: '20 req/min', timeout: '60s', retries: 2, lastRun: '1 hour ago', runsToday: 23 },
  { id: 'a5', name: 'Monitor Agent', status: 'failed', purpose: 'System health and uptime monitoring', model: 'claude-haiku', instructions: 'Monitor system metrics, alert on anomalies...', tools: ['metrics_api', 'slack', 'pagerduty'], skills: ['monitoring', 'alerting', 'diagnostics'], memoryPolicy: 'Last 24h metrics', rateLimit: '200 req/min', timeout: '10s', retries: 5, lastRun: '30 min ago', runsToday: 1203 },
]

export const journalEntries: JournalEntry[] = [
  { id: 'j1', timestamp: '2026-02-12 04:58', agent: 'OrderFlow Agent', client: 'Acme Corp', task: 'Process bulk order #4821', severity: 'info', prompt: 'Process the following bulk order for 500 units...', output: 'Order #4821 processed successfully. 500 units allocated from warehouse B. Estimated delivery: Feb 15.', tools: ['database', 'email'], documentsRead: ['inventory.csv'], documentsWritten: ['order-4821.pdf'], latencyMs: 2340, cost: 0.045, pinned: false, notes: '', tags: ['order', 'bulk'] },
  { id: 'j2', timestamp: '2026-02-12 04:45', agent: 'Support Agent', client: 'TechStart Inc', task: 'Ticket #892 - Login issue', severity: 'warning', prompt: 'Customer reports unable to log in after password reset...', output: 'Identified SSO configuration mismatch. Applied temporary fix, escalated to engineering.', tools: ['knowledge_base', 'ticket_system'], documentsRead: ['sso-config.md'], documentsWritten: ['ticket-892-update.md'], latencyMs: 5670, cost: 0.032, pinned: true, notes: 'Recurring SSO issue - needs permanent fix', tags: ['support', 'sso', 'escalation'] },
  { id: 'j3', timestamp: '2026-02-12 04:30', agent: 'Analytics Agent', client: 'Global Foods', task: 'Weekly revenue report', severity: 'info', prompt: 'Generate weekly revenue report for Global Foods...', output: 'Revenue report generated. Total: $142,500 (+12% WoW). Top product: Organic Blend.', tools: ['database', 'charts'], documentsRead: ['sales-data-q1.csv'], documentsWritten: ['weekly-report-feb12.pdf'], latencyMs: 8900, cost: 0.089, pinned: false, notes: '', tags: ['report', 'revenue'] },
  { id: 'j4', timestamp: '2026-02-12 04:15', agent: 'Monitor Agent', client: 'Internal', task: 'Health check failed', severity: 'error', prompt: 'Automated health check cycle #4502', output: 'ALERT: Database connection pool exhausted. 95% utilization. Response time degraded 3x.', tools: ['metrics_api', 'slack'], documentsRead: [], documentsWritten: ['alert-4502.log'], latencyMs: 450, cost: 0.002, error: 'Connection pool at 95% - immediate attention required', pinned: true, notes: 'DevOps notified via Slack', tags: ['alert', 'database', 'critical'] },
  { id: 'j5', timestamp: '2026-02-12 03:50', agent: 'Content Agent', client: 'StyleHouse', task: 'Blog post draft', severity: 'info', prompt: 'Write a blog post about spring 2026 fashion trends...', output: 'Draft completed: "Spring 2026: The Return of Minimalism" - 1,200 words, SEO optimized.', tools: ['web_search', 'cms'], documentsRead: ['brand-guidelines.pdf'], documentsWritten: ['blog-spring-2026.md'], latencyMs: 12400, cost: 0.067, pinned: false, notes: '', tags: ['content', 'blog', 'fashion'] },
  { id: 'j6', timestamp: '2026-02-12 03:20', agent: 'OrderFlow Agent', client: 'Acme Corp', task: 'Refund request #1044', severity: 'warning', prompt: 'Process refund for order #4790, reason: damaged goods...', output: 'Refund of $2,340 initiated. Return label generated. Customer notified.', tools: ['database', 'email'], documentsRead: ['refund-policy.md'], documentsWritten: ['refund-1044.pdf'], latencyMs: 3100, cost: 0.038, pinned: false, notes: '', tags: ['refund', 'order'] },
  { id: 'j7', timestamp: '2026-02-12 02:45', agent: 'Monitor Agent', client: 'Internal', task: 'SSL cert expiry warning', severity: 'critical', prompt: 'Automated certificate scan', output: 'CRITICAL: SSL certificate for api.orderflow.com expires in 3 days. Renewal required.', tools: ['metrics_api', 'pagerduty'], documentsRead: [], documentsWritten: ['cert-alert.log'], latencyMs: 320, cost: 0.001, error: 'SSL cert expires Feb 15 - URGENT', pinned: true, notes: 'PagerDuty alert triggered', tags: ['ssl', 'security', 'urgent'] },
]

export const documents: Document[] = [
  { id: 'd1', name: 'Brand Guidelines v3.2', type: 'PDF', size: '4.2 MB', version: 3, tags: ['brand', 'design'], lastModified: '2026-02-10', usedInRuns: 45, doNotUse: false, uploadedBy: 'Martin S.' },
  { id: 'd2', name: 'API Documentation', type: 'Markdown', size: '128 KB', version: 12, tags: ['api', 'technical'], lastModified: '2026-02-11', usedInRuns: 234, doNotUse: false, uploadedBy: 'System' },
  { id: 'd3', name: 'Refund Policy 2026', type: 'PDF', size: '890 KB', version: 2, tags: ['policy', 'legal'], lastModified: '2026-01-15', usedInRuns: 89, doNotUse: false, uploadedBy: 'Legal Team' },
  { id: 'd4', name: 'Sales Data Q1', type: 'CSV', size: '2.1 MB', version: 1, tags: ['data', 'sales'], lastModified: '2026-02-12', usedInRuns: 12, doNotUse: false, uploadedBy: 'Analytics' },
  { id: 'd5', name: 'Old Pricing Sheet', type: 'Excel', size: '340 KB', version: 1, tags: ['pricing', 'deprecated'], lastModified: '2025-06-01', usedInRuns: 0, doNotUse: true, uploadedBy: 'Finance' },
  { id: 'd6', name: 'SSO Configuration Guide', type: 'Markdown', size: '56 KB', version: 5, tags: ['technical', 'sso'], lastModified: '2026-02-08', usedInRuns: 67, doNotUse: false, uploadedBy: 'DevOps' },
  { id: 'd7', name: 'Inventory Database Schema', type: 'SQL', size: '23 KB', version: 8, tags: ['database', 'schema'], lastModified: '2026-02-05', usedInRuns: 156, doNotUse: false, uploadedBy: 'Backend' },
]

export const clients: Client[] = [
  { id: 'c1', name: 'Acme Corp', email: 'ops@acmecorp.com', company: 'Acme Corporation', status: 'active', activeTasks: 12, documents: 8, apiKey: 'sk-****-****-****-7f3a', role: 'admin', lastActive: '2 min ago', totalSpend: 4250.00 },
  { id: 'c2', name: 'TechStart Inc', email: 'hello@techstart.io', company: 'TechStart Inc', status: 'active', activeTasks: 5, documents: 3, apiKey: 'sk-****-****-****-9b2c', role: 'operator', lastActive: '15 min ago', totalSpend: 1890.50 },
  { id: 'c3', name: 'Global Foods', email: 'admin@globalfoods.com', company: 'Global Foods Ltd', status: 'active', activeTasks: 3, documents: 6, apiKey: 'sk-****-****-****-4d1e', role: 'operator', lastActive: '1 hour ago', totalSpend: 3120.75 },
  { id: 'c4', name: 'StyleHouse', email: 'team@stylehouse.dk', company: 'StyleHouse ApS', status: 'idle', activeTasks: 1, documents: 4, apiKey: 'sk-****-****-****-8a5f', role: 'viewer', lastActive: '3 hours ago', totalSpend: 780.25 },
  { id: 'c5', name: 'Nordic Health', email: 'it@nordichealth.se', company: 'Nordic Health AB', status: 'paused', activeTasks: 0, documents: 2, apiKey: 'sk-****-****-****-2c7d', role: 'viewer', lastActive: '2 days ago', totalSpend: 450.00 },
]

export const cronJobs: CronJob[] = [
  { id: 'cr1', name: 'Daily Order Sync', schedule: '0 6 * * *', status: 'active', lastRun: '2026-02-12 06:00', nextRun: '2026-02-13 06:00', duration: '4m 32s', retries: 0, maxRetries: 3, agent: 'OrderFlow Agent' },
  { id: 'cr2', name: 'Weekly Reports', schedule: '0 8 * * MON', status: 'active', lastRun: '2026-02-10 08:00', nextRun: '2026-02-17 08:00', duration: '12m 15s', retries: 0, maxRetries: 2, agent: 'Analytics Agent' },
  { id: 'cr3', name: 'Health Check', schedule: '*/5 * * * *', status: 'failed', lastRun: '2026-02-12 04:55', nextRun: '2026-02-12 05:00', duration: '8s', retries: 3, maxRetries: 5, errorLog: 'Connection timeout after 10s', agent: 'Monitor Agent' },
  { id: 'cr4', name: 'Backup Database', schedule: '0 2 * * *', status: 'active', lastRun: '2026-02-12 02:00', nextRun: '2026-02-13 02:00', duration: '23m 45s', retries: 0, maxRetries: 3, agent: 'Monitor Agent' },
  { id: 'cr5', name: 'Content Queue', schedule: '0 9 * * 1-5', status: 'paused', lastRun: '2026-02-11 09:00', nextRun: 'Paused', duration: '6m 10s', retries: 0, maxRetries: 2, agent: 'Content Agent' },
  { id: 'cr6', name: 'Invoice Generation', schedule: '0 0 1 * *', status: 'active', lastRun: '2026-02-01 00:00', nextRun: '2026-03-01 00:00', duration: '18m 30s', retries: 1, maxRetries: 3, agent: 'OrderFlow Agent' },
]

export const apiUsageData: ApiUsageRecord[] = [
  { date: 'Feb 6', tokens: 145000, requests: 1200, cost: 42.50, errors: 3 },
  { date: 'Feb 7', tokens: 162000, requests: 1350, cost: 48.20, errors: 5 },
  { date: 'Feb 8', tokens: 138000, requests: 1150, cost: 39.80, errors: 2 },
  { date: 'Feb 9', tokens: 175000, requests: 1500, cost: 52.10, errors: 8 },
  { date: 'Feb 10', tokens: 191000, requests: 1680, cost: 58.30, errors: 4 },
  { date: 'Feb 11', tokens: 168000, requests: 1420, cost: 49.90, errors: 6 },
  { date: 'Feb 12', tokens: 89000, requests: 780, cost: 26.40, errors: 2 },
]

export const evalDatasets: EvalDataset[] = [
  { id: 'e1', name: 'Order Processing Suite', testCases: 150, lastRun: '2026-02-11', avgScore: 94.2, passRate: 96.7, status: 'active' },
  { id: 'e2', name: 'Customer Support QA', testCases: 80, lastRun: '2026-02-10', avgScore: 88.5, passRate: 91.3, status: 'active' },
  { id: 'e3', name: 'Content Quality Check', testCases: 45, lastRun: '2026-02-09', avgScore: 91.0, passRate: 93.3, status: 'idle' },
  { id: 'e4', name: 'Analytics Accuracy', testCases: 60, lastRun: '2026-02-11', avgScore: 96.8, passRate: 98.3, status: 'active' },
]

export const evalRuns: EvalRun[] = [
  { id: 'er1', dataset: 'Order Processing Suite', agent: 'OrderFlow Agent', timestamp: '2026-02-11 14:00', score: 94.2, passRate: 96.7, duration: '8m 45s', comparison: { before: 92.1, after: 94.2 } },
  { id: 'er2', dataset: 'Customer Support QA', agent: 'Support Agent', timestamp: '2026-02-10 10:30', score: 88.5, passRate: 91.3, duration: '5m 20s', comparison: { before: 90.2, after: 88.5 } },
  { id: 'er3', dataset: 'Analytics Accuracy', agent: 'Analytics Agent', timestamp: '2026-02-11 16:00', score: 96.8, passRate: 98.3, duration: '12m 10s', comparison: { before: 95.5, after: 96.8 } },
]

export const workshopTemplates: WorkshopTemplate[] = [
  { id: 'w1', name: 'Order Validation', prompt: 'Validate the following order data and check for inconsistencies:\n\n{{order_data}}', lastUsed: '2026-02-11', runs: 34 },
  { id: 'w2', name: 'Support Response', prompt: 'Generate a helpful customer support response for:\n\nIssue: {{issue}}\nContext: {{context}}', lastUsed: '2026-02-10', runs: 67 },
  { id: 'w3', name: 'Weekly Summary', prompt: 'Summarize the following metrics into a concise weekly report:\n\n{{metrics}}', lastUsed: '2026-02-10', runs: 12 },
]

export const incidents: Incident[] = [
  { id: 'i1', title: 'Database connection pool exhausted', severity: 'critical', status: 'active', agent: 'Monitor Agent', client: 'Internal', timestamp: '2026-02-12 04:15', description: 'Connection pool at 95% utilization' },
  { id: 'i2', title: 'SSO login failures spike', severity: 'warning', status: 'active', agent: 'Support Agent', client: 'TechStart Inc', timestamp: '2026-02-12 04:45', description: 'Multiple SSO configuration mismatches detected' },
  { id: 'i3', title: 'SSL certificate expiring', severity: 'critical', status: 'active', agent: 'Monitor Agent', client: 'Internal', timestamp: '2026-02-12 02:45', description: 'api.orderflow.com cert expires Feb 15' },
  { id: 'i4', title: 'Content agent rate limited', severity: 'warning', status: 'completed', agent: 'Content Agent', client: 'StyleHouse', timestamp: '2026-02-11 14:30', description: 'Hit API rate limit during bulk content generation' },
  { id: 'i5', title: 'Refund processing delay', severity: 'info', status: 'completed', agent: 'OrderFlow Agent', client: 'Acme Corp', timestamp: '2026-02-11 10:00', description: 'Refunds delayed by 2 hours due to bank API timeout' },
]

export const weeklyMetrics: WeeklyMetrics = {
  tasksCompleted: 2847, tasksInProgress: 156, tasksBlocked: 12,
  totalCost: 317.20, qualityScore: 94.5,
  incidents: incidents,
  costPerClient: [
    { client: 'Acme Corp', cost: 128.40 },
    { client: 'Global Foods', cost: 89.30 },
    { client: 'TechStart Inc', cost: 56.20 },
    { client: 'StyleHouse', cost: 28.50 },
    { client: 'Nordic Health', cost: 14.80 },
  ],
  suggestions: [
    'Consider upgrading Monitor Agent to reduce false positives by 40%',
    'SSO issues recurring — schedule permanent fix with engineering',
    'Content Agent paused — review queue and resume if backlog builds',
    'Database connection pooling needs optimization before next traffic spike',
    'Schedule SSL certificate auto-renewal to prevent future alerts',
  ]
}

export const dashboardStats = {
  activeTasks: 156,
  agentStatus: { running: 2, idle: 1, paused: 1, failed: 1 },
  cronActive: 4, cronFailed: 1,
  apiToday: { tokens: 89000, requests: 780, cost: 26.40 },
  attentionItems: [
    { id: '1', title: 'SSL certificate expires in 3 days', severity: 'critical' as const, source: 'Monitor Agent' },
    { id: '2', title: 'Database pool at 95% capacity', severity: 'critical' as const, source: 'Monitor Agent' },
    { id: '3', title: 'SSO login failures increasing', severity: 'warning' as const, source: 'Support Agent' },
    { id: '4', title: 'Content Agent paused — queue growing', severity: 'warning' as const, source: 'Content Agent' },
    { id: '5', title: 'Health check cron job failing', severity: 'error' as const, source: 'Monitor Agent' },
  ]
}
