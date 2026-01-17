import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type StudentPayload = {
  name: string
  grade: number
  section: string
  house: string
}

type AwardPayload =
  | {
      mode: 'students'
      categoryId: string
      students: StudentPayload[]
      notes?: string
      eventDate?: string
    }
  | {
      mode: 'house_competition'
      house: string
      points: number
      notes?: string
      eventDate?: string
    }

const resolveStaff = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  email: string
) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('linked_staff_id')
    .eq('id', userId)
    .maybeSingle()

  const linkedStaffId = profile?.linked_staff_id ?? null
  if (linkedStaffId) {
    const { data: staff } = await supabase
      .from('staff')
      .select('id, staff_name, email')
      .eq('id', linkedStaffId)
      .maybeSingle()

    const staffName = String(staff?.staff_name ?? '').trim()
    if (staffName) {
      return { staffId: staff?.id ?? linkedStaffId, staffName }
    }
  }

  if (email) {
    const { data: staff } = await supabase
      .from('staff')
      .select('id, staff_name')
      .ilike('email', email)
      .maybeSingle()

    const staffName = String(staff?.staff_name ?? '').trim()
    if (staffName) {
      return { staffId: staff?.id ?? null, staffName }
    }
  }

  return { staffId: null, staffName: email || (userId ? `Staff ${userId.slice(0, 8)}` : '') }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const payload = (await request.json()) as AwardPayload
    if (!payload?.mode) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
    }

    if (payload.mode === 'house_competition') {
      return NextResponse.json({ error: 'House competition awards are not supported in this demo schema.' }, { status: 400 })
    }

    if (!payload.categoryId || !Array.isArray(payload.students) || payload.students.length === 0) {
      return NextResponse.json({ error: 'Students and category are required.' }, { status: 400 })
    }

    const { data: category, error: categoryError } = await supabase
      .from('3r_categories')
      .select('id, r, subcategory, points')
      .eq('id', payload.categoryId)
      .maybeSingle()

    if (categoryError || !category) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    const staff = await resolveStaff(supabase, user.id, user.email ?? '')
    if (!staff.staffName || !staff.staffId) {
      return NextResponse.json({ error: 'Unable to resolve staff name.' }, { status: 400 })
    }

    const entries = []
    for (const student of payload.students) {
      let studentQuery = supabase
        .from('students')
        .select('student_id, student_name, grade, section, house')
        .ilike('student_name', student.name)
        .eq('grade', student.grade)

      if (student.section) {
        studentQuery = studentQuery.eq('section', student.section)
      }

      const { data: studentRow } = await studentQuery.maybeSingle()

      if (!studentRow?.student_id) {
        return NextResponse.json({ error: `Student not found: ${student.name}` }, { status: 400 })
      }

      entries.push({
        student_id: studentRow.student_id,
        staff_id: staff.staffId,
        timestamp: new Date().toISOString(),
        date_of_event: payload.eventDate || new Date().toISOString().split('T')[0],
        student_name: studentRow.student_name,
        grade: studentRow.grade,
        section: studentRow.section,
        house: studentRow.house,
        r: category.r,
        subcategory: category.subcategory,
        points: category.points,
        notes: payload.notes || '',
        staff_name: staff.staffName,
      })
    }

    const { error } = await supabase.from('merit_log').insert(entries)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ inserted: entries.length })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
