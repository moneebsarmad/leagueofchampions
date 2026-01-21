/**
 * Level A Intervention Service
 *
 * Handles in-the-moment coaching interventions (30-90 seconds)
 * 8 intervention types: Pre-Correct, Positive Narration, Quick Redirect,
 * "Do It Again" Redo, Choice + Consequence, Brief Private Check, Micro-Repair, Quick Reinforcement
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'
import type {
  LevelAIntervention,
  CreateLevelARequest,
  LevelAOutcome,
  BehavioralDomain,
} from '@/types/interventions'
import {
  checkStudentDomainPattern,
  getRecentLevelAInterventions,
} from './decisionTreeEngine'

/**
 * Get all behavioral domains
 */
export async function getBehavioralDomains(): Promise<BehavioralDomain[]> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.behavioralDomains)
    .select('*')
    .eq('is_active', true)
    .order('id')

  if (error) {
    console.error('Error fetching domains:', error)
    throw error
  }

  return data as BehavioralDomain[]
}

/**
 * Get a single behavioral domain by ID
 */
export async function getBehavioralDomainById(
  domainId: number
): Promise<BehavioralDomain | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.behavioralDomains)
    .select('*')
    .eq('id', domainId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching domain:', error)
    throw error
  }

  return data as BehavioralDomain
}

/**
 * Create a new Level A intervention
 */
export async function createLevelAIntervention(
  request: CreateLevelARequest,
  staffId: string,
  staffName: string
): Promise<LevelAIntervention> {
  const supabase = getSupabaseAdmin()

  // Check context flags
  const isPattern = await checkStudentDomainPattern(
    request.student_id,
    request.domain_id
  )
  const recentInterventions = await getRecentLevelAInterventions(
    request.student_id,
    request.domain_id
  )
  const isRepeatedSameDay = recentInterventions.today_count > 0

  const { data, error } = await supabase
    .from(Tables.levelAInterventions)
    .insert({
      student_id: request.student_id,
      staff_id: staffId,
      staff_name: staffName,
      domain_id: request.domain_id,
      intervention_type: request.intervention_type,
      behavior_description: request.behavior_description ?? null,
      location: request.location ?? null,
      outcome: request.outcome ?? 'complied',
      is_repeated_same_day: isRepeatedSameDay,
      affected_others: request.affected_others ?? false,
      is_pattern_student: isPattern,
      escalated_to_b: request.outcome === 'escalated',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating Level A intervention:', error)
    throw error
  }

  return data as LevelAIntervention
}

/**
 * Get Level A interventions with filters
 */
export async function getLevelAInterventions(options: {
  student_id?: string
  domain_id?: number
  staff_id?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}): Promise<{ data: LevelAIntervention[]; count: number }> {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from(Tables.levelAInterventions)
    .select(
      `
      *,
      domain:behavioral_domains(*)
    `,
      { count: 'exact' }
    )
    .order('event_timestamp', { ascending: false })

  if (options.student_id) {
    query = query.eq('student_id', options.student_id)
  }

  if (options.domain_id) {
    query = query.eq('domain_id', options.domain_id)
  }

  if (options.staff_id) {
    query = query.eq('staff_id', options.staff_id)
  }

  if (options.from_date) {
    query = query.gte('event_timestamp', options.from_date)
  }

  if (options.to_date) {
    query = query.lte('event_timestamp', options.to_date)
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching Level A interventions:', error)
    throw error
  }

  return { data: data as LevelAIntervention[], count: count ?? 0 }
}

/**
 * Get a single Level A intervention by ID
 */
export async function getLevelAInterventionById(
  id: string
): Promise<LevelAIntervention | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.levelAInterventions)
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
    console.error('Error fetching Level A intervention:', error)
    throw error
  }

  return data as LevelAIntervention
}

/**
 * Update a Level A intervention outcome
 */
export async function updateLevelAOutcome(
  id: string,
  outcome: LevelAOutcome,
  escalatedToB: boolean = false
): Promise<LevelAIntervention> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.levelAInterventions)
    .update({
      outcome,
      escalated_to_b: escalatedToB,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating Level A outcome:', error)
    throw error
  }

  return data as LevelAIntervention
}

/**
 * Get Level A stats for a student
 */
export async function getStudentLevelAStats(
  studentId: string,
  days: number = 30
): Promise<{
  total_count: number
  by_domain: Record<string, number>
  by_outcome: Record<LevelAOutcome, number>
  escalation_rate: number
}> {
  const supabase = getSupabaseAdmin()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const { data, error } = await supabase
    .from(Tables.levelAInterventions)
    .select(
      `
      domain_id,
      outcome,
      escalated_to_b,
      domain:behavioral_domains(domain_key)
    `
    )
    .eq('student_id', studentId)
    .gte('event_timestamp', cutoffDate.toISOString())

  if (error) {
    console.error('Error fetching student stats:', error)
    throw error
  }

  const byDomain: Record<string, number> = {}
  const byOutcome: Record<LevelAOutcome, number> = {
    complied: 0,
    escalated: 0,
    partial: 0,
  }
  let escalatedCount = 0

  for (const item of data) {
    // Count by domain
    const domainKey =
      (item.domain as { domain_key: string } | null)?.domain_key ?? 'unknown'
    byDomain[domainKey] = (byDomain[domainKey] ?? 0) + 1

    // Count by outcome
    const outcome = item.outcome as LevelAOutcome
    byOutcome[outcome] = (byOutcome[outcome] ?? 0) + 1

    // Count escalations
    if (item.escalated_to_b) {
      escalatedCount++
    }
  }

  return {
    total_count: data.length,
    by_domain: byDomain,
    by_outcome: byOutcome,
    escalation_rate: data.length > 0 ? (escalatedCount / data.length) * 100 : 0,
  }
}

/**
 * Get today's Level A interventions for staff dashboard
 */
export async function getTodaysLevelAInterventions(
  staffId?: string
): Promise<LevelAIntervention[]> {
  const supabase = getSupabaseAdmin()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let query = supabase
    .from(Tables.levelAInterventions)
    .select(
      `
      *,
      domain:behavioral_domains(*)
    `
    )
    .gte('event_timestamp', today.toISOString())
    .order('event_timestamp', { ascending: false })

  if (staffId) {
    query = query.eq('staff_id', staffId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching today\'s interventions:', error)
    throw error
  }

  return data as LevelAIntervention[]
}
