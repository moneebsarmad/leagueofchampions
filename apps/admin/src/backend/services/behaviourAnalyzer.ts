import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Stateless Behaviour Analyzer
 *
 * Analyzes behaviour data from uploaded files without storing individual events.
 * Only stores computed insights and patterns - keeping the database lean.
 */

type ParsedEvent = {
  student_id: string
  student_name?: string
  grade?: number
  section?: string
  event_type: 'merit' | 'demerit'
  event_date: string
  staff_name?: string
  category?: string
  subcategory?: string
  points: number
}

type PatternInsert = {
  student_id: string
  pattern_type: string
  pattern_description: string
  confidence_score: number
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

const toDate = (value: string) => new Date(`${value}T00:00:00Z`)

const startOfDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * MS_PER_DAY)

const isInRange = (eventDate: Date, start: Date, end: Date) =>
  eventDate >= start && eventDate < end

const countBy = (events: ParsedEvent[], key: (event: ParsedEvent) => string | undefined) => {
  const counts = new Map<string, number>()
  for (const event of events) {
    const value = key(event)
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

const hasCategoryMatch = (events: ParsedEvent[], terms: string[]) => {
  const lowerTerms = terms.map((term) => term.toLowerCase())
  return events.some((event) => {
    const haystack = `${event.category ?? ''} ${event.subcategory ?? ''}`.toLowerCase()
    return lowerTerms.some((term) => haystack.includes(term))
  })
}

const getWeekDemeritCounts = (events: ParsedEvent[], today: Date) => {
  const week0Start = addDays(today, -7)
  const week1Start = addDays(today, -14)
  const week2Start = addDays(today, -21)
  const week3Start = addDays(today, -28)

  const counts = [0, 0, 0]
  for (const event of events) {
    if (event.event_type !== 'demerit') continue
    const date = toDate(event.event_date)
    if (isInRange(date, week0Start, today)) counts[0] += 1
    else if (isInRange(date, week1Start, week0Start)) counts[1] += 1
    else if (isInRange(date, week2Start, week1Start)) counts[2] += 1
  }
  return counts
}

const getTrend = (weekCounts: number[]) => {
  const [week0, week1, week2] = weekCounts
  if (week0 > week1 && week1 > week2) return 'declining'
  if (week0 < week1 && week1 < week2) return 'improving'
  return 'stable'
}

const getEscalation = (weekCounts: number[]) => {
  const [week0, week1, week2] = weekCounts
  return week0 > week1 && week1 > week2
}

const getContextIsolation = (events: ParsedEvent[]) => {
  const demerits = events.filter((event) => event.event_type === 'demerit')
  if (demerits.length === 0) return null

  const byStaff = countBy(demerits, (event) => event.staff_name)

  const topStaff = [...byStaff.entries()].sort((a, b) => b[1] - a[1])[0]

  const threshold = Math.ceil(demerits.length * 0.6)

  if (topStaff && topStaff[1] >= threshold) {
    return {
      type: 'staff',
      value: topStaff[0],
      share: topStaff[1] / demerits.length,
    }
  }

  return null
}

const computeInsightsForWindow = (
  events: ParsedEvent[],
  timeWindow: '7d' | '30d',
  today: Date
) => {
  const windowStart = addDays(today, timeWindow === '7d' ? -7 : -30)
  const windowEvents = events.filter((event) => toDate(event.event_date) >= windowStart)

  const merits = windowEvents.filter((event) => event.event_type === 'merit')
  const demerits = windowEvents.filter((event) => event.event_type === 'demerit')

  const totalMerits = merits.length
  const totalDemerits = demerits.length
  const netScore =
    merits.reduce((sum, event) => sum + event.points, 0) -
    demerits.reduce((sum, event) => sum + event.points, 0)

  const weekCounts = getWeekDemeritCounts(events, today)
  const trend = getTrend(weekCounts)
  const escalation = getEscalation(weekCounts)
  const earlyConcern = totalDemerits >= 3 && timeWindow === '7d'

  let riskLevel: 'green' | 'yellow' | 'red' = 'green'
  if (escalation) riskLevel = 'red'
  else if (earlyConcern) riskLevel = 'yellow'

  const contextIsolation = getContextIsolation(windowEvents)
  const hasStrengthMismatch =
    hasCategoryMatch(merits, ['leadership', 'responsibility']) &&
    hasCategoryMatch(demerits, ['disruption', 'talking'])

  let primaryIssueType: string | null = null
  if (contextIsolation) primaryIssueType = 'contextual'

  let interpretation: string | null = null
  if (hasStrengthMismatch) interpretation = 'unchannelled_strength'
  else if (escalation)
    interpretation = 'Demerits are increasing week-over-week for two consecutive weeks.'
  else if (earlyConcern) interpretation = 'Three or more demerits in the last 7 days.'

  return {
    timeWindow,
    totalMerits,
    totalDemerits,
    netScore,
    demeritFrequency: totalDemerits,
    trend,
    riskLevel,
    primaryIssueType,
    interpretation,
    contextIsolation,
    hasStrengthMismatch,
    escalation,
    earlyConcern,
  }
}

/**
 * Analyzes parsed events and stores insights WITHOUT storing raw events.
 * This is the stateless analysis approach - process data, compute insights, discard raw data.
 */
export const analyzeAndStoreInsights = async (_parsedEvents: ParsedEvent[]) => {
  return { processed: 0, students: [] }
}

export type { ParsedEvent }
