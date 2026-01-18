import { NextResponse } from 'next/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'
import { calculateCategoryBalance } from '@/backend/services/analyticsCalculator'

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/**
 * GET /api/analytics/category-balance
 *
 * Returns 3R category balance metrics including:
 * - Distribution of points across Respect, Responsibility, Righteousness
 * - Balance score
 * - Dominant category identification
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
    const categoryBalance = await calculateCategoryBalance(effectiveStartDate, effectiveEndDate)

    // Calculate recommendations
    const recommendations: string[] = []
    const threeRs = ['Respect', 'Responsibility', 'Righteousness']

    threeRs.forEach((category) => {
      const pct = categoryBalance.categoryPercentages[category] || 0
      if (pct < 20) {
        recommendations.push(
          `${category} is underrepresented (${pct.toFixed(1)}%). Look for more opportunities to recognize ${category.toLowerCase()}.`
        )
      } else if (pct > 50) {
        recommendations.push(
          `${category} is overrepresented (${pct.toFixed(1)}%). Consider balancing recognition across all categories.`
        )
      }
    })

    if (categoryBalance.isBalanced) {
      recommendations.push('Category distribution is well-balanced. Keep up the great work!')
    }

    // Get status based on balance
    let status: 'GREEN' | 'AMBER' | 'RED' = 'GREEN'
    if (categoryBalance.balanceScore < 60) {
      status = 'RED'
    } else if (categoryBalance.balanceScore < 80) {
      status = 'AMBER'
    }

    return NextResponse.json({
      distribution: categoryBalance.categoryDistribution,
      percentages: categoryBalance.categoryPercentages,
      dominantCategory: categoryBalance.dominantCategory,
      isBalanced: categoryBalance.isBalanced,
      balanceScore: Math.round(categoryBalance.balanceScore),
      status,
      recommendations,
      period: {
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
      },
    })
  } catch (error) {
    console.error('Category balance error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate category balance' },
      { status: 500 }
    )
  }
}
