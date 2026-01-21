import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/auth/adminCheck'
import {
  createReentryProtocol,
  getReentryProtocols,
  getPendingReentries,
  getActiveReentries,
} from '@/backend/services/reentryService'
import type { CreateReentryRequest, ReentrySourceType } from '@/types/interventions'

/**
 * GET /api/interventions/reentry
 * List re-entry protocols with optional filters
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
    const source_type = searchParams.get('source_type') as ReentrySourceType | undefined
    const status = searchParams.get('status') ?? undefined
    const pending = searchParams.get('pending') === 'true'
    const active = searchParams.get('active') === 'true'
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    if (pending) {
      const data = await getPendingReentries()
      return NextResponse.json({
        success: true,
        data,
        count: data.length,
      })
    }

    if (active) {
      const data = await getActiveReentries()
      return NextResponse.json({
        success: true,
        data,
        count: data.length,
      })
    }

    const { data, count } = await getReentryProtocols({
      student_id,
      source_type,
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
    console.error('Error fetching re-entry protocols:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch protocols' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/interventions/reentry
 * Create a new re-entry protocol
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

    const body = (await request.json()) as CreateReentryRequest

    // Validate required fields
    if (!body.student_id || !body.source_type || !body.reentry_date || !body.monitoring_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: student_id, source_type, reentry_date, monitoring_type',
        },
        { status: 400 }
      )
    }

    const protocol = await createReentryProtocol(body)

    return NextResponse.json({
      success: true,
      data: protocol,
    })
  } catch (error) {
    console.error('Error creating re-entry protocol:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create protocol' },
      { status: 500 }
    )
  }
}
