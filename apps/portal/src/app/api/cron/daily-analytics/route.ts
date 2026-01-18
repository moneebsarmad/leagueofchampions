import { NextResponse } from 'next/server'
import {
  generateAnalyticsSnapshot,
  saveAnalyticsSnapshot,
} from '@/backend/services/analyticsCalculator'
import { generateStaffAnalytics, saveStaffAnalytics } from '@/backend/services/biasDetector'
import { checkAllThresholds, autoResolveStaleAlerts } from '@/backend/services/alertEngine'

/**
 * Daily Analytics Cron Job
 *
 * This endpoint should be called daily (e.g., at 2 AM) to:
 * 1. Generate and save daily analytics snapshot
 * 2. Calculate staff analytics (bias detection, outliers)
 * 3. Check alert thresholds
 * 4. Auto-resolve stale alerts
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-analytics",
 *     "schedule": "0 2 * * *"
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

  // If no secret is configured, allow the request (for development)
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured - allowing request')
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const results: Record<string, unknown> = {}
  const errors: string[] = []

  try {
    const today = new Date()
    const endDate = toDateString(today)

    // Calculate date ranges for different snapshot types
    const dailyStartDate = toDateString(addDays(today, -1))
    const weeklyStartDate = toDateString(addDays(today, -7))
    const monthlyStartDate = toDateString(addDays(today, -30))

    // 1. Generate daily snapshot
    try {
      const dailySnapshot = await generateAnalyticsSnapshot(dailyStartDate, endDate, 'daily')
      await saveAnalyticsSnapshot(dailySnapshot)
      results.dailySnapshot = {
        status: 'success',
        date: endDate,
        healthScore: dailySnapshot.overall_health_score,
        healthStatus: dailySnapshot.status,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Daily snapshot: ${message}`)
      results.dailySnapshot = { status: 'error', error: message }
    }

    // 2. Generate weekly snapshot (only on Sundays or configurable)
    const dayOfWeek = today.getUTCDay()
    if (dayOfWeek === 0) {
      // Sunday
      try {
        const weeklySnapshot = await generateAnalyticsSnapshot(weeklyStartDate, endDate, 'weekly')
        await saveAnalyticsSnapshot(weeklySnapshot)
        results.weeklySnapshot = {
          status: 'success',
          date: endDate,
          healthScore: weeklySnapshot.overall_health_score,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Weekly snapshot: ${message}`)
        results.weeklySnapshot = { status: 'error', error: message }
      }
    }

    // 3. Generate monthly snapshot (only on first of month)
    if (today.getUTCDate() === 1) {
      try {
        const monthlySnapshot = await generateAnalyticsSnapshot(monthlyStartDate, endDate, 'monthly')
        await saveAnalyticsSnapshot(monthlySnapshot)
        results.monthlySnapshot = {
          status: 'success',
          date: endDate,
          healthScore: monthlySnapshot.overall_health_score,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Monthly snapshot: ${message}`)
        results.monthlySnapshot = { status: 'error', error: message }
      }
    }

    // 4. Generate staff analytics
    try {
      const staffAnalytics = await generateStaffAnalytics(weeklyStartDate, endDate, 'weekly')
      await saveStaffAnalytics(staffAnalytics)
      results.staffAnalytics = {
        status: 'success',
        staffCount: staffAnalytics.length,
        outliers: staffAnalytics.filter((s) => s.outlier_flag).length,
        biasFlags: staffAnalytics.filter((s) => (s.house_bias_coefficient || 0) >= 4).length,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Staff analytics: ${message}`)
      results.staffAnalytics = { status: 'error', error: message }
    }

    // 5. Check alert thresholds
    try {
      const newAlerts = await checkAllThresholds(weeklyStartDate, endDate)
      results.alertCheck = {
        status: 'success',
        newAlerts: newAlerts.length,
        alertTypes: newAlerts.map((a) => a.alert_type),
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Alert check: ${message}`)
      results.alertCheck = { status: 'error', error: message }
    }

    // 6. Auto-resolve stale alerts
    try {
      const resolvedCount = await autoResolveStaleAlerts(30)
      results.staleAlertCleanup = {
        status: 'success',
        resolvedCount,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Stale alert cleanup: ${message}`)
      results.staleAlertCleanup = { status: 'error', error: message }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: errors.length === 0,
      message: errors.length === 0 ? 'Daily analytics job completed successfully' : 'Completed with errors',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      results,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    return NextResponse.json(
      {
        success: false,
        message: 'Daily analytics job failed',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request)
}
