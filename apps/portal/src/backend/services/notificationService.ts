/**
 * Notification Service
 *
 * Handles email and in-app notifications for intervention events:
 * - Case assignment notifications
 * - Daily check-in reminders
 * - Monitoring expiration alerts
 * - Escalation notifications
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'

export type NotificationType =
  | 'case_assigned'
  | 'daily_reminder'
  | 'monitoring_expiring'
  | 'monitoring_expired'
  | 'escalation_alert'
  | 'reentry_pending'
  | 'reentry_ready'

export interface Notification {
  id?: string
  user_id: string
  user_email: string
  type: NotificationType
  title: string
  message: string
  link?: string
  read: boolean
  created_at?: string
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send an email notification
 * Uses Resend or similar service - configure RESEND_API_KEY in env
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email')
    // Log email that would have been sent for debugging
    console.log('Would send email:', {
      to: options.to,
      subject: options.subject,
    })
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'LOC System <noreply@daais.edu>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to send email:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Create an in-app notification
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Check if notifications table exists
  try {
    await supabase.from('notifications').insert({
      user_id: notification.user_id,
      user_email: notification.user_email,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link ?? null,
      read: false,
    })
  } catch (error) {
    // Table might not exist yet, just log
    console.warn('Could not create in-app notification:', error)
  }
}

/**
 * Send case assignment notification
 */
export async function notifyCaseAssignment(
  caseId: string,
  caseManagerEmail: string,
  studentName: string
): Promise<void> {
  const subject = `New Level C Case Assigned: ${studentName}`
  const link = `/dashboard/interventions/case-management/${caseId}`

  const html = `
    <h2>New Level C Case Assigned</h2>
    <p>You have been assigned as the case manager for a new Level C case.</p>
    <p><strong>Student:</strong> ${studentName}</p>
    <p>Please log in to the LOC system to review the case and begin the context packet.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}${link}" style="background-color: #7C3AED; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Case</a></p>
  `

  await sendEmail({
    to: caseManagerEmail,
    subject,
    html,
    text: `New Level C Case Assigned: ${studentName}. Log in to view the case.`,
  })

  // Get user ID from email for in-app notification
  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', caseManagerEmail)
    .single()

  if (profile) {
    await createNotification({
      user_id: profile.id,
      user_email: caseManagerEmail,
      type: 'case_assigned',
      title: 'New Case Assigned',
      message: `You have been assigned to manage ${studentName}'s Level C case.`,
      link,
      read: false,
    })
  }
}

/**
 * Send daily check-in reminder
 */
export async function notifyDailyReminder(
  caseId: string,
  caseManagerEmail: string,
  studentName: string,
  dayNumber: number
): Promise<void> {
  const subject = `Daily Check-in Reminder: ${studentName} (Day ${dayNumber})`
  const link = `/dashboard/interventions/case-management/${caseId}`

  const html = `
    <h2>Daily Check-in Reminder</h2>
    <p>This is a reminder to complete the daily check-in for <strong>${studentName}</strong>.</p>
    <p><strong>Monitoring Day:</strong> ${dayNumber}</p>
    <p>Please log your observations and any concerns for today.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}${link}" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Log Check-in</a></p>
  `

  await sendEmail({
    to: caseManagerEmail,
    subject,
    html,
    text: `Daily check-in reminder for ${studentName} (Day ${dayNumber}). Log in to complete the check-in.`,
  })
}

/**
 * Send monitoring expiration warning
 */
export async function notifyMonitoringExpiring(
  interventionType: 'level_b' | 'level_c' | 'reentry',
  interventionId: string,
  caseManagerEmail: string,
  studentName: string,
  daysRemaining: number
): Promise<void> {
  const typeLabels = {
    level_b: 'Level B',
    level_c: 'Level C',
    reentry: 'Re-entry',
  }

  const links = {
    level_b: `/dashboard/interventions/level-b/${interventionId}`,
    level_c: `/dashboard/interventions/case-management/${interventionId}`,
    reentry: `/dashboard/interventions/reentry/${interventionId}`,
  }

  const subject = `${typeLabels[interventionType]} Monitoring Ending Soon: ${studentName}`
  const link = links[interventionType]

  const html = `
    <h2>Monitoring Period Ending Soon</h2>
    <p>The monitoring period for <strong>${studentName}</strong>'s ${typeLabels[interventionType]} intervention will end in <strong>${daysRemaining} day(s)</strong>.</p>
    <p>Please ensure all daily logs are complete and prepare for case closure.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}${link}" style="background-color: #D97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Case</a></p>
  `

  await sendEmail({
    to: caseManagerEmail,
    subject,
    html,
    text: `${typeLabels[interventionType]} monitoring for ${studentName} ends in ${daysRemaining} day(s).`,
  })
}

/**
 * Send escalation alert
 */
export async function notifyEscalation(
  fromLevel: 'A' | 'B',
  toLevel: 'B' | 'C',
  interventionId: string,
  staffEmails: string[],
  studentName: string,
  reason: string
): Promise<void> {
  const subject = `Escalation Alert: ${studentName} - Level ${fromLevel} to ${toLevel}`
  const link = toLevel === 'B'
    ? `/dashboard/interventions/level-b/${interventionId}`
    : `/dashboard/interventions/case-management/${interventionId}`

  const html = `
    <h2>Intervention Escalated</h2>
    <p><strong>${studentName}</strong> has been escalated from Level ${fromLevel} to Level ${toLevel}.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}${link}" style="background-color: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Details</a></p>
  `

  for (const email of staffEmails) {
    await sendEmail({
      to: email,
      subject,
      html,
      text: `${studentName} escalated from Level ${fromLevel} to ${toLevel}. Reason: ${reason}`,
    })
  }
}

/**
 * Send re-entry ready notification
 */
export async function notifyReentryReady(
  reentryId: string,
  teacherEmail: string,
  studentName: string,
  reentryDate: string,
  resetGoal: string
): Promise<void> {
  const subject = `Student Ready for Re-entry: ${studentName}`
  const link = `/dashboard/interventions/reentry/${reentryId}`

  const html = `
    <h2>Student Ready for Re-entry</h2>
    <p><strong>${studentName}</strong> has completed their readiness checklist and is ready to return to class.</p>
    <p><strong>Re-entry Date:</strong> ${new Date(reentryDate).toLocaleDateString()}</p>
    <p><strong>Reset Goal:</strong> ${resetGoal}</p>
    <h3>Teacher Script:</h3>
    <blockquote style="background-color: #EFF6FF; padding: 15px; border-left: 4px solid #2563EB; margin: 10px 0;">
      Welcome back. Your reset goal is "${resetGoal}". Show me the first rep now.
    </blockquote>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}${link}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Protocol</a></p>
  `

  await sendEmail({
    to: teacherEmail,
    subject,
    html,
    text: `${studentName} is ready for re-entry. Reset goal: ${resetGoal}`,
  })
}

/**
 * Get pending notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  const supabase = getSupabaseAdmin()

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data as Notification[]
  } catch {
    return []
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

/**
 * Batch send daily reminders (for cron job)
 */
export async function sendDailyReminders(): Promise<{
  sent: number
  failed: number
}> {
  const supabase = getSupabaseAdmin()
  let sent = 0
  let failed = 0

  // Get active Level C cases in monitoring
  const { data: activeCases } = await supabase
    .from(Tables.levelCCases)
    .select('id, student_id, case_manager_id, case_manager_name')
    .eq('status', 'monitoring')

  if (activeCases) {
    for (const caseRecord of activeCases) {
      if (caseRecord.case_manager_id) {
        // Get case manager email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', caseRecord.case_manager_id)
          .single()

        if (profile?.email) {
          // Get student name
          const { data: student } = await supabase
            .from('students')
            .select('student_name')
            .eq('id', caseRecord.student_id)
            .single()

          try {
            await notifyDailyReminder(
              caseRecord.id,
              profile.email,
              student?.student_name ?? 'Student',
              1 // Would need to calculate actual day
            )
            sent++
          } catch {
            failed++
          }
        }
      }
    }
  }

  // Get active re-entry protocols
  const { data: activeReentries } = await supabase
    .from(Tables.reentryProtocols)
    .select('id, student_id, receiving_teacher_id')
    .eq('status', 'active')

  if (activeReentries) {
    for (const protocol of activeReentries) {
      if (protocol.receiving_teacher_id) {
        const { data: teacher } = await supabase
          .from('staff')
          .select('email')
          .eq('id', protocol.receiving_teacher_id)
          .single()

        if (teacher?.email) {
          const { data: student } = await supabase
            .from('students')
            .select('student_name')
            .eq('id', protocol.student_id)
            .single()

          try {
            await notifyDailyReminder(
              protocol.id,
              teacher.email,
              student?.student_name ?? 'Student',
              1
            )
            sent++
          } catch {
            failed++
          }
        }
      }
    }
  }

  return { sent, failed }
}
