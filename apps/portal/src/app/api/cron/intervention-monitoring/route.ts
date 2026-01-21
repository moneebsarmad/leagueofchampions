import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'
import {
  sendDailyReminders,
  notifyMonitoringExpiring,
  notifyEscalation,
} from '@/backend/services/notificationService'

/**
 * GET /api/cron/intervention-monitoring
 *
 * Cron job to check for:
 * 1. Level B interventions with expired monitoring periods
 * 2. Level C cases needing attention (overdue phases)
 * 3. Re-entry protocols needing completion
 *
 * Should be called daily by a cron scheduler (e.g., Vercel Cron)
 *
 * Add this to vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/intervention-monitoring",
 *       "schedule": "0 6 * * *"
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()
    const today = new Date().toISOString().split('T')[0]
    const results: {
      level_b_expired: string[]
      level_c_overdue: string[]
      reentry_overdue: string[]
      actions_taken: string[]
    } = {
      level_b_expired: [],
      level_c_overdue: [],
      reentry_overdue: [],
      actions_taken: [],
    }

    // =========================================================================
    // 1. Check Level B interventions with expired monitoring
    // =========================================================================
    const { data: expiredLevelB } = await supabase
      .from(Tables.levelBInterventions)
      .select('id, student_id, monitoring_end_date, daily_success_rates')
      .eq('status', 'monitoring')
      .lt('monitoring_end_date', today)

    if (expiredLevelB && expiredLevelB.length > 0) {
      for (const intervention of expiredLevelB) {
        results.level_b_expired.push(intervention.id)

        // Calculate final success rate
        const rates = intervention.daily_success_rates as Record<string, number>
        const rateValues = Object.values(rates)
        const avgRate = rateValues.length > 0
          ? rateValues.reduce((a, b) => a + b, 0) / rateValues.length
          : 0

        // Auto-complete based on success threshold (80%)
        const newStatus = avgRate >= 80 ? 'completed_success' : 'completed_escalated'
        const shouldEscalate = avgRate < 80

        await supabase
          .from(Tables.levelBInterventions)
          .update({
            status: newStatus,
            final_success_rate: Math.round(avgRate),
            escalated_to_c: shouldEscalate,
            escalation_reason: shouldEscalate
              ? `Auto-escalated: monitoring ended with ${Math.round(avgRate)}% success rate (below 80% threshold)`
              : null,
          })
          .eq('id', intervention.id)

        results.actions_taken.push(
          `Level B ${intervention.id}: ${newStatus} (${Math.round(avgRate)}% success)`
        )
      }
    }

    // =========================================================================
    // 2. Check Level C cases needing attention
    // =========================================================================
    const { data: staleLevelC } = await supabase
      .from(Tables.levelCCases)
      .select('id, student_id, status, created_at, updated_at')
      .in('status', ['active', 'context_packet', 'admin_response', 'pending_reentry'])
      .lt('updated_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()) // Not updated in 3 days

    if (staleLevelC && staleLevelC.length > 0) {
      for (const caseRecord of staleLevelC) {
        results.level_c_overdue.push(caseRecord.id)
        results.actions_taken.push(
          `Level C ${caseRecord.id}: Flagged as overdue (${caseRecord.status}, last updated ${caseRecord.updated_at})`
        )
      }
    }

    // Check for Level C cases in monitoring that have exceeded their duration
    const { data: expiredLevelCMonitoring } = await supabase
      .from(Tables.levelCCases)
      .select('id, student_id, monitoring_duration_days, created_at')
      .eq('status', 'monitoring')

    if (expiredLevelCMonitoring && expiredLevelCMonitoring.length > 0) {
      for (const caseRecord of expiredLevelCMonitoring) {
        const createdDate = new Date(caseRecord.created_at)
        const durationDays = caseRecord.monitoring_duration_days || 14
        const expectedEndDate = new Date(createdDate)
        expectedEndDate.setDate(expectedEndDate.getDate() + durationDays)

        if (new Date() > expectedEndDate) {
          results.level_c_overdue.push(caseRecord.id)
          results.actions_taken.push(
            `Level C ${caseRecord.id}: Monitoring period exceeded (${durationDays} days)`
          )
        }
      }
    }

    // =========================================================================
    // 3. Check Re-entry protocols needing completion
    // =========================================================================
    const { data: expiredReentry } = await supabase
      .from(Tables.reentryProtocols)
      .select('id, student_id, monitoring_end_date, status, daily_logs')
      .eq('status', 'active')
      .lt('monitoring_end_date', today)

    if (expiredReentry && expiredReentry.length > 0) {
      for (const protocol of expiredReentry) {
        results.reentry_overdue.push(protocol.id)
        results.actions_taken.push(
          `Re-entry ${protocol.id}: Monitoring period ended, awaiting completion`
        )
      }
    }

    // Check for pending re-entries that are overdue
    const { data: overdueReentry } = await supabase
      .from(Tables.reentryProtocols)
      .select('id, student_id, reentry_date, status')
      .in('status', ['pending', 'ready'])
      .lt('reentry_date', today)

    if (overdueReentry && overdueReentry.length > 0) {
      for (const protocol of overdueReentry) {
        if (!results.reentry_overdue.includes(protocol.id)) {
          results.reentry_overdue.push(protocol.id)
          results.actions_taken.push(
            `Re-entry ${protocol.id}: Re-entry date passed but not started`
          )
        }
      }
    }

    // =========================================================================
    // 4. Send daily reminder notifications
    // =========================================================================
    const reminderResults = await sendDailyReminders()
    results.actions_taken.push(
      `Daily reminders: ${reminderResults.sent} sent, ${reminderResults.failed} failed`
    )

    // =========================================================================
    // 5. Send monitoring expiration warnings (2 days before expiry)
    // =========================================================================
    const twoDaysFromNow = new Date()
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
    const twoDaysStr = twoDaysFromNow.toISOString().split('T')[0]

    // Level B expiring soon
    const { data: expiringLevelB } = await supabase
      .from(Tables.levelBInterventions)
      .select('id, student_id')
      .eq('status', 'monitoring')
      .eq('monitoring_end_date', twoDaysStr)

    if (expiringLevelB && expiringLevelB.length > 0) {
      for (const intervention of expiringLevelB) {
        const { data: student } = await supabase
          .from('students')
          .select('student_name')
          .eq('id', intervention.student_id)
          .single()

        // Get staff who created the intervention
        const { data: staffRecord } = await supabase
          .from(Tables.levelBInterventions)
          .select('staff_id')
          .eq('id', intervention.id)
          .single()

        if (staffRecord?.staff_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', staffRecord.staff_id)
            .single()

          if (profile?.email) {
            await notifyMonitoringExpiring(
              'level_b',
              intervention.id,
              profile.email,
              student?.student_name ?? 'Student',
              2
            )
          }
        }
        results.actions_taken.push(`Level B ${intervention.id}: Expiring soon notification sent`)
      }
    }

    // Re-entry protocols expiring soon
    const { data: expiringReentry } = await supabase
      .from(Tables.reentryProtocols)
      .select('id, student_id, receiving_teacher_id')
      .eq('status', 'active')
      .eq('monitoring_end_date', twoDaysStr)

    if (expiringReentry && expiringReentry.length > 0) {
      for (const protocol of expiringReentry) {
        const { data: student } = await supabase
          .from('students')
          .select('student_name')
          .eq('id', protocol.student_id)
          .single()

        if (protocol.receiving_teacher_id) {
          const { data: teacher } = await supabase
            .from('staff')
            .select('email')
            .eq('id', protocol.receiving_teacher_id)
            .single()

          if (teacher?.email) {
            await notifyMonitoringExpiring(
              'reentry',
              protocol.id,
              teacher.email,
              student?.student_name ?? 'Student',
              2
            )
          }
        }
        results.actions_taken.push(`Re-entry ${protocol.id}: Expiring soon notification sent`)
      }
    }

    // =========================================================================
    // Log summary
    // =========================================================================
    console.log('=== Intervention Monitoring Cron Summary ===')
    console.log(`Date: ${today}`)
    console.log(`Level B expired: ${results.level_b_expired.length}`)
    console.log(`Level C overdue: ${results.level_c_overdue.length}`)
    console.log(`Re-entry overdue: ${results.reentry_overdue.length}`)
    console.log(`Daily reminders: ${reminderResults.sent} sent`)
    console.log(`Actions taken: ${results.actions_taken.length}`)

    return NextResponse.json({
      success: true,
      data: {
        date: today,
        summary: {
          level_b_expired: results.level_b_expired.length,
          level_c_overdue: results.level_c_overdue.length,
          reentry_overdue: results.reentry_overdue.length,
          total_actions: results.actions_taken.length,
        },
        details: results,
      },
    })
  } catch (error) {
    console.error('Error in intervention monitoring cron:', error)
    return NextResponse.json(
      { success: false, error: 'Cron job failed' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
