import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'

/**
 * Email Service
 *
 * Handles email template rendering and queueing.
 * Integrates with email providers (Resend, SendGrid, etc.)
 */

type EmailTemplate = {
  template_key: string
  template_name: string
  subject_template: string
  body_html_template: string
  body_text_template: string | null
}

type QueuedEmail = {
  template_key: string
  recipient_email: string
  recipient_name?: string
  subject: string
  body_html: string
  body_text?: string
  template_variables: Record<string, unknown>
  scheduled_for?: string
}

/**
 * Simple template variable replacement
 * Supports {{variable}} syntax
 */
function renderTemplate(template: string, variables: Record<string, unknown>): string {
  let rendered = template

  // Handle simple variables {{variable}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    rendered = rendered.replace(regex, String(value ?? ''))
  })

  // Handle array loops {{#array}}...{{/array}}
  const loopRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g
  rendered = rendered.replace(loopRegex, (_, arrayName, content) => {
    const arr = variables[arrayName]
    if (!Array.isArray(arr)) return ''
    return arr
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          let itemContent = content
          Object.entries(item).forEach(([k, v]) => {
            const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g')
            itemContent = itemContent.replace(regex, String(v ?? ''))
          })
          // Handle {{.}} for simple array items
          itemContent = itemContent.replace(/\{\{\.\}\}/g, String(item))
          return itemContent
        }
        // Simple array item
        return content.replace(/\{\{\.\}\}/g, String(item))
      })
      .join('')
  })

  return rendered
}

/**
 * Get email template from database
 */
export async function getEmailTemplate(templateKey: string): Promise<EmailTemplate | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.emailTemplates)
    .select('*')
    .eq('template_key', templateKey)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch email template:', error.message)
    return null
  }

  return data as EmailTemplate | null
}

/**
 * Queue an email for sending
 */
export async function queueEmail(email: QueuedEmail): Promise<string | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.emailQueue)
    .insert({
      template_key: email.template_key,
      recipient_email: email.recipient_email,
      recipient_name: email.recipient_name || null,
      subject: email.subject,
      body_html: email.body_html,
      body_text: email.body_text || null,
      template_variables: email.template_variables,
      scheduled_for: email.scheduled_for || new Date().toISOString(),
      status: 'PENDING',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to queue email:', error.message)
    return null
  }

  return data?.id || null
}

/**
 * Render and queue an email using a template
 */
export async function sendTemplatedEmail(
  templateKey: string,
  recipientEmail: string,
  recipientName: string | undefined,
  variables: Record<string, unknown>,
  scheduledFor?: string
): Promise<string | null> {
  const template = await getEmailTemplate(templateKey)
  if (!template) {
    console.error(`Email template not found: ${templateKey}`)
    return null
  }

  const subject = renderTemplate(template.subject_template, variables)
  const bodyHtml = renderTemplate(template.body_html_template, variables)
  const bodyText = template.body_text_template
    ? renderTemplate(template.body_text_template, variables)
    : undefined

  return queueEmail({
    template_key: templateKey,
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    subject,
    body_html: bodyHtml,
    body_text: bodyText,
    template_variables: variables,
    scheduled_for: scheduledFor,
  })
}

/**
 * Process pending emails in the queue
 * This would integrate with an email provider like Resend or SendGrid
 */
export async function processEmailQueue(batchSize: number = 10): Promise<{
  processed: number
  sent: number
  failed: number
}> {
  const supabase = getSupabaseAdmin()

  // Get pending emails
  const { data: emails, error } = await supabase
    .from(Tables.emailQueue)
    .select('*')
    .eq('status', 'PENDING')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(batchSize)

  if (error) {
    console.error('Failed to fetch email queue:', error.message)
    return { processed: 0, sent: 0, failed: 0 }
  }

  if (!emails || emails.length === 0) {
    return { processed: 0, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  for (const email of emails) {
    try {
      // Mark as sending
      await supabase
        .from(Tables.emailQueue)
        .update({ status: 'SENDING', last_attempt_at: new Date().toISOString() })
        .eq('id', email.id)

      // TODO: Integrate with actual email provider
      // For now, just log and mark as sent
      const emailProvider = process.env.EMAIL_PROVIDER

      if (emailProvider === 'resend') {
        // await sendWithResend(email)
        console.log(`[Email] Would send to ${email.recipient_email}: ${email.subject}`)
      } else if (emailProvider === 'sendgrid') {
        // await sendWithSendGrid(email)
        console.log(`[Email] Would send to ${email.recipient_email}: ${email.subject}`)
      } else {
        // No provider configured, just log
        console.log(`[Email] No provider configured. Would send to ${email.recipient_email}: ${email.subject}`)
      }

      // Mark as sent
      await supabase
        .from(Tables.emailQueue)
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
          attempts: (email.attempts || 0) + 1,
        })
        .eq('id', email.id)

      sent++
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await supabase
        .from(Tables.emailQueue)
        .update({
          status: 'FAILED',
          error_message: message,
          attempts: (email.attempts || 0) + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', email.id)

      failed++
    }
  }

  return { processed: emails.length, sent, failed }
}

/**
 * Queue alert notification emails
 */
export async function queueAlertNotifications(
  alerts: Array<{
    severity: 'AMBER' | 'RED'
    title: string
    message: string
    recommended_action: string | null
    related_metric: string
    metric_value: number
    threshold_value: number
  }>,
  recipients: string[]
): Promise<number> {
  let queued = 0

  for (const alert of alerts) {
    for (const email of recipients) {
      const variables = {
        severity: alert.severity,
        severity_color: alert.severity === 'RED' ? '#910000' : '#c9a227',
        alert_title: alert.title,
        alert_message: alert.message,
        recommended_action: alert.recommended_action || 'Review the dashboard for more details.',
        metric_name: alert.related_metric,
        metric_value: alert.metric_value,
        threshold_value: alert.threshold_value,
        alert_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard/tier2-analytics`,
      }

      const id = await sendTemplatedEmail('alert_notification', email, undefined, variables)
      if (id) queued++
    }
  }

  return queued
}

/**
 * Queue participation reminder emails
 */
export async function queueParticipationReminders(
  inactiveStaff: Array<{ email: string; name: string; daysInactive: number }>
): Promise<number> {
  let queued = 0

  for (const staff of inactiveStaff) {
    const variables = {
      staff_name: staff.name,
      days_inactive: staff.daysInactive,
      portal_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard/add-points`,
    }

    const id = await sendTemplatedEmail(
      'participation_reminder',
      staff.email,
      staff.name,
      variables
    )
    if (id) queued++
  }

  return queued
}
