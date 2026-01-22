import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/adminCheck'
import {
  createLevelBIntervention,
  getLevelBInterventions,
  getActiveMonitoringInterventions,
} from '@/backend/services/levelBService'
import type { CreateLevelBRequest, LevelBStatus } from '@/types/interventions'

/**
 * GET /api/interventions/level-b
 * List Level B interventions with optional filters
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

    const { searchParams } = new URL(request.url)

    const student_id = searchParams.get('student_id') ?? undefined
    const domain_id = searchParams.get('domain_id')
      ? parseInt(searchParams.get('domain_id')!)
      : undefined
    const staff_id = searchParams.get('staff_id') ?? undefined
    const status = searchParams.get('status') as LevelBStatus | undefined
    const active_monitoring = searchParams.get('active_monitoring') === 'true'
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    if (active_monitoring) {
      const data = await getActiveMonitoringInterventions()
      return NextResponse.json({
        success: true,
        data,
        count: data.length,
      })
    }

    const { data, count } = await getLevelBInterventions({
      student_id,
      domain_id,
      staff_id,
      status,
      limit,
      offset,
    })

    return NextResponse.json({
      success: true,
      data,
      count,
      pagination: {
        limit,
        offset,
        total: count,
      },
    })
  } catch (error) {
    console.error('Error fetching Level B interventions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch interventions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/interventions/level-b
 * Create a new Level B intervention
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

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

    // Get staff name
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('staff_name')
      .eq('email', user.email)
      .single()

    const staffName = staffRecord?.staff_name ?? user.email ?? 'Unknown Staff'

    const body = (await request.json()) as CreateLevelBRequest

    // Validate required fields
    if (!body.student_id || !body.domain_id || !body.escalation_trigger) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: student_id, domain_id, escalation_trigger',
        },
        { status: 400 }
      )
    }

    const intervention = await createLevelBIntervention(body, user.id, staffName)

    return NextResponse.json({
      success: true,
      data: intervention,
    })
  } catch (error) {
    console.error('Error creating Level B intervention:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create intervention' },
      { status: 500 }
    )
  }
}
