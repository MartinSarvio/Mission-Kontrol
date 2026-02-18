import { memo } from 'react'
import Card from '../Card'
import Icon from '../Icon'
import type { DailySpend } from './types'

interface StatCardsProps {
  sessionsCount: number
  runningCount: number
  completedCount: number
  tokensValue: string
  parsedTokens: string
  parsedModel: string
  parsedContext: string
  dailySpend: DailySpend
  cronActiveCount: number
  cronJobsTotal: number
}

const StatCards = memo(function StatCards({
  sessionsCount,
  runningCount,
  completedCount,
  tokensValue,
  parsedTokens,
  parsedModel,
  parsedContext,
  dailySpend,
  cronActiveCount,
  cronJobsTotal,
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <Card style={{ position: 'relative', overflow: 'visible', animationDelay: '0ms' }}>
        <div style={{
          position: 'absolute', bottom: '-10px', left: '20%', right: '20%',
          height: '40px',
          background: 'radial-gradient(ellipse, rgba(0, 122, 255, 0.3) 0%, transparent 70%)',
          filter: 'blur(20px)', zIndex: -1,
        }} />
        <p className="caption">Aktive Sessioner</p>
        <p className="text-2xl font-bold mt-1">{sessionsCount}</p>
        <p className="caption mt-1">{runningCount} aktive, {completedCount} afsluttet</p>
      </Card>

      <Card style={{ position: 'relative', overflow: 'visible', animationDelay: '60ms' }}>
        <div style={{
          position: 'absolute', bottom: '-10px', left: '20%', right: '20%',
          height: '40px',
          background: 'radial-gradient(ellipse, rgba(48, 209, 88, 0.3) 0%, transparent 70%)',
          filter: 'blur(20px)', zIndex: -1,
        }} />
        <p className="caption">Tokens i Session</p>
        <p className="text-2xl font-bold mt-1">{tokensValue}</p>
        <p className="caption mt-1">{parsedTokens || 'Ingen data'}</p>
      </Card>

      <Card style={{ position: 'relative', overflow: 'visible', animationDelay: '120ms' }}>
        <div style={{
          position: 'absolute', bottom: '-10px', left: '20%', right: '20%',
          height: '40px',
          background: 'radial-gradient(ellipse, rgba(255, 159, 10, 0.22) 0%, transparent 70%)',
          filter: 'blur(20px)', zIndex: -1,
        }} />
        <div className="flex items-center justify-between">
          <p className="caption">Dagligt Forbrug</p>
          <Icon name="zap" size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
        </div>
        <p className="text-2xl font-bold mt-1">
          {dailySpend.hasData ? `~${Math.round(dailySpend.dkk)} kr` : 'Ingen data'}
        </p>
        <p className="caption mt-1">i dag</p>
      </Card>

      <Card style={{ position: 'relative', overflow: 'visible', animationDelay: '180ms' }}>
        <div style={{
          position: 'absolute', bottom: '-10px', left: '20%', right: '20%',
          height: '40px',
          background: 'radial-gradient(ellipse, rgba(175, 82, 222, 0.3) 0%, transparent 70%)',
          filter: 'blur(20px)', zIndex: -1,
        }} />
        <p className="caption">Model</p>
        <p className="text-2xl font-bold mt-1">{parsedModel || 'N/A'}</p>
        <p className="caption mt-1">{parsedContext || 'Anthropic API'}</p>
      </Card>

      <Card style={{ position: 'relative', overflow: 'visible', animationDelay: '240ms' }}>
        <div style={{
          position: 'absolute', bottom: '-10px', left: '20%', right: '20%',
          height: '40px',
          background: 'radial-gradient(ellipse, rgba(255, 159, 10, 0.3) 0%, transparent 70%)',
          filter: 'blur(20px)', zIndex: -1,
        }} />
        <p className="caption">Planlagte Jobs</p>
        <p className="text-2xl font-bold mt-1">{cronActiveCount} aktive</p>
        <p className="caption mt-1">{cronJobsTotal} total</p>
      </Card>
    </div>
  )
})

export default StatCards
export type { StatCardsProps }
