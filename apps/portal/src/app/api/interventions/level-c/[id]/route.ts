import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/adminCheck'
import {
  getLevelCCaseById,
  assignCaseManager,
  updateContextPacket,
  recordAdminResponse,
  createReentryPlan,
  startCaseMonitoring,
  logDailyCheckIn,
  closeCase,
} from '@/backend/services/levelCService'
import type { AdminResponseType, RepairAction, ReadinessChecklistItem, DailyCheckIn } from '@/types/interventions'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/interventions/level-c/[id]
 * Get a single Level C case
 * Admin only
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

    const { id } = await context.params

    const levelCCase = await getLevelCCaseById(id)

    if (!levelCCase) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: levelCCase,
    })
  } catch (error) {
    console.error('Error fetching Level C case:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch case' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/interventions/level-c/[id]
 * Update a Level C case (various actions)
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
      case 'assign_case_manager': {
        const supabase = await createSupabaseServerClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
          )
        }

        const { data: staffRecord } = await supabase
          .from('staff')
          .select('staff_name')
          .eq('email', user.email)
          .single()

        const staffName = staffRecord?.staff_name ?? user.email ?? 'Unknown'

        const caseManagerId = body.case_manager_id ?? user.id
        const caseManagerName = body.case_manager_name ?? staffName

        const updated = await assignCaseManager(id, caseManagerId, caseManagerName)
        return NextResponse.json({ success: true, data: updated })
      }

      case 'update_context_packet': {
        const updated = await updateContextPacket(id, {
          incident_summary: body.incident_summary,
          pattern_review: body.pattern_review,
          environmental_factors: body.environmental_factors,
          prior_interventions_summary: body.prior_interventions_summary,
        })
        return NextResponse.json({ success: true, data: updated })
      }

      case 'record_admin_response': {
        if (!body.admin_response_type) {
          return NextResponse.json(
            { success: false, error: 'admin_response_type is required' },
            { status: 400 }
          )
        }
        const updated = await recordAdminResponse(id, {
          admin_response_type: body.admin_response_type as AdminResponseType,
          admin_response_details: body.admin_response_details,
          consequence_start_date: body.consequence_start_date,
          consequence_end_date: body.consequence_end_date,
        })
        return NextResponse.json({ success: true, data: updated })
      }

      case 'create_reentry_plan': {
        if (!body.support_plan_goal || !body.reentry_date || !body.reentry_type) {
          return NextResponse.json(
            { success: false, error: 'support_plan_goal, reentry_date, and reentry_type are required' },
            { status: 400 }
          )
        }
        const updated = await createReentryPlan(id, {
          support_plan_goal: body.support_plan_goal,
          support_plan_strategies: body.support_plan_strategies ?? [],
          adult_mentor_id: body.adult_mentor_id,
          adult_mentor_name: body.adult_mentor_name,
          repair_actions: (body.repair_actions ?? []) as RepairAction[],
          reentry_date: body.reentry_date,
          reentry_type: body.reentry_type,
          reentry_restrictions: body.reentry_restrictions,
          reentry_checklist: body.reentry_checklist as ReadinessChecklistItem[],
        })
        return NextResponse.json({ success: true, data: updated })
      }

      case 'start_monitoring': {
        const updated = await startCaseMonitoring(id)
        return NextResponse.json({ success: true, data: updated })
      }

      case 'log_check_in': {
        if (!body.check_in) {
          return NextResponse.json(
            { success: false, error: 'check_in data is required' },
            { status: 400 }
          )
        }
        const updated = await logDailyCheckIn(id, body.check_in as DailyCheckIn)
        return NextResponse.json({ success: true, data: updated })
      }

      case 'close_case': {
        if (!body.outcome_status) {
          return NextResponse.json(
            { success: false, error: 'outcome_status is required' },
            { status: 400 }
          )
        }
        const updated = await closeCase(id, {
          outcome_status: body.outcome_status,
          outcome_notes: body.outcome_notes,
          closure_criteria: body.closure_criteria,
        })
        return NextResponse.json({ success: true, data: updated })
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid action. Use: assign_case_manager, update_context_packet, record_admin_response, create_reentry_plan, start_monitoring, log_check_in, or close_case',
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error updating Level C case:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update case' },
      { status: 500 }
    )
  }
}
