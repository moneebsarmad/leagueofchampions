import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/auth/adminCheck'
import {
  getLevelBInterventionById,
  updateLevelBStep,
  startLevelBMonitoring,
  logDailySuccessRate,
  completeLevelBMonitoring,
} from '@/backend/services/levelBService'
import type { UpdateLevelBStepRequest, MonitoringMethod } from '@/types/interventions'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/interventions/level-b/[id]
 * Get a single Level B intervention
 * Admin only
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

    const { id } = await context.params

    const intervention = await getLevelBInterventionById(id)

    if (!intervention) {
      return NextResponse.json(
        { success: false, error: 'Intervention not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: intervention,
    })
  } catch (error) {
    console.error('Error fetching Level B intervention:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch intervention' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/interventions/level-b/[id]
 * Update a Level B intervention (step progress, monitoring, completion)
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

    // Determine action type
    const action = body.action as string

    switch (action) {
      case 'update_step': {
        const stepRequest: UpdateLevelBStepRequest = {
          step: body.step,
          data: body.data,
        }
        const intervention = await updateLevelBStep(id, stepRequest)
        return NextResponse.json({
          success: true,
          data: intervention,
        })
      }

      case 'start_monitoring': {
        const monitoringMethod = body.monitoring_method as MonitoringMethod
        if (!monitoringMethod) {
          return NextResponse.json(
            { success: false, error: 'monitoring_method is required' },
            { status: 400 }
          )
        }
        const intervention = await startLevelBMonitoring(id, monitoringMethod)
        return NextResponse.json({
          success: true,
          data: intervention,
        })
      }

      case 'log_daily_rate': {
        const date = body.date as string
        const successRate = body.success_rate as number
        if (!date || successRate === undefined) {
          return NextResponse.json(
            { success: false, error: 'date and success_rate are required' },
            { status: 400 }
          )
        }
        const intervention = await logDailySuccessRate(id, date, successRate)
        return NextResponse.json({
          success: true,
          data: intervention,
        })
      }

      case 'complete_monitoring': {
        const result = await completeLevelBMonitoring(id, body.notes)
        return NextResponse.json({
          success: true,
          data: result.intervention,
          should_escalate: result.shouldEscalate,
          message: result.shouldEscalate
            ? 'Monitoring completed. Student did not meet success threshold. Consider escalating to Level C.'
            : 'Monitoring completed successfully. Student met the 80% success threshold.',
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: update_step, start_monitoring, log_daily_rate, or complete_monitoring' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error updating Level B intervention:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update intervention' },
      { status: 500 }
    )
  }
}
