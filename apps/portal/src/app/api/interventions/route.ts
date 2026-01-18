import { NextResponse } from 'next/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'

/**
 * Intervention Management API
 *
 * GET /api/interventions - List playbooks and intervention history
 * POST /api/interventions - Execute an intervention
 */

type Playbook = {
  id: string
  playbook_name: string
  description: string | null
  trigger_alert_types: string[]
  trigger_severity: string[]
  actions: Array<{ step: number; action: string; template: string | null }>
  follow_up_period_days: number
  success_metrics: Record<string, unknown>
  is_active: boolean
}

type InterventionLog = {
  id: string
  alert_id: string | null
  intervention_type: string
  playbook_used: string | null
  actions_taken: Array<{ step: number; action: string; completed: boolean }>
  actions_summary: string | null
  target_staff_emails: string[] | null
  scheduled_date: string | null
  completed_date: string | null
  outcome_notes: string | null
  effectiveness_score: number | null
  status: string
  created_at: string
}

/**
 * GET /api/interventions
 *
 * Query params:
 * - detail=playbooks - Get available playbooks
 * - detail=history - Get intervention history
 * - alert_id - Filter by alert ID
 */
export async function GET(request: Request) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase) {
    return auth.error
  }

  const { searchParams } = new URL(request.url)
  const detail = searchParams.get('detail')
  const alertId = searchParams.get('alert_id')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  const supabase = getSupabaseAdmin()

  try {
    // Get playbooks
    if (detail === 'playbooks') {
      const { data, error } = await supabase
        .from(Tables.interventionPlaybooks)
        .select('*')
        .eq('is_active', true)
        .order('playbook_name')

      if (error) throw error
      return NextResponse.json({ playbooks: data || [] })
    }

    // Get intervention history
    let query = supabase
      .from(Tables.interventionLogs)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (alertId) {
      query = query.eq('alert_id', alertId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ interventions: data || [] })
  } catch (error) {
    console.error('Interventions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch interventions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/interventions
 *
 * Execute an intervention
 *
 * Body:
 * - playbook_id: ID of the playbook to use
 * - alert_id: Optional alert this intervention addresses
 * - target_staff_emails: Optional list of staff to target
 * - actions_override: Optional custom actions
 * - scheduled_date: Optional date to schedule (defaults to now)
 */
export async function POST(request: Request) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error
  }

  const supabase = getSupabaseAdmin()

  try {
    const body = await request.json()
    const {
      playbook_id,
      alert_id,
      target_staff_emails,
      actions_override,
      scheduled_date,
      notes,
    } = body

    // Get playbook if specified
    let playbook: Playbook | null = null
    let actions: Array<{ step: number; action: string; completed: boolean }> = []
    let interventionType = 'CUSTOM'

    if (playbook_id) {
      const { data, error } = await supabase
        .from(Tables.interventionPlaybooks)
        .select('*')
        .eq('id', playbook_id)
        .single()

      if (error) throw error
      playbook = data as Playbook

      interventionType = playbook.playbook_name.toUpperCase().replace(/\s+/g, '_')
      actions = (playbook.actions || []).map((a) => ({
        step: a.step,
        action: a.action,
        completed: false,
      }))
    }

    // Use override actions if provided
    if (actions_override && Array.isArray(actions_override)) {
      actions = actions_override.map((a, idx) => ({
        step: idx + 1,
        action: typeof a === 'string' ? a : a.action,
        completed: false,
      }))
    }

    // Get current metrics snapshot for before comparison
    // This would be populated from analytics service
    const metricsBefore = {
      timestamp: new Date().toISOString(),
      // Additional metrics would be populated here
    }

    // Create intervention log
    const { data: intervention, error: insertError } = await supabase
      .from(Tables.interventionLogs)
      .insert({
        alert_id: alert_id || null,
        intervention_type: interventionType,
        playbook_used: playbook?.playbook_name || null,
        actions_taken: actions,
        actions_summary: notes || null,
        target_staff_emails: target_staff_emails || null,
        scheduled_date: scheduled_date || new Date().toISOString().split('T')[0],
        status: 'PENDING',
        metrics_before: metricsBefore,
        created_by: auth.user.id,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Update alert status if linked
    if (alert_id) {
      await supabase
        .from(Tables.alertHistory)
        .update({
          intervention_id: intervention.id,
          status: 'ACKNOWLEDGED',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: auth.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alert_id)
    }

    return NextResponse.json({
      success: true,
      message: 'Intervention created successfully',
      intervention,
    })
  } catch (error) {
    console.error('Create intervention error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create intervention' },
      { status: 500 }
    )
  }
}
