import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Constants
const MIN_NOTES_CHARS = 10
const CYCLE_LENGTH_DAYS = 14

// Status thresholds
const THRESHOLDS = {
  participationRate: { green: 70, yellow: 50 },
  avgActiveDays: { green: 4, yellow: 2 },
  huddlesCount: { green: 3, yellow: 2 },
  coverageGap: { green: 20, yellow: 40 }, // lower is better
  otherNotesCompliance: { green: 85, yellow: 70 },
  rosterIssues: { green: 0, yellow: 5 }, // lower is better
  decisionsLogged: { green: 3, yellow: 2 },
  overdueActions: { green: 1, yellow: 3 }, // lower is better
}

type Status = 'green' | 'yellow' | 'red'

function getStatus(value: number, thresholds: { green: number; yellow: number }, lowerIsBetter = false): Status {
  if (lowerIsBetter) {
    if (value <= thresholds.green) return 'green'
    if (value <= thresholds.yellow) return 'yellow'
    return 'red'
  }
  if (value >= thresholds.green) return 'green'
  if (value >= thresholds.yellow) return 'yellow'
  return 'red'
}

function getOutcomeStatus(statuses: Status[]): Status {
  if (statuses.includes('red')) return 'red'
  if (statuses.includes('yellow')) return 'yellow'
  return 'green'
}

function getLast4CycleEndDates(): string[] {
  const dates: string[] = []
  const today = new Date()

  // Find the most recent cycle end (Sunday)
  const daysSinceSunday = today.getDay()
  const lastSunday = new Date(today)
  lastSunday.setDate(today.getDate() - daysSinceSunday)

  // Get last 4 cycle end dates (every 14 days)
  for (let i = 0; i < 4; i++) {
    const cycleEnd = new Date(lastSunday)
    cycleEnd.setDate(lastSunday.getDate() - (i * CYCLE_LENGTH_DAYS))
    dates.push(cycleEnd.toISOString().split('T')[0])
  }

  return dates
}

function isWeekday(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

function getUniqueWeekdays(dates: string[]): number {
  const uniqueDays = new Set<string>()
  dates.forEach(d => {
    const date = new Date(d)
    if (isWeekday(date)) {
      uniqueDays.add(d)
    }
  })
  return uniqueDays.size
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    // Check for detail queries
    const detail = searchParams.get('detail')
    const actionMenu = searchParams.get('actionMenu')

    // Filters
    const house = searchParams.get('house') || ''
    const grade = searchParams.get('grade') || ''
    const section = searchParams.get('section') || ''
    const staff = searchParams.get('staff') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    // Handle action menu request
    if (actionMenu === '1') {
      const { data, error } = await supabase
        .from('action_menu')
        .select('*')
        .order('id')

      if (error) {
        // Table might not exist yet
        return NextResponse.json({ items: [] })
      }

      return NextResponse.json({ items: data || [] })
    }

    // Handle detail: roster
    if (detail === 'roster') {
      // Get staff roster
      const { data: staffData } = await supabase.from('staff').select('*')
      const staffList = staffData || []

      // Get merit log staff names
      let meritQuery = supabase.from('merit_log').select('staff_name')
      if (startDate) meritQuery = meritQuery.gte('date_of_event', startDate)
      if (endDate) meritQuery = meritQuery.lte('date_of_event', endDate)

      const { data: meritData } = await meritQuery
      const meritStaffNames = new Set((meritData || []).map(m => m.staff_name?.toLowerCase()).filter(Boolean))

      // Find unknown staff (in merit_log but not in staff table)
      const knownStaffNames = new Set(staffList.map(s => s.staff_name?.toLowerCase()).filter(Boolean))
      const unknownStaff = [...meritStaffNames].filter(name => !knownStaffNames.has(name))

      // Find staff missing house or grade
      const missingHouse = staffList.filter(s => !s.house || s.house.trim() === '')
      const missingGrade = staffList.filter(s => !s.grade_level && !s.subject)

      return NextResponse.json({
        unknownStaff: unknownStaff.map(name => ({ staff_name: name })),
        missingHouse: missingHouse.map(s => ({ staff_name: s.staff_name, email: s.email })),
        missingGrade: missingGrade.map(s => ({ staff_name: s.staff_name, email: s.email })),
        totalIssues: unknownStaff.length + missingHouse.length + missingGrade.length,
      })
    }

    // Handle detail: other-missing-notes
    if (detail === 'other-missing-notes') {
      let query = supabase
        .from('merit_log')
        .select('*')
        .or('r.ilike.%other%,subcategory.ilike.%other%')

      if (startDate) query = query.gte('date_of_event', startDate)
      if (endDate) query = query.lte('date_of_event', endDate)
      if (house) query = query.eq('house', house)
      if (grade) query = query.eq('grade', parseInt(grade))
      if (section) query = query.eq('section', section)
      if (staff) query = query.eq('staff_name', staff)

      const { data } = await query
      const entries = data || []

      const missingNotes = entries.filter(e => !e.notes || e.notes.length < MIN_NOTES_CHARS)

      return NextResponse.json({
        entries: missingNotes.map(e => ({
          id: e.id,
          staff_name: e.staff_name,
          student_name: e.student_name,
          r: e.r,
          subcategory: e.subcategory,
          notes: e.notes || '',
          date_of_event: e.date_of_event,
        })),
        totalMissing: missingNotes.length,
        totalOther: entries.length,
      })
    }

    // Main metrics calculation
    // 1. Get staff roster
    let staffQuery = supabase.from('staff').select('*')
    if (house) staffQuery = staffQuery.eq('house', house)
    const { data: staffData } = await staffQuery
    const eligibleStaff = (staffData || []).length

    // 2. Get merit log entries in date range
    let meritQuery = supabase.from('merit_log').select('*')
    if (startDate) meritQuery = meritQuery.gte('date_of_event', startDate)
    if (endDate) meritQuery = meritQuery.lte('date_of_event', endDate)
    if (house) meritQuery = meritQuery.eq('house', house)
    if (grade) meritQuery = meritQuery.eq('grade', parseInt(grade))
    if (section) meritQuery = meritQuery.eq('section', section)
    if (staff) meritQuery = meritQuery.eq('staff_name', staff)

    const { data: meritData } = await meritQuery
    const meritEntries = meritData || []

    // Calculate active staff and their dates
    const staffDatesMap = new Map<string, string[]>()
    meritEntries.forEach(entry => {
      const staffName = entry.staff_name?.toLowerCase()
      if (!staffName) return

      if (!staffDatesMap.has(staffName)) {
        staffDatesMap.set(staffName, [])
      }
      if (entry.date_of_event) {
        staffDatesMap.get(staffName)!.push(entry.date_of_event)
      }
    })

    const activeStaff = staffDatesMap.size

    // Calculate average active days per staff
    let totalActiveDays = 0
    staffDatesMap.forEach(dates => {
      totalActiveDays += getUniqueWeekdays(dates)
    })
    const avgActiveDays = activeStaff > 0 ? totalActiveDays / activeStaff : 0

    // Participation rate and coverage gap
    const participationRate = eligibleStaff > 0 ? (activeStaff / eligibleStaff) * 100 : 0
    const coverageGap = 100 - participationRate

    // 3. Get huddle count (last 4 cycles)
    const cycleEndDates = getLast4CycleEndDates()
    let huddlesCount = 0
    try {
      const { data: huddleData, error: huddleError } = await supabase
        .from('huddle_log')
        .select('*')
        .in('cycle_end_date', cycleEndDates)

      if (!huddleError) {
        huddlesCount = (huddleData || []).length
      }
    } catch {
      // Table might not exist
    }

    // 4. Get decisions logged (last 4 cycles)
    let decisionsLogged = 0
    let overdueActions = 0
    try {
      const { data: decisionData, error: decisionError } = await supabase
        .from('decision_log')
        .select('*')
        .in('cycle_end_date', cycleEndDates)

      if (!decisionError) {
        decisionsLogged = (decisionData || []).length
      }

      // Get overdue actions
      const today = new Date().toISOString().split('T')[0]
      const { data: overdueData, error: overdueError } = await supabase
        .from('decision_log')
        .select('*')
        .lt('due_date', today)
        .neq('status', 'Completed')

      if (!overdueError) {
        overdueActions = (overdueData || []).length
      }
    } catch {
      // Table might not exist
    }

    // 5. Other notes compliance
    const otherEntries = meritEntries.filter(e =>
      e.r?.toLowerCase().includes('other') ||
      e.subcategory?.toLowerCase().includes('other')
    )
    const otherWithNotes = otherEntries.filter(e => e.notes && e.notes.length >= MIN_NOTES_CHARS)
    const otherNotesCompliance = otherEntries.length > 0
      ? (otherWithNotes.length / otherEntries.length) * 100
      : 100

    // 6. Roster issues
    const knownStaffNames = new Set((staffData || []).map(s => s.staff_name?.toLowerCase()).filter(Boolean))
    const meritStaffNames = new Set(meritEntries.map(m => m.staff_name?.toLowerCase()).filter(Boolean))
    const unknownStaffCount = [...meritStaffNames].filter(name => !knownStaffNames.has(name)).length
    const missingHouseCount = (staffData || []).filter(s => !s.house || s.house.trim() === '').length
    const missingGradeCount = (staffData || []).filter(s => !s.grade_level && !s.subject).length
    const rosterIssues = unknownStaffCount + missingHouseCount + missingGradeCount

    // Calculate statuses
    const participationRateStatus = getStatus(participationRate, THRESHOLDS.participationRate)
    const avgActiveDaysStatus = getStatus(avgActiveDays, THRESHOLDS.avgActiveDays)
    const huddlesCountStatus = getStatus(huddlesCount, THRESHOLDS.huddlesCount)
    const coverageGapStatus = getStatus(coverageGap, THRESHOLDS.coverageGap, true)
    const otherNotesComplianceStatus = getStatus(otherNotesCompliance, THRESHOLDS.otherNotesCompliance)
    const rosterIssuesStatus = getStatus(rosterIssues, THRESHOLDS.rosterIssues, true)
    const decisionsLoggedStatus = getStatus(decisionsLogged, THRESHOLDS.decisionsLogged)
    const overdueActionsStatus = getStatus(overdueActions, THRESHOLDS.overdueActions, true)

    // Calculate outcome statuses
    const outcomeA = getOutcomeStatus([participationRateStatus, avgActiveDaysStatus])
    const outcomeB = getOutcomeStatus([huddlesCountStatus, coverageGapStatus])
    const outcomeC = getOutcomeStatus([otherNotesComplianceStatus, rosterIssuesStatus])
    const outcomeD = getOutcomeStatus([decisionsLoggedStatus, overdueActionsStatus])

    // Recommended actions
    const recommendedActions: string[] = []
    if (outcomeA === 'red') recommendedActions.push('Schedule participation reset meeting')
    if (outcomeB === 'red') recommendedActions.push('Reset huddle cadence')
    if (outcomeC === 'red') recommendedActions.push('Initiate data hygiene cleanup')
    if (outcomeD === 'red') recommendedActions.push('Review action logging process')

    return NextResponse.json({
      metrics: {
        participationRate: {
          value: Math.round(participationRate * 10) / 10,
          status: participationRateStatus,
          eligible: eligibleStaff,
          active: activeStaff,
        },
        avgActiveDays: {
          value: Math.round(avgActiveDays * 10) / 10,
          status: avgActiveDaysStatus,
        },
        huddlesCount: {
          value: huddlesCount,
          status: huddlesCountStatus,
        },
        coverageGap: {
          value: Math.round(coverageGap * 10) / 10,
          status: coverageGapStatus,
        },
        otherNotesCompliance: {
          value: Math.round(otherNotesCompliance * 10) / 10,
          status: otherNotesComplianceStatus,
          total: otherEntries.length,
          compliant: otherWithNotes.length,
        },
        rosterIssues: {
          value: rosterIssues,
          status: rosterIssuesStatus,
          unknown: unknownStaffCount,
          missingHouse: missingHouseCount,
          missingGrade: missingGradeCount,
        },
        decisionsLogged: {
          value: decisionsLogged,
          status: decisionsLoggedStatus,
        },
        overdueActions: {
          value: overdueActions,
          status: overdueActionsStatus,
        },
      },
      outcomes: {
        A: { name: 'Adoption', status: outcomeA },
        B: { name: 'Consistency', status: outcomeB },
        C: { name: 'Governance', status: outcomeC },
        D: { name: 'Insight & Action', status: outcomeD },
      },
      recommendedActions,
      dateRange: { startDate, endDate },
      cycleEndDates,
    })
  } catch (error) {
    console.error('Implementation health error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate implementation health metrics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const { type } = body

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (type === 'huddle') {
      const { cycle_end_date, notes } = body

      if (!cycle_end_date) {
        return NextResponse.json(
          { error: 'cycle_end_date is required' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('huddle_log')
        .insert({
          cycle_end_date,
          notes: notes || '',
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) {
        console.error('Huddle insert error:', error)
        return NextResponse.json(
          { error: 'Failed to log huddle. Make sure the huddle_log table exists.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data })
    }

    if (type === 'decision') {
      const {
        owner,
        due_date,
        action_type,
        cycle_end_date,
        status = 'Pending',
        title,
        outcome_tag,
        notes,
        selected_actions
      } = body

      if (!cycle_end_date || !title) {
        return NextResponse.json(
          { error: 'cycle_end_date and title are required' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('decision_log')
        .insert({
          cycle_end_date,
          due_date,
          status,
          owner,
          action_type,
          title,
          outcome_tag,
          notes,
          selected_actions,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) {
        console.error('Decision insert error:', error)
        return NextResponse.json(
          { error: 'Failed to log decision. Make sure the decision_log table exists.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json(
      { error: 'Invalid type. Must be "huddle" or "decision"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Implementation health POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
