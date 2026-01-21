/**
 * Level C Case Management Service
 *
 * Handles intensive intervention cases (2-4 weeks)
 * 5-step process: Stabilize, Context Packet, Admin Action, Re-entry Planning, Monitor & Close
 *
 * Triggers: Safety incidents, no improvement after 2 Level B cycles, chronic patterns, post-OSS re-entry
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'
import type {
  LevelCCase,
  CreateLevelCRequest,
  LevelCStatus,
  AdminResponseType,
  ReadinessChecklistItem,
  RepairAction,
  DailyCheckIn,
} from '@/types/interventions'

/**
 * Create a new Level C case
 */
export async function createLevelCCase(
  request: CreateLevelCRequest,
  caseManagerId?: string,
  caseManagerName?: string
): Promise<LevelCCase> {
  const supabase = getSupabaseAdmin()

  // Determine case type based on threshold
  let caseType: 'standard' | 'lite' | 'intensive' = 'standard'
  if (
    request.trigger_type === 'threshold_20_points'
  ) {
    caseType = 'lite'
  } else if (
    request.trigger_type === 'threshold_35_points' ||
    request.trigger_type === 'threshold_40_points' ||
    request.trigger_type === 'safety_incident'
  ) {
    caseType = 'intensive'
  }

  // Determine monitoring duration based on case type
  let monitoringDuration = 10 // default
  if (caseType === 'lite') {
    monitoringDuration = 14
  } else if (caseType === 'intensive') {
    monitoringDuration = 10
  }

  const { data, error } = await supabase
    .from(Tables.levelCCases)
    .insert({
      student_id: request.student_id,
      case_manager_id: caseManagerId ?? null,
      case_manager_name: caseManagerName ?? null,
      trigger_type: request.trigger_type,
      case_type: request.case_type ?? caseType,
      domain_focus_id: request.domain_focus_id ?? null,
      escalated_from_level_b_ids: request.escalated_from_level_b_ids ?? [],
      sis_demerit_points_at_creation: request.sis_demerit_points_at_creation ?? null,
      monitoring_duration_days: monitoringDuration,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating Level C case:', error)
    throw error
  }

  // If escalated from Level B, update those records
  if (request.escalated_from_level_b_ids?.length) {
    await supabase
      .from(Tables.levelBInterventions)
      .update({ escalated_to_c: true })
      .in('id', request.escalated_from_level_b_ids)
  }

  return data as LevelCCase
}

/**
 * Assign a case manager to a Level C case
 */
export async function assignCaseManager(
  caseId: string,
  caseManagerId: string,
  caseManagerName: string
): Promise<LevelCCase> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.levelCCases)
    .update({
      case_manager_id: caseManagerId,
      case_manager_name: caseManagerName,
    })
    .eq('id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error assigning case manager:', error)
    throw error
  }

  return data as LevelCCase
}

/**
 * Update context packet (Step 2)
 */
export async function updateContextPacket(
  caseId: string,
  data: {
    incident_summary?: string
    pattern_review?: string
    environmental_factors?: string[]
    prior_interventions_summary?: string
  }
): Promise<LevelCCase> {
  const supabase = getSupabaseAdmin()

  const updateData: Record<string, unknown> = { ...data }

  // Check if all fields are filled
  const { data: current } = await supabase
    .from(Tables.levelCCases)
    .select('incident_summary, pattern_review, environmental_factors, prior_interventions_summary')
    .eq('id', caseId)
    .single()

  const merged = { ...current, ...data }
  if (
    merged.incident_summary &&
    merged.pattern_review &&
    merged.environmental_factors?.length &&
    merged.prior_interventions_summary
  ) {
    updateData.context_packet_completed = true
    updateData.status = 'admin_response'
  }

  const { data: updated, error } = await supabase
    .from(Tables.levelCCases)
    .update(updateData)
    .eq('id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error updating context packet:', error)
    throw error
  }

  return updated as LevelCCase
}

/**
 * Record admin response (Step 3)
 */
export async function recordAdminResponse(
  caseId: string,
  data: {
    admin_response_type: AdminResponseType
    admin_response_details?: string
    consequence_start_date?: string
    consequence_end_date?: string
  }
): Promise<LevelCCase> {
  const supabase = getSupabaseAdmin()

  const { data: updated, error } = await supabase
    .from(Tables.levelCCases)
    .update({
      ...data,
      admin_response_completed: true,
      status: 'pending_reentry',
    })
    .eq('id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error recording admin response:', error)
    throw error
  }

  return updated as LevelCCase
}

/**
 * Create re-entry plan and support plan (Step 4)
 */
export async function createReentryPlan(
  caseId: string,
  data: {
    support_plan_goal: string
    support_plan_strategies: string[]
    adult_mentor_id?: string
    adult_mentor_name?: string
    repair_actions: RepairAction[]
    reentry_date: string
    reentry_type: 'standard' | 'restricted'
    reentry_restrictions?: string[]
    reentry_checklist?: ReadinessChecklistItem[]
  }
): Promise<LevelCCase> {
  const supabase = getSupabaseAdmin()

  // Default checklist if not provided
  const defaultChecklist: ReadinessChecklistItem[] = [
    { item: 'Student can articulate what happened', completed: false },
    { item: 'Student can name the expectation broken', completed: false },
    { item: 'Student has identified repair action', completed: false },
    { item: 'Student can state reset goal', completed: false },
  ]

  const { data: updated, error } = await supabase
    .from(Tables.levelCCases)
    .update({
      support_plan_goal: data.support_plan_goal,
      support_plan_strategies: data.support_plan_strategies,
      adult_mentor_id: data.adult_mentor_id ?? null,
      adult_mentor_name: data.adult_mentor_name ?? null,
      repair_actions: data.repair_actions,
      reentry_date: data.reentry_date,
      reentry_type: data.reentry_type,
      reentry_restrictions: data.reentry_restrictions ?? [],
      reentry_checklist: data.reentry_checklist ?? defaultChecklist,
      reentry_planning_completed: true,
    })
    .eq('id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error creating re-entry plan:', error)
    throw error
  }

  return updated as LevelCCase
}

/**
 * Start monitoring period (after re-entry)
 */
export async function startCaseMonitoring(caseId: string): Promise<LevelCCase> {
  const supabase = getSupabaseAdmin()

  const { data: caseData } = await supabase
    .from(Tables.levelCCases)
    .select('monitoring_duration_days, reentry_date')
    .eq('id', caseId)
    .single()

  if (!caseData) {
    throw new Error('Case not found')
  }

  const startDate = caseData.reentry_date ?? new Date().toISOString().split('T')[0]
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + (caseData.monitoring_duration_days ?? 10))

  // Generate review dates (every 3-5 days)
  const reviewDates: string[] = []
  const current = new Date(startDate)
  while (current < endDate) {
    current.setDate(current.getDate() + 3)
    if (current < endDate) {
      reviewDates.push(current.toISOString().split('T')[0])
    }
  }
  reviewDates.push(endDate.toISOString().split('T')[0]) // Final review

  const { data: updated, error } = await supabase
    .from(Tables.levelCCases)
    .update({
      status: 'monitoring',
      monitoring_schedule: reviewDates.map((date) => ({
        date,
        type: date === endDate.toISOString().split('T')[0] ? 'final' : 'check_in',
      })),
      review_dates: reviewDates,
    })
    .eq('id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error starting monitoring:', error)
    throw error
  }

  return updated as LevelCCase
}

/**
 * Log daily check-in during monitoring
 */
export async function logDailyCheckIn(
  caseId: string,
  checkIn: DailyCheckIn
): Promise<LevelCCase> {
  const supabase = getSupabaseAdmin()

  const { data: current } = await supabase
    .from(Tables.levelCCases)
    .select('daily_check_ins')
    .eq('id', caseId)
    .single()

  const existingCheckIns = (current?.daily_check_ins as DailyCheckIn[]) ?? []

  const { data: updated, error } = await supabase
    .from(Tables.levelCCases)
    .update({
      daily_check_ins: [...existingCheckIns, checkIn],
    })
    .eq('id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error logging check-in:', error)
    throw error
  }

  return updated as LevelCCase
}

/**
 * Close case (Step 5)
 */
export async function closeCase(
  caseId: string,
  data: {
    outcome_status: 'closed_success' | 'closed_continued_support' | 'closed_escalated'
    outcome_notes?: string
    closure_criteria?: string
  }
): Promise<LevelCCase> {
  const supabase = getSupabaseAdmin()

  const { data: updated, error } = await supabase
    .from(Tables.levelCCases)
    .update({
      status: 'closed',
      outcome_status: data.outcome_status,
      outcome_notes: data.outcome_notes ?? null,
      closure_criteria: data.closure_criteria ?? null,
      closure_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error closing case:', error)
    throw error
  }

  return updated as LevelCCase
}

/**
 * Get Level C cases with filters
 */
export async function getLevelCCases(options: {
  student_id?: string
  case_manager_id?: string
  status?: LevelCStatus | LevelCStatus[]
  limit?: number
  offset?: number
}): Promise<{ data: LevelCCase[]; count: number }> {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from(Tables.levelCCases)
    .select(
      `
      *,
      domain:behavioral_domains(*)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (options.student_id) {
    query = query.eq('student_id', options.student_id)
  }

  if (options.case_manager_id) {
    query = query.eq('case_manager_id', options.case_manager_id)
  }

  if (options.status) {
    if (Array.isArray(options.status)) {
      query = query.in('status', options.status)
    } else {
      query = query.eq('status', options.status)
    }
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching Level C cases:', error)
    throw error
  }

  return { data: data as LevelCCase[], count: count ?? 0 }
}

/**
 * Get a single Level C case by ID
 */
export async function getLevelCCaseById(id: string): Promise<LevelCCase | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.levelCCases)
    .select(
      `
      *,
      domain:behavioral_domains(*)
    `
    )
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching Level C case:', error)
    throw error
  }

  return data as LevelCCase
}

/**
 * Get active cases for a case manager
 */
export async function getCaseManagerCaseload(
  caseManagerId: string
): Promise<LevelCCase[]> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.levelCCases)
    .select(
      `
      *,
      domain:behavioral_domains(*)
    `
    )
    .eq('case_manager_id', caseManagerId)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching case manager caseload:', error)
    throw error
  }

  return data as LevelCCase[]
}

/**
 * Get pending re-entries
 */
export async function getPendingReentries(): Promise<LevelCCase[]> {
  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from(Tables.levelCCases)
    .select(
      `
      *,
      domain:behavioral_domains(*)
    `
    )
    .eq('status', 'pending_reentry')
    .lte('reentry_date', today)
    .order('reentry_date', { ascending: true })

  if (error) {
    console.error('Error fetching pending re-entries:', error)
    throw error
  }

  return data as LevelCCase[]
}
