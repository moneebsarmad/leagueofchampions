import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/auth/adminCheck'
import {
  getDashboardAnalytics,
  getInterventionSummary,
  getDomainMetrics,
  getEscalationMetrics,
  getOutcomeMetrics,
  getWeeklyTrends,
} from '@/backend/services/analyticsService'

/**
 * GET /api/interventions/analytics
 * Get intervention analytics data
 * Admin only
 *
 * Query params:
 * - type: 'dashboard' | 'summary' | 'domains' | 'escalation' | 'outcomes' | 'trends'
 * - start: ISO date string
 * - end: ISO date string
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type') ?? 'dashboard'
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    // Default date range: last 30 days
    const dateRange = {
      start: start ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: end ?? new Date().toISOString(),
    }

    switch (type) {
      case 'dashboard': {
        const data = await getDashboardAnalytics(dateRange)
        return NextResponse.json({
          success: true,
          data,
        })
      }

      case 'summary': {
        const data = await getInterventionSummary(dateRange)
        return NextResponse.json({
          success: true,
          data,
        })
      }

      case 'domains': {
        const data = await getDomainMetrics(dateRange)
        return NextResponse.json({
          success: true,
          data,
        })
      }

      case 'escalation': {
        const data = await getEscalationMetrics(dateRange)
        return NextResponse.json({
          success: true,
          data,
        })
      }

      case 'outcomes': {
        const data = await getOutcomeMetrics(dateRange)
        return NextResponse.json({
          success: true,
          data,
        })
      }

      case 'trends': {
        const data = await getWeeklyTrends()
        return NextResponse.json({
          success: true,
          data,
        })
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid type. Use: dashboard, summary, domains, escalation, outcomes, or trends',
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
