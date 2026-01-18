import { NextResponse } from 'next/server'
import { generateWeeklyDigest, sendWeeklyDigestEmails, saveReportToHistory } from '@/backend/services/digestGenerator'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Weekly Digest Cron Job
 *
 * This endpoint should be called weekly (e.g., every Friday at 4 PM) to:
 * 1. Generate weekly implementation digest
 * 2. Send digest emails to leadership
 * 3. Archive the digest for records
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/weekly-digest",
 *     "schedule": "0 16 * * 5"
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

/**
 * Get digest recipients from environment or database
 */
async function getDigestRecipients(): Promise<string[]> {
  // First check environment variable
  const envRecipients = process.env.DIGEST_RECIPIENTS
  if (envRecipients) {
    return envRecipients.split(',').map((e) => e.trim()).filter(Boolean)
  }

  // Otherwise, get admins from database
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('profiles')
    .select('email:id')
    .eq('role', 'admin')

  if (error || !data) {
    console.warn('Failed to fetch admin emails:', error?.message)
    return []
  }

  // Get emails from auth.users
  const { data: users } = await supabase.auth.admin.listUsers()
  const adminIds = data.map((d) => d.email)
  return users?.users
    .filter((u) => adminIds.includes(u.id))
    .map((u) => u.email)
    .filter((e): e is string => !!e) || []
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

    // Generate digest
    const digestData = await generateWeeklyDigest(startDate, endDate)

    // Get recipients
    const recipients = await getDigestRecipients()

    // Send emails if recipients exist
    let emailsSent = 0
    if (recipients.length > 0) {
      emailsSent = await sendWeeklyDigestEmails(digestData, recipients)
    } else {
      console.warn('No digest recipients configured')
    }

    // Save to history
    const reportId = await saveReportToHistory(
      'WEEKLY_DIGEST',
      `Weekly Digest - ${startDate} to ${endDate}`,
      startDate,
      endDate,
      digestData as unknown as Record<string, unknown>
    )

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Weekly digest generated and sent',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      results: {
        digest: {
          weekStart: digestData.weekStart,
          weekEnd: digestData.weekEnd,
          healthStatus: digestData.healthStatus,
          healthScore: digestData.healthScore,
          insightsCount: digestData.insights.length,
          actionsCount: digestData.actions.length,
        },
        distribution: {
          recipients: recipients.length,
          emailsSent,
        },
        reportId,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    return NextResponse.json(
      {
        success: false,
        message: 'Weekly digest generation failed',
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
