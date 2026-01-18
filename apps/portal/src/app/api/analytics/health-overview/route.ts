import { NextResponse } from 'next/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'
import {
  generateAnalyticsSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
  calculateStaffParticipation,
  calculatePointEconomy,
  calculateCategoryBalance,
  calculateHouseDistribution,
} from '@/backend/services/analyticsCalculator'
import { getAlertSummary } from '@/backend/services/alertEngine'

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/**
 * GET /api/analytics/health-overview
 *
 * Returns comprehensive health overview including:
 * - Current health score and status (GREEN/AMBER/RED)
 * - Key metrics (participation, points, category balance, house balance)
 * - Active alerts summary
 * - Trend data
 */
export async function GET(request: Request) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase) {
    return auth.error
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const detail = searchParams.get('detail')

  // Default to last 7 days if no date range specified
  const today = new Date()
  const defaultEndDate = toDateString(today)
  const defaultStartDate = toDateString(addDays(today, -7))

  const effectiveStartDate = startDate || defaultStartDate
  const effectiveEndDate = endDate || defaultEndDate

  try {
    // Return snapshot history for trend view
    if (detail === 'history') {
      const limit = parseInt(searchParams.get('limit') || '30', 10)
      const snapshotType = (searchParams.get('type') || 'daily') as 'daily' | 'weekly' | 'monthly'
      const history = await getSnapshotHistory(snapshotType, limit)
      return NextResponse.json({ history })
    }

    // Return latest snapshot only
    if (detail === 'latest') {
      const snapshot = await getLatestSnapshot()
      return NextResponse.json({ snapshot })
    }

    // Calculate live metrics with individual error handling
    let participation, economy, categoryBalance, houseDistribution, alertSummary

    try {
      participation = await calculateStaffParticipation(effectiveStartDate, effectiveEndDate)
    } catch (e) {
      console.error('Staff participation error:', e)
      throw new Error(`Staff participation: ${e instanceof Error ? e.message : 'unknown error'}`)
    }

    try {
      economy = await calculatePointEconomy(effectiveStartDate, effectiveEndDate)
    } catch (e) {
      console.error('Point economy error:', e)
      throw new Error(`Point economy: ${e instanceof Error ? e.message : 'unknown error'}`)
    }

    try {
      categoryBalance = await calculateCategoryBalance(effectiveStartDate, effectiveEndDate)
    } catch (e) {
      console.error('Category balance error:', e)
      throw new Error(`Category balance: ${e instanceof Error ? e.message : 'unknown error'}`)
    }

    try {
      houseDistribution = await calculateHouseDistribution(effectiveStartDate, effectiveEndDate)
    } catch (e) {
      console.error('House distribution error:', e)
      throw new Error(`House distribution: ${e instanceof Error ? e.message : 'unknown error'}`)
    }

    try {
      alertSummary = await getAlertSummary()
    } catch (e) {
      console.error('Alert summary error:', e)
      // Don't throw - use empty alerts
      alertSummary = { activeCount: 0, redCount: 0, amberCount: 0, recentAlerts: [] }
    }

    // Calculate composite score
    const participationScore =
      participation.participationRate !== null
        ? Math.min(100, participation.participationRate * 1.25)
        : 0
    const categoryScore = categoryBalance.balanceScore
    const houseScore = houseDistribution.balanceScore

    // Simple consistency score based on whether there's activity
    const consistencyScore = economy.totalTransactions > 0 ? 70 : 0

    const compositeScore = Math.round(
      participationScore * 0.4 +
        categoryScore * 0.3 +
        houseScore * 0.2 +
        consistencyScore * 0.1
    )

    const status =
      compositeScore >= 80 ? 'GREEN' : compositeScore >= 60 ? 'AMBER' : 'RED'

    return NextResponse.json({
      // Overall Health
      health: {
        score: compositeScore,
        status,
        participationScore: Math.round(participationScore),
        categoryBalanceScore: Math.round(categoryScore),
        houseBalanceScore: Math.round(houseScore),
        consistencyScore,
      },

      // Key Metrics
      metrics: {
        participation: {
          rate: participation.participationRate,
          activeStaff: participation.activeStaffCount,
          totalStaff: participation.totalStaffCount,
          inactiveStaff: participation.inactiveStaffList,
        },
        pointEconomy: {
          totalPoints: economy.totalPoints,
          totalTransactions: economy.totalTransactions,
          pointsPerStudent: economy.pointsPerStudent,
          pointsPerStaff: economy.pointsPerStaff,
          avgPerTransaction: economy.avgPointsPerTransaction,
        },
        categoryBalance: {
          distribution: categoryBalance.categoryDistribution,
          percentages: categoryBalance.categoryPercentages,
          dominantCategory: categoryBalance.dominantCategory,
          isBalanced: categoryBalance.isBalanced,
        },
        houseDistribution: {
          points: houseDistribution.housePoints,
          percentages: houseDistribution.housePercentages,
          variance: houseDistribution.variance,
          isBalanced: houseDistribution.isBalanced,
        },
      },

      // Alerts
      alerts: alertSummary,

      // Period Info
      period: {
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
      },
    })
  } catch (error) {
    console.error('Health overview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate health overview' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/analytics/health-overview
 *
 * Generate and save a new analytics snapshot
 */
export async function POST(request: Request) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase) {
    return auth.error
  }

  try {
    const body = await request.json()
    const { startDate, endDate, snapshotType = 'daily' } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 })
    }

    const snapshot = await generateAnalyticsSnapshot(
      startDate,
      endDate,
      snapshotType as 'daily' | 'weekly' | 'monthly'
    )

    return NextResponse.json({ snapshot, message: 'Snapshot generated successfully' })
  } catch (error) {
    console.error('Snapshot generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate snapshot' },
      { status: 500 }
    )
  }
}
