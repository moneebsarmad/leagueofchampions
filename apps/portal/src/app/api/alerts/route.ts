import { NextResponse } from 'next/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'
import {
  getActiveAlerts,
  getAlertHistory,
  getAlertSummary,
  checkAllThresholds,
  type AlertType,
  type AlertSeverity,
  type AlertStatus,
} from '@/backend/services/alertEngine'

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/**
 * GET /api/alerts
 *
 * Returns alerts with various filters:
 * - ?status=ACTIVE|ACKNOWLEDGED|RESOLVED|DISMISSED
 * - ?type=LOW_PARTICIPATION|CATEGORY_DRIFT|etc
 * - ?severity=AMBER|RED
 * - ?detail=summary|history|active
 */
export async function GET(request: Request) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase) {
    return auth.error
  }

  const { searchParams } = new URL(request.url)
  const detail = searchParams.get('detail')
  const status = searchParams.get('status') as AlertStatus | null
  const alertType = searchParams.get('type') as AlertType | null
  const severity = searchParams.get('severity') as AlertSeverity | null
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    // Return summary for dashboard
    if (detail === 'summary') {
      const summary = await getAlertSummary()
      return NextResponse.json(summary)
    }

    // Return only active alerts
    if (detail === 'active') {
      const activeAlerts = await getActiveAlerts()
      return NextResponse.json({ alerts: activeAlerts })
    }

    // Return filtered alert history
    const result = await getAlertHistory({
      status: status || undefined,
      alertType: alertType || undefined,
      severity: severity || undefined,
      limit,
      offset,
    })

    return NextResponse.json({
      alerts: result.alerts,
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Alerts error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get alerts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/alerts
 *
 * Trigger alert threshold checks
 * Body: { action: 'check', startDate?, endDate? }
 */
export async function POST(request: Request) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase) {
    return auth.error
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'check') {
      // Trigger threshold checks
      const today = new Date()
      const startDate = body.startDate || toDateString(addDays(today, -7))
      const endDate = body.endDate || toDateString(today)

      const newAlerts = await checkAllThresholds(startDate, endDate)

      return NextResponse.json({
        message: `Threshold check complete. ${newAlerts.length} new alert(s) created.`,
        alerts: newAlerts,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Alert check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check thresholds' },
      { status: 500 }
    )
  }
}
