/** Safely convert any value to a displayable string. Prevents React "Objects are not valid as a React child" errors. */
export function safeString(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (typeof val === 'object') {
    // Cron schedule objects
    const obj = val as Record<string, unknown>
    if (obj.expr) return String(obj.expr)
    if (obj.kind) return String(obj.kind)
    try { return JSON.stringify(val) } catch { return fallback }
  }
  return String(val)
}

/** Format a cron schedule object or string for display */
export function formatSchedule(schedule: unknown): string {
  if (!schedule) return 'Ukendt tidsplan'
  if (typeof schedule === 'string') return schedule
  if (typeof schedule === 'object') {
    const s = schedule as Record<string, unknown>
    if (s.expr) return String(s.expr)
    if (s.everyMs) return `Hvert ${Math.round(Number(s.everyMs) / 60000)} min`
    if (s.at) return String(s.at)
    if (s.kind) return String(s.kind)
  }
  return 'Ukendt tidsplan'
}
