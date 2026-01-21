import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/adminCheck'
import {
  createLevelCCase,
  getLevelCCases,
  getCaseManagerCaseload,
  getPendingReentries,
} from '@/backend/services/levelCService'
import type { CreateLevelCRequest, LevelCStatus } from '@/types/interventions'

/**
 * GET /api/interventions/level-c
 * List Level C cases with optional filters
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
    const case_manager_id = searchParams.get('case_manager_id') ?? undefined
    const status = searchParams.get('status') as LevelCStatus | undefined
    const my_caseload = searchParams.get('my_caseload') === 'true'
    const pending_reentries = searchParams.get('pending_reentries') === 'true'
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    // Get pending re-entries
    if (pending_reentries) {
      const data = await getPendingReentries()
      return NextResponse.json({
        success: true,
        data,
        count: data.length,
      })
    }

    // Get case manager's caseload
    if (my_caseload) {
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

      const data = await getCaseManagerCaseload(user.id)
      return NextResponse.json({
        success: true,
        data,
        count: data.length,
      })
    }

    const { data, count } = await getLevelCCases({
      student_id,
      case_manager_id,
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
    console.error('Error fetching Level C cases:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cases' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/interventions/level-c
 * Create a new Level C case
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

    // Check if user is case manager or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Get user's name for case manager assignment
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('staff_name')
      .eq('email', user.email)
      .single()

    const staffName = staffRecord?.staff_name ?? user.email ?? 'Unknown'

    const body = (await request.json()) as CreateLevelCRequest

    // Validate required fields
    if (!body.student_id || !body.trigger_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: student_id, trigger_type',
        },
        { status: 400 }
      )
    }

    // Auto-assign current user as case manager if admin
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
    const caseManagerId = isAdmin ? user.id : undefined
    const caseManagerName = isAdmin ? staffName : undefined

    const levelCCase = await createLevelCCase(body, caseManagerId, caseManagerName)

    return NextResponse.json({
      success: true,
      data: levelCCase,
    })
  } catch (error) {
    console.error('Error creating Level C case:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create case' },
      { status: 500 }
    )
  }
}
