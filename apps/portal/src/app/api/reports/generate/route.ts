import { NextResponse } from 'next/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'
import {
  generateWeeklyDigest,
  generateQuarterlyReport,
  saveReportToHistory,
} from '@/backend/services/digestGenerator'
import {
  calculateStaffParticipation,
  calculatePointEconomy,
  calculateCategoryBalance,
  calculateHouseDistribution,
  getSnapshotHistory,
} from '@/backend/services/analyticsCalculator'
import { getAlertHistory } from '@/backend/services/alertEngine'

/**
 * POST /api/reports/generate
 *
 * Generate various report types:
 * - weekly_digest: Weekly implementation digest
 * - quarterly_board: Quarterly board report
 * - staff_summary: Staff participation summary
 * - custom: Custom date range report
 */
export async function POST(request: Request) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error
  }

  try {
    const body = await request.json()
    const { reportType, startDate, endDate, quarter, year, save = true } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 })
    }

    let reportData: Record<string, unknown> = {}
    let reportName = ''

    switch (reportType) {
      case 'weekly_digest': {
        const digest = await generateWeeklyDigest(startDate, endDate)
        reportData = digest as unknown as Record<string, unknown>
        reportName = `Weekly Digest - ${startDate} to ${endDate}`
        break
      }

      case 'quarterly_board': {
        if (!quarter || !year) {
          return NextResponse.json({ error: 'Quarter and year required for board report' }, { status: 400 })
        }
        const report = await generateQuarterlyReport(quarter, year, startDate, endDate)
        reportData = report as unknown as Record<string, unknown>
        reportName = `Quarterly Board Report - ${quarter} ${year}`
        break
      }

      case 'staff_summary': {
        const participation = await calculateStaffParticipation(startDate, endDate)
        reportData = {
          period: { startDate, endDate },
          summary: {
            participationRate: participation.participationRate,
            activeStaffCount: participation.activeStaffCount,
            totalStaffCount: participation.totalStaffCount,
            avgPointsPerStaff: participation.avgPointsPerStaff,
          },
          activeStaff: participation.activeStaffList,
          inactiveStaff: participation.inactiveStaffList,
          staffMetrics: Object.fromEntries(participation.staffMetrics),
        }
        reportName = `Staff Summary - ${startDate} to ${endDate}`
        break
      }

      case 'custom': {
        const [participation, economy, categoryBalance, houseDistribution, alertHistory] =
          await Promise.all([
            calculateStaffParticipation(startDate, endDate),
            calculatePointEconomy(startDate, endDate),
            calculateCategoryBalance(startDate, endDate),
            calculateHouseDistribution(startDate, endDate),
            getAlertHistory({ limit: 50 }),
          ])

        reportData = {
          period: { startDate, endDate },
          participation: {
            rate: participation.participationRate,
            activeStaff: participation.activeStaffCount,
            totalStaff: participation.totalStaffCount,
            avgPointsPerStaff: participation.avgPointsPerStaff,
            inactiveStaff: participation.inactiveStaffList,
          },
          pointEconomy: {
            totalPoints: economy.totalPoints,
            totalTransactions: economy.totalTransactions,
            pointsPerStudent: economy.pointsPerStudent,
            pointsPerStaff: economy.pointsPerStaff,
            weeklyTrend: economy.weeklyTrend,
          },
          categoryBalance: {
            distribution: categoryBalance.categoryDistribution,
            percentages: categoryBalance.categoryPercentages,
            dominantCategory: categoryBalance.dominantCategory,
            balanceScore: categoryBalance.balanceScore,
          },
          houseDistribution: {
            points: houseDistribution.housePoints,
            percentages: houseDistribution.housePercentages,
            variance: houseDistribution.variance,
            balanceScore: houseDistribution.balanceScore,
          },
          alerts: {
            total: alertHistory.total,
            recent: alertHistory.alerts.slice(0, 10),
          },
        }
        reportName = `Custom Report - ${startDate} to ${endDate}`
        break
      }

      default:
        return NextResponse.json({ error: `Unknown report type: ${reportType}` }, { status: 400 })
    }

    // Save report to history if requested
    let reportId: string | null = null
    if (save) {
      reportId = await saveReportToHistory(
        reportType.toUpperCase(),
        reportName,
        startDate,
        endDate,
        reportData,
        auth.user.id
      )
    }

    return NextResponse.json({
      success: true,
      reportType,
      reportName,
      reportId,
      data: reportData,
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reports/generate
 *
 * Get report history
 */
export async function GET(request: Request) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase) {
    return auth.error
  }

  const { searchParams } = new URL(request.url)
  const reportType = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  try {
    let query = auth.supabase
      .from('report_history')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(limit)

    if (reportType) {
      query = query.eq('report_type', reportType.toUpperCase())
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ reports: data || [] })
  } catch (error) {
    console.error('Report history error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
