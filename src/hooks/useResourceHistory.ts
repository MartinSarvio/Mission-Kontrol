import { useRef, useEffect } from 'react'

const MAX_POINTS = 30

interface ResourceHistoryResult {
  ramHistory: number[]
  diskHistory: number[]
}

/**
 * Holder et sliding window af de seneste 30 datapunkter for RAM% og Disk%.
 * Bruges til at vise sparkline-grafer i Systemhelbred-kortet.
 */
export function useResourceHistory(
  ramPct: number | null,
  diskPct: number | null
): ResourceHistoryResult {
  const ramHistoryRef = useRef<number[]>([])
  const diskHistoryRef = useRef<number[]>([])

  useEffect(() => {
    if (ramPct !== null && Number.isFinite(ramPct)) {
      ramHistoryRef.current = [...ramHistoryRef.current, ramPct].slice(-MAX_POINTS)
    }
  }, [ramPct])

  useEffect(() => {
    if (diskPct !== null && Number.isFinite(diskPct)) {
      diskHistoryRef.current = [...diskHistoryRef.current, diskPct].slice(-MAX_POINTS)
    }
  }, [diskPct])

  return {
    ramHistory: ramHistoryRef.current,
    diskHistory: diskHistoryRef.current,
  }
}
