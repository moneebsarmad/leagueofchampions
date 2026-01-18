import { NextResponse } from 'next/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/interventions/[id]
 *
 * Get a specific intervention
 */
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase) {
    return auth.error
  }

  const { id } = await params
  const supabase = getSupabaseAdmin()

  try {
    const { data, error } = await supabase
      .from(Tables.interventionLogs)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Intervention not found' }, { status: 404 })
    }

    return NextResponse.json({ intervention: data })
  } catch (error) {
    console.error('Get intervention error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get intervention' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/interventions/[id]
 *
 * Update an intervention
 *
 * Body:
 * - status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
 * - actions_taken: Updated actions list with completion status
 * - outcome_notes: Notes about the outcome
 * - effectiveness_score: 1-10 rating
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase) {
    return auth.error
  }

  const { id } = await params
  const supabase = getSupabaseAdmin()

  try {
    const body = await request.json()
    const { status, actions_taken, outcome_notes, effectiveness_score } = body

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status) {
      updates.status = status
      if (status === 'COMPLETED') {
        updates.completed_date = new Date().toISOString().split('T')[0]
        // TODO: Capture metrics_after for comparison
      }
    }

    if (actions_taken) {
      updates.actions_taken = actions_taken
    }

    if (outcome_notes !== undefined) {
      updates.outcome_notes = outcome_notes
    }

    if (effectiveness_score !== undefined) {
      if (effectiveness_score < 1 || effectiveness_score > 10) {
        return NextResponse.json(
          { error: 'Effectiveness score must be between 1 and 10' },
          { status: 400 }
        )
      }
      updates.effectiveness_score = effectiveness_score
    }

    const { data, error } = await supabase
      .from(Tables.interventionLogs)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If intervention is completed and linked to an alert, resolve the alert
    if (status === 'COMPLETED' && data.alert_id) {
      await supabase
        .from(Tables.alertHistory)
        .update({
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
          resolution_notes: outcome_notes || 'Resolved via intervention',
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.alert_id)
    }

    return NextResponse.json({
      success: true,
      message: 'Intervention updated successfully',
      intervention: data,
    })
  } catch (error) {
    console.error('Update intervention error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update intervention' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/interventions/[id]
 *
 * Cancel an intervention (soft delete - sets status to CANCELLED)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase) {
    return auth.error
  }

  const { id } = await params
  const supabase = getSupabaseAdmin()

  try {
    const { data, error } = await supabase
      .from(Tables.interventionLogs)
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Intervention cancelled',
      intervention: data,
    })
  } catch (error) {
    console.error('Cancel intervention error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel intervention' },
      { status: 500 }
    )
  }
}
