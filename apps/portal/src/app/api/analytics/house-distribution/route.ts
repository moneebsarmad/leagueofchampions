import { NextResponse } from 'next/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'
import { calculateHouseDistribution } from '@/backend/services/analyticsCalculator'

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/**
 * GET /api/analytics/house-distribution
 *
 * Returns house point distribution metrics including:
 * - Points by house
 * - Variance/imbalance detection
 * - Balance score
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
    const houseDistribution = await calculateHouseDistribution(effectiveStartDate, effectiveEndDate)

    // Sort houses by points
    const sortedHouses = Object.entries(houseDistribution.housePoints)
      .map(([house, points]) => ({
        house,
        points,
        percentage: houseDistribution.housePercentages[house] || 0,
      }))
      .sort((a, b) => b.points - a.points)

    // Calculate recommendations
    const recommendations: string[] = []
    const topHouse = sortedHouses[0]
    const bottomHouse = sortedHouses[sortedHouses.length - 1]

    if (houseDistribution.variance > 35) {
      recommendations.push(
        `Significant house imbalance detected (${houseDistribution.variance.toFixed(1)}% variance). ${topHouse.house} has ${topHouse.points} points while ${bottomHouse.house} has only ${bottomHouse.points}.`
      )
      recommendations.push(
        'Review point distribution by staff to identify potential bias patterns.'
      )
    } else if (houseDistribution.variance > 25) {
      recommendations.push(
        `Moderate house imbalance (${houseDistribution.variance.toFixed(1)}% variance). Consider monitoring point distribution more closely.`
      )
    } else {
      recommendations.push(
        'House point distribution is well-balanced. Keep up the equitable recognition!'
      )
    }

    // Get status based on variance
    let status: 'GREEN' | 'AMBER' | 'RED' = 'GREEN'
    if (houseDistribution.variance > 35) {
      status = 'RED'
    } else if (houseDistribution.variance > 25) {
      status = 'AMBER'
    }

    return NextResponse.json({
      points: houseDistribution.housePoints,
      percentages: houseDistribution.housePercentages,
      ranking: sortedHouses,
      variance: Math.round(houseDistribution.variance * 10) / 10,
      isBalanced: houseDistribution.isBalanced,
      balanceScore: Math.round(houseDistribution.balanceScore),
      status,
      recommendations,
      period: {
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
      },
    })
  } catch (error) {
    console.error('House distribution error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate house distribution' },
      { status: 500 }
    )
  }
}
