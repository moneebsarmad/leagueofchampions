import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/adminCheck'
import {
  getReentryProtocolById,
  updateReadinessChecklist,
  generateTeacherScript,
  startReentry,
  completeFirstRep,
  logDailyEntry,
  completeReentry,
} from '@/backend/services/reentryService'
import type { ReadinessChecklistItem, DailyLog } from '@/types/interventions'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/interventions/reentry/[id]
 * Get a single re-entry protocol
 * Admin only
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

    const { id } = await context.params

    const protocol = await getReentryProtocolById(id)

    if (!protocol) {
      return NextResponse.json(
        { success: false, error: 'Protocol not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: protocol,
    })
  } catch (error) {
    console.error('Error fetching re-entry protocol:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch protocol' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/interventions/reentry/[id]
 * Update a re-entry protocol (various actions)
 * Admin only
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

    const { id } = await context.params
    const body = await request.json()
    const action = body.action as string

    switch (action) {
      case 'update_checklist': {
        const supabase = await createSupabaseServerClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!body.checklist) {
          return NextResponse.json(
            { success: false, error: 'checklist is required' },
            { status: 400 }
          )
        }
        const updated = await updateReadinessChecklist(
          id,
          body.checklist as ReadinessChecklistItem[],
          user?.id
        )
        return NextResponse.json({ success: true, data: updated })
      }

      case 'generate_script': {
        if (!body.reset_goal) {
          return NextResponse.json(
            { success: false, error: 'reset_goal is required' },
            { status: 400 }
          )
        }
        const updated = await generateTeacherScript(id, body.reset_goal)
        return NextResponse.json({ success: true, data: updated })
      }

      case 'start_reentry': {
        const updated = await startReentry(id)
        return NextResponse.json({ success: true, data: updated })
      }

      case 'complete_first_rep': {
        const updated = await completeFirstRep(id)
        return NextResponse.json({ success: true, data: updated })
      }

      case 'log_daily': {
        const supabase = await createSupabaseServerClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!body.notes) {
          return NextResponse.json(
            { success: false, error: 'notes is required' },
            { status: 400 }
          )
        }

        const log: DailyLog = {
          date: body.date ?? new Date().toISOString().split('T')[0],
          notes: body.notes,
          success_indicators: body.success_indicators ?? [],
          concerns: body.concerns ?? [],
          logged_by: user?.email ?? 'Unknown',
          logged_at: new Date().toISOString(),
        }

        const updated = await logDailyEntry(id, log)
        return NextResponse.json({ success: true, data: updated })
      }

      case 'complete': {
        if (!body.outcome) {
          return NextResponse.json(
            { success: false, error: 'outcome is required (success, partial, escalated)' },
            { status: 400 }
          )
        }
        const updated = await completeReentry(id, body.outcome, body.notes)
        return NextResponse.json({ success: true, data: updated })
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid action. Use: update_checklist, generate_script, start_reentry, complete_first_rep, log_daily, or complete',
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error updating re-entry protocol:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update protocol' },
      { status: 500 }
    )
  }
}
