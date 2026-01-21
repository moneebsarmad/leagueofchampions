import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/adminCheck'
import {
  createLevelAIntervention,
  getLevelAInterventions,
  getTodaysLevelAInterventions,
} from '@/backend/services/levelAService'
import {
  determineInterventionLevel,
  getEscalationSummary,
} from '@/backend/services/decisionTreeEngine'
import type { CreateLevelARequest, IncidentAssessment } from '@/types/interventions'

/**
 * GET /api/interventions/level-a
 * List Level A interventions with optional filters
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
    const from_date = searchParams.get('from_date') ?? undefined
    const to_date = searchParams.get('to_date') ?? undefined
    const today_only = searchParams.get('today_only') === 'true'
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    if (today_only) {
      const data = await getTodaysLevelAInterventions(staff_id)
      return NextResponse.json({
        success: true,
        data,
        count: data.length,
      })
    }

    const { data, count } = await getLevelAInterventions({
      student_id,
      domain_id,
      staff_id,
      from_date,
      to_date,
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
    console.error('Error fetching Level A interventions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch interventions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/interventions/level-a
 * Create a new Level A intervention
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get staff name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Try to get staff name from staff table
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('staff_name')
      .eq('email', user.email)
      .single()

    const staffName =
      staffRecord?.staff_name ?? profile?.full_name ?? user.email ?? 'Unknown Staff'

    const body = (await request.json()) as CreateLevelARequest

    // Validate required fields
    if (!body.student_id || !body.domain_id || !body.intervention_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: student_id, domain_id, intervention_type',
        },
        { status: 400 }
      )
    }

    const intervention = await createLevelAIntervention(body, user.id, staffName)

    return NextResponse.json({
      success: true,
      data: intervention,
    })
  } catch (error) {
    console.error('Error creating Level A intervention:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create intervention' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/interventions/level-a
 * Assess an incident to determine recommended intervention level
 * (Decision Tree endpoint)
 * Admin only
 */
export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

    const body = (await request.json()) as IncidentAssessment

    // Validate required fields
    if (!body.student_id || !body.domain_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: student_id, domain_id' },
        { status: 400 }
      )
    }

    const result = await determineInterventionLevel(body)
    const summary = getEscalationSummary(result)

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        ...summary,
      },
    })
  } catch (error) {
    console.error('Error assessing incident:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assess incident' },
      { status: 500 }
    )
  }
}
