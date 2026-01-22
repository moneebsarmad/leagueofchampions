import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/adminCheck'

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin && adminCheck.error) {
      return adminCheck.error
    }

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const limitParam = Number(searchParams.get('limit') || '10')
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10

    if (!search) {
      return NextResponse.json({ success: true, data: [] })
    }

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('students')
      .select('student_id, student_name, grade, section, house')
      .ilike('student_name', `%${search}%`)
      .order('student_name', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error searching students:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to search students' },
        { status: 500 }
      )
    }

    const students = (data || []).map((student) => ({
      id: student.student_id,
      student_name: student.student_name,
      grade: student.grade,
      section: student.section,
      house: student.house,
    }))

    return NextResponse.json({ success: true, data: students })
  } catch (error) {
    console.error('Error searching students:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search students' },
      { status: 500 }
    )
  }
}
