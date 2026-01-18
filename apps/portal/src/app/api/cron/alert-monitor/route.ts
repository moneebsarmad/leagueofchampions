import { NextResponse } from 'next/server'
import { checkAllThresholds, getAlertSummary } from '@/backend/services/alertEngine'

/**
 * Alert Monitoring Cron Job
 *
 * This endpoint should be called hourly during school hours to:
 * 1. Check alert thresholds in real-time
 * 2. Trigger notifications for RED alerts
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/alert-monitor",
 *     "schedule": "0 8-16 * * 1-5"
 *   }]
 * }
 */

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

// Verify cron secret for security
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured - allowing request')
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    const today = new Date()
    const endDate = toDateString(today)
    const startDate = toDateString(addDays(today, -7))

    // Check thresholds
    const newAlerts = await checkAllThresholds(startDate, endDate)

    // Get current alert summary
    const summary = await getAlertSummary()

    // Filter for RED alerts that need immediate notification
    const redAlerts = newAlerts.filter((a) => a.severity === 'RED')

    // TODO: Trigger email notifications for RED alerts
    // This would integrate with the email queue system
    if (redAlerts.length > 0) {
      console.log(`[Alert Monitor] ${redAlerts.length} new RED alert(s) detected`)
      // await queueAlertNotifications(redAlerts)
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Alert monitoring check completed',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      results: {
        newAlerts: newAlerts.length,
        newRedAlerts: redAlerts.length,
        totalActiveAlerts: summary.activeCount,
        summary: {
          red: summary.redCount,
          amber: summary.amberCount,
        },
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    return NextResponse.json(
      {
        success: false,
        message: 'Alert monitoring check failed',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
