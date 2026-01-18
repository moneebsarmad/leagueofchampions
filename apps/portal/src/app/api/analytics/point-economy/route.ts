import { NextResponse } from 'next/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'
import { calculatePointEconomy } from '@/backend/services/analyticsCalculator'

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/**
 * GET /api/analytics/point-economy
 *
 * Returns point economy metrics including:
 * - Total points awarded
 * - Points per student/staff averages
 * - Weekly trends
 * - Transaction volume
 */
export async function GET(request: Request) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase) {
    return auth.error
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  // Default to last 30 days if no date range specified
  const today = new Date()
  const defaultEndDate = toDateString(today)
  const defaultStartDate = toDateString(addDays(today, -30))

  const effectiveStartDate = startDate || defaultStartDate
  const effectiveEndDate = endDate || defaultEndDate

  try {
    const economy = await calculatePointEconomy(effectiveStartDate, effectiveEndDate)

    // Calculate week-over-week change if we have enough data
    let weekOverWeekChange = null
    if (economy.weeklyTrend.length >= 2) {
      const lastWeek = economy.weeklyTrend[economy.weeklyTrend.length - 1]
      const prevWeek = economy.weeklyTrend[economy.weeklyTrend.length - 2]
      if (prevWeek.points > 0) {
        weekOverWeekChange = ((lastWeek.points - prevWeek.points) / prevWeek.points) * 100
      }
    }

    // Calculate daily average
    const dayCount =
      Math.ceil(
        (new Date(effectiveEndDate).getTime() - new Date(effectiveStartDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    const dailyAverage = economy.totalPoints / dayCount

    return NextResponse.json({
      summary: {
        totalPoints: economy.totalPoints,
        totalTransactions: economy.totalTransactions,
        pointsPerStudent: economy.pointsPerStudent,
        pointsPerStaff: economy.pointsPerStaff,
        avgPerTransaction: economy.avgPointsPerTransaction,
        dailyAverage: Math.round(dailyAverage * 10) / 10,
        weekOverWeekChange:
          weekOverWeekChange !== null ? Math.round(weekOverWeekChange * 10) / 10 : null,
      },
      trends: {
        weekly: economy.weeklyTrend,
      },
      period: {
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        dayCount,
      },
    })
  } catch (error) {
    console.error('Point economy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate point economy' },
      { status: 500 }
    )
  }
}
