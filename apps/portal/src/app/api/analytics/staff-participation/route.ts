import { NextResponse } from 'next/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'
import { calculateStaffParticipation } from '@/backend/services/analyticsCalculator'
import { generateStaffAnalytics, getStaffWithBias, getStaffOutliers } from '@/backend/services/biasDetector'

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/**
 * GET /api/analytics/staff-participation
 *
 * Returns detailed staff participation analytics including:
 * - Overall participation rate
 * - Individual staff metrics
 * - Missing contributors
 * - Bias detection results
 * - Outlier identification
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
    // Return staff with bias issues
    if (detail === 'bias') {
      const threshold = parseFloat(searchParams.get('threshold') || '4.0')
      const staffWithBias = await getStaffWithBias(threshold)
      return NextResponse.json({ staffWithBias })
    }

    // Return outlier staff
    if (detail === 'outliers') {
      const outliers = await getStaffOutliers()
      return NextResponse.json({ outliers })
    }

    // Return detailed staff analytics
    if (detail === 'analytics') {
      const analysisPeriod = (searchParams.get('period') || 'weekly') as 'daily' | 'weekly' | 'monthly'
      const staffAnalytics = await generateStaffAnalytics(
        effectiveStartDate,
        effectiveEndDate,
        analysisPeriod
      )
      return NextResponse.json({ staffAnalytics })
    }

    // Calculate participation metrics
    const participation = await calculateStaffParticipation(effectiveStartDate, effectiveEndDate)

    // Get detailed staff analytics for additional insights
    const staffAnalytics = await generateStaffAnalytics(effectiveStartDate, effectiveEndDate, 'weekly')

    // Build staff details
    const staffDetails = staffAnalytics.map((staff) => ({
      name: staff.staff_name,
      email: staff.staff_email,
      pointsGiven: staff.points_given_period,
      activeDays: staff.active_days_period,
      favoriteCategory: staff.favorite_category,
      categoryDistribution: staff.category_distribution,
      houseDistribution: staff.house_distribution,
      houseBiasCoefficient: staff.house_bias_coefficient,
      favoredHouse: staff.favored_house,
      isOutlier: staff.outlier_flag,
      outlierReason: staff.outlier_reason,
      zScore: staff.z_score,
    }))

    // Identify inactive staff (no points in period)
    const inactiveStaff = staffDetails.filter((s) => s.pointsGiven === 0)

    // Identify staff with bias concerns
    const biasedStaff = staffDetails.filter(
      (s) => s.houseBiasCoefficient !== null && s.houseBiasCoefficient >= 4
    )

    // Identify outliers
    const outlierStaff = staffDetails.filter((s) => s.isOutlier)

    // Top contributors
    const topContributors = [...staffDetails]
      .sort((a, b) => b.pointsGiven - a.pointsGiven)
      .slice(0, 10)

    return NextResponse.json({
      summary: {
        participationRate: participation.participationRate,
        activeStaffCount: participation.activeStaffCount,
        totalStaffCount: participation.totalStaffCount,
        avgPointsPerStaff: participation.avgPointsPerStaff,
      },
      staffDetails,
      highlights: {
        inactiveStaff: inactiveStaff.map((s) => ({
          name: s.name,
          email: s.email,
        })),
        biasedStaff: biasedStaff.map((s) => ({
          name: s.name,
          email: s.email,
          biasCoefficient: s.houseBiasCoefficient,
          favoredHouse: s.favoredHouse,
        })),
        outlierStaff: outlierStaff.map((s) => ({
          name: s.name,
          email: s.email,
          pointsGiven: s.pointsGiven,
          outlierReason: s.outlierReason,
        })),
        topContributors: topContributors.map((s) => ({
          name: s.name,
          email: s.email,
          pointsGiven: s.pointsGiven,
          activeDays: s.activeDays,
        })),
      },
      period: {
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
      },
    })
  } catch (error) {
    console.error('Staff participation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate staff participation' },
      { status: 500 }
    )
  }
}
