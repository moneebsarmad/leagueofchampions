import { NextResponse } from 'next/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'
import {
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
} from '@/backend/services/alertEngine'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/alerts/[id]
 *
 * Get a specific alert by ID
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
      .from(Tables.alertHistory)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    return NextResponse.json({ alert: data })
  } catch (error) {
    console.error('Get alert error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get alert' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/alerts/[id]
 *
 * Update an alert (acknowledge, resolve, dismiss)
 * Body: { action: 'acknowledge' | 'resolve' | 'dismiss', resolutionNotes?: string }
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireRole(RoleSets.admin)
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { action, resolutionNotes } = body

    let success = false

    switch (action) {
      case 'acknowledge':
        success = await acknowledgeAlert(id, auth.user.id)
        break
      case 'resolve':
        success = await resolveAlert(id, auth.user.id, resolutionNotes)
        break
      case 'dismiss':
        success = await dismissAlert(id)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!success) {
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
    }

    // Fetch and return updated alert
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from(Tables.alertHistory)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    return NextResponse.json({
      message: `Alert ${action}d successfully`,
      alert: data,
    })
  } catch (error) {
    console.error('Update alert error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update alert' },
      { status: 500 }
    )
  }
}
