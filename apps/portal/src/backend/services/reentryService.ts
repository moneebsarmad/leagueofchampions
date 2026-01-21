/**
 * Re-entry Protocols Service
 *
 * Handles re-entry after various consequence types:
 * - Level B: Same-day return with 3-day monitoring
 * - Detention: 5-7min reflection + repair choice + 1min replacement practice
 * - ISS: 10-minute pre-return conference + 5-day monitoring
 * - OSS: Mandatory return meeting + optional restricted re-entry + 10-day monitoring
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'
import type {
  ReentryProtocol,
  CreateReentryRequest,
  ReentrySourceType,
  ReentryMonitoringType,
  ReadinessChecklistItem,
  DailyLog,
} from '@/types/interventions'

const MONITORING_DURATIONS: Record<ReentryMonitoringType, number> = {
  '3_day': 3,
  '5_day': 5,
  '10_day': 10,
}

const DEFAULT_CHECKLIST: ReadinessChecklistItem[] = [
  { item: 'Student can articulate what happened', completed: false },
  { item: 'Student can name the expectation broken', completed: false },
  { item: 'Student has identified repair action', completed: false },
  { item: 'Student can state reset goal', completed: false },
]

/**
 * Create a new re-entry protocol
 */
export async function createReentryProtocol(
  request: CreateReentryRequest
): Promise<ReentryProtocol> {
  const supabase = getSupabaseAdmin()

  // Calculate monitoring dates
  const monitoringStartDate = request.reentry_date
  const monitoringDays = MONITORING_DURATIONS[request.monitoring_type]
  const endDate = new Date(request.reentry_date)
  endDate.setDate(endDate.getDate() + monitoringDays)

  // Determine monitoring method based on source
  const monitoringMethod =
    request.source_type === 'oss'
      ? 'intensive'
      : request.source_type === 'iss'
        ? 'check_in_out'
        : 'checklist'

  const { data, error } = await supabase
    .from(Tables.reentryProtocols)
    .insert({
      student_id: request.student_id,
      source_type: request.source_type,
      level_b_id: request.level_b_id ?? null,
      level_c_id: request.level_c_id ?? null,
      reentry_date: request.reentry_date,
      reentry_time: request.reentry_time ?? null,
      receiving_teacher_id: request.receiving_teacher_id ?? null,
      receiving_teacher_name: request.receiving_teacher_name ?? null,
      readiness_checklist: DEFAULT_CHECKLIST,
      monitoring_start_date: monitoringStartDate,
      monitoring_end_date: endDate.toISOString().split('T')[0],
      monitoring_type: request.monitoring_type,
      monitoring_method: monitoringMethod,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating re-entry protocol:', error)
    throw error
  }

  return data as ReentryProtocol
}

/**
 * Update readiness checklist
 */
export async function updateReadinessChecklist(
  id: string,
  checklist: ReadinessChecklistItem[],
  verifiedBy?: string
): Promise<ReentryProtocol> {
  const supabase = getSupabaseAdmin()

  const allComplete = checklist.every((item) => item.completed)

  const { data, error } = await supabase
    .from(Tables.reentryProtocols)
    .update({
      readiness_checklist: checklist,
      readiness_verified_by: allComplete ? verifiedBy : null,
      readiness_verified_at: allComplete ? new Date().toISOString() : null,
      status: allComplete ? 'ready' : 'pending',
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating checklist:', error)
    throw error
  }

  return data as ReentryProtocol
}

/**
 * Generate teacher script based on intervention
 */
export async function generateTeacherScript(
  id: string,
  resetGoal: string
): Promise<ReentryProtocol> {
  const supabase = getSupabaseAdmin()

  const script = `Welcome back. Your reset goal is "${resetGoal}". Show me the first rep now.`

  const { data, error } = await supabase
    .from(Tables.reentryProtocols)
    .update({
      teacher_script: script,
      reset_goal_from_intervention: resetGoal,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error generating script:', error)
    throw error
  }

  return data as ReentryProtocol
}

/**
 * Start re-entry (mark student as returned)
 */
export async function startReentry(id: string): Promise<ReentryProtocol> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.reentryProtocols)
    .update({
      status: 'active',
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error starting re-entry:', error)
    throw error
  }

  return data as ReentryProtocol
}

/**
 * Mark first behavioral rep completed
 */
export async function completeFirstRep(id: string): Promise<ReentryProtocol> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.reentryProtocols)
    .update({
      first_behavioral_rep_completed: true,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error completing first rep:', error)
    throw error
  }

  return data as ReentryProtocol
}

/**
 * Log daily monitoring entry
 */
export async function logDailyEntry(
  id: string,
  log: DailyLog
): Promise<ReentryProtocol> {
  const supabase = getSupabaseAdmin()

  const { data: current } = await supabase
    .from(Tables.reentryProtocols)
    .select('daily_logs')
    .eq('id', id)
    .single()

  const existingLogs = (current?.daily_logs as DailyLog[]) ?? []

  const { data, error } = await supabase
    .from(Tables.reentryProtocols)
    .update({
      daily_logs: [...existingLogs, log],
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error logging daily entry:', error)
    throw error
  }

  return data as ReentryProtocol
}

/**
 * Complete re-entry protocol
 */
export async function completeReentry(
  id: string,
  outcome: 'success' | 'partial' | 'escalated',
  notes?: string
): Promise<ReentryProtocol> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.reentryProtocols)
    .update({
      status: 'completed',
      outcome,
      outcome_notes: notes ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error completing re-entry:', error)
    throw error
  }

  return data as ReentryProtocol
}

/**
 * Get re-entry protocols with filters
 */
export async function getReentryProtocols(options: {
  student_id?: string
  source_type?: ReentrySourceType
  status?: string
  limit?: number
  offset?: number
}): Promise<{ data: ReentryProtocol[]; count: number }> {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from(Tables.reentryProtocols)
    .select('*', { count: 'exact' })
    .order('reentry_date', { ascending: true })

  if (options.student_id) {
    query = query.eq('student_id', options.student_id)
  }

  if (options.source_type) {
    query = query.eq('source_type', options.source_type)
  }

  if (options.status) {
    query = query.eq('status', options.status)
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching re-entry protocols:', error)
    throw error
  }

  return { data: data as ReentryProtocol[], count: count ?? 0 }
}

/**
 * Get a single re-entry protocol by ID
 */
export async function getReentryProtocolById(
  id: string
): Promise<ReentryProtocol | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.reentryProtocols)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching re-entry protocol:', error)
    throw error
  }

  return data as ReentryProtocol
}

/**
 * Get pending re-entries (today or overdue)
 */
export async function getPendingReentries(): Promise<ReentryProtocol[]> {
  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from(Tables.reentryProtocols)
    .select('*')
    .in('status', ['pending', 'ready'])
    .lte('reentry_date', today)
    .order('reentry_date', { ascending: true })

  if (error) {
    console.error('Error fetching pending re-entries:', error)
    throw error
  }

  return data as ReentryProtocol[]
}

/**
 * Get active re-entries (in monitoring)
 */
export async function getActiveReentries(): Promise<ReentryProtocol[]> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.reentryProtocols)
    .select('*')
    .eq('status', 'active')
    .order('monitoring_end_date', { ascending: true })

  if (error) {
    console.error('Error fetching active re-entries:', error)
    throw error
  }

  return data as ReentryProtocol[]
}
