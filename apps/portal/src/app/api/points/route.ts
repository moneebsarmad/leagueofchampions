import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const {
      student_name,
      student_id,
      grade,
      section,
      house,
      r,
      subcategory,
      points,
      notes,
      date_of_event,
    } = body

    // Validate required fields
    if (!student_name || !r || !subcategory || !points) {
      return NextResponse.json(
        { error: 'Missing required fields: student_name, r, subcategory, points' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get staff name from user metadata or email
    const staffName = user.user_metadata?.staff_name ||
                      user.user_metadata?.full_name ||
                      user.email?.split('@')[0] ||
                      'Unknown Staff'

    // Insert into merit_log
    const { data, error } = await supabase
      .from('merit_log')
      .insert({
        student_name,
        student_id: student_id || null,
        grade: grade ? parseInt(grade) : null,
        section: section || null,
        house: house || null,
        r,
        subcategory,
        points: parseInt(points),
        notes: notes || null,
        date_of_event: date_of_event || new Date().toISOString().split('T')[0],
        staff_name: staffName,
        staff_id: user.id,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Merit log insert error:', error)
      return NextResponse.json(
        { error: `Failed to add points: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: `${points} points awarded to ${student_name}`
    })
  } catch (error) {
    console.error('Points API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const student_name = searchParams.get('student_name')
    const staff_name = searchParams.get('staff_name')
    const house = searchParams.get('house')
    const grade = searchParams.get('grade')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')

    let query = supabase
      .from('merit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (student_name) query = query.eq('student_name', student_name)
    if (staff_name) query = query.eq('staff_name', staff_name)
    if (house) query = query.eq('house', house)
    if (grade) query = query.eq('grade', parseInt(grade))
    if (startDate) query = query.gte('date_of_event', startDate)
    if (endDate) query = query.lte('date_of_event', endDate)

    const { data, error } = await query

    if (error) {
      console.error('Merit log query error:', error)
      return NextResponse.json(
        { error: `Failed to fetch points: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('Points API GET error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
