/**
 * Level B Intervention Service
 *
 * Handles structured reset conferences (15-20 minutes)
 * 7 non-negotiable steps: B1-Regulate, B2-Pattern Naming, B3-Reflection,
 * B4-Repair Action, B5-Replacement Practice, B6-Reset Goal, B7-Documentation
 *
 * Monitoring: 3 school days, 80%+ success required or escalate to Level C
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'
import type {
  LevelBIntervention,
  CreateLevelBRequest,
  UpdateLevelBStepRequest,
  LevelBStatus,
  MonitoringMethod,
  BehavioralDomain,
} from '@/types/interventions'

const SUCCESS_THRESHOLD = 80 // 80% success rate required

/**
 * Create a new Level B intervention
 */
export async function createLevelBIntervention(
  request: CreateLevelBRequest,
  staffId: string,
  staffName: string
): Promise<LevelBIntervention> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.levelBInterventions)
    .insert({
      student_id: request.student_id,
      staff_id: staffId,
      staff_name: staffName,
      domain_id: request.domain_id,
      escalation_trigger: request.escalation_trigger,
      escalated_from_level_a_id: request.escalated_from_level_a_id ?? null,
      status: 'in_progress',
      conference_timestamp: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating Level B intervention:', error)
    throw error
  }

  // If escalated from Level A, update the Level A record
  if (request.escalated_from_level_a_id) {
    await supabase
      .from(Tables.levelAInterventions)
      .update({ escalated_to_b: true, outcome: 'escalated' })
      .eq('id', request.escalated_from_level_a_id)
  }

  return data as LevelBIntervention
}

/**
 * Update a specific step in the Level B workflow
 */
export async function updateLevelBStep(
  id: string,
  request: UpdateLevelBStepRequest
): Promise<LevelBIntervention> {
  const supabase = getSupabaseAdmin()

  const updateData: Record<string, unknown> = {}

  // Map step data to database columns
  switch (request.step) {
    case 1:
      if (request.data.b1_regulate_completed !== undefined) {
        updateData.b1_regulate_completed = request.data.b1_regulate_completed
      }
      if (request.data.b1_regulate_notes !== undefined) {
        updateData.b1_regulate_notes = request.data.b1_regulate_notes
      }
      break
    case 2:
      if (request.data.b2_pattern_naming_completed !== undefined) {
        updateData.b2_pattern_naming_completed = request.data.b2_pattern_naming_completed
      }
      if (request.data.b2_pattern_notes !== undefined) {
        updateData.b2_pattern_notes = request.data.b2_pattern_notes
      }
      break
    case 3:
      if (request.data.b3_reflection_completed !== undefined) {
        updateData.b3_reflection_completed = request.data.b3_reflection_completed
      }
      if (request.data.b3_reflection_prompts_used !== undefined) {
        updateData.b3_reflection_prompts_used = request.data.b3_reflection_prompts_used
      }
      break
    case 4:
      if (request.data.b4_repair_completed !== undefined) {
        updateData.b4_repair_completed = request.data.b4_repair_completed
      }
      if (request.data.b4_repair_action_selected !== undefined) {
        updateData.b4_repair_action_selected = request.data.b4_repair_action_selected
      }
      break
    case 5:
      if (request.data.b5_replacement_completed !== undefined) {
        updateData.b5_replacement_completed = request.data.b5_replacement_completed
      }
      if (request.data.b5_replacement_skill_practiced !== undefined) {
        updateData.b5_replacement_skill_practiced = request.data.b5_replacement_skill_practiced
      }
      break
    case 6:
      if (request.data.b6_reset_goal_completed !== undefined) {
        updateData.b6_reset_goal_completed = request.data.b6_reset_goal_completed
      }
      if (request.data.b6_reset_goal !== undefined) {
        updateData.b6_reset_goal = request.data.b6_reset_goal
      }
      if (request.data.b6_reset_goal_timeline_days !== undefined) {
        updateData.b6_reset_goal_timeline_days = request.data.b6_reset_goal_timeline_days
      }
      break
    case 7:
      if (request.data.b7_documentation_completed !== undefined) {
        updateData.b7_documentation_completed = request.data.b7_documentation_completed
      }
      if (request.data.monitoring_method !== undefined) {
        updateData.monitoring_method = request.data.monitoring_method
      }
      break
  }

  const { data, error } = await supabase
    .from(Tables.levelBInterventions)
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating Level B step:', error)
    throw error
  }

  return data as LevelBIntervention
}

/**
 * Complete the Level B conference and start monitoring
 */
export async function startLevelBMonitoring(
  id: string,
  monitoringMethod: MonitoringMethod
): Promise<LevelBIntervention> {
  const supabase = getSupabaseAdmin()

  // Get the intervention to check reset goal timeline
  const { data: intervention } = await supabase
    .from(Tables.levelBInterventions)
    .select('b6_reset_goal_timeline_days')
    .eq('id', id)
    .single()

  const monitoringDays = intervention?.b6_reset_goal_timeline_days ?? 3
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + monitoringDays)

  const { data, error } = await supabase
    .from(Tables.levelBInterventions)
    .update({
      status: 'monitoring',
      monitoring_method: monitoringMethod,
      monitoring_start_date: startDate.toISOString().split('T')[0],
      monitoring_end_date: endDate.toISOString().split('T')[0],
      b7_documentation_completed: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error starting monitoring:', error)
    throw error
  }

  return data as LevelBIntervention
}

/**
 * Log daily success rate during monitoring
 */
export async function logDailySuccessRate(
  id: string,
  date: string,
  successRate: number
): Promise<LevelBIntervention> {
  const supabase = getSupabaseAdmin()

  // Get current daily rates
  const { data: current } = await supabase
    .from(Tables.levelBInterventions)
    .select('daily_success_rates')
    .eq('id', id)
    .single()

  const currentRates = (current?.daily_success_rates as Record<string, number>) ?? {}
  const updatedRates = { ...currentRates, [date]: successRate }

  const { data, error } = await supabase
    .from(Tables.levelBInterventions)
    .update({
      daily_success_rates: updatedRates,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error logging daily success rate:', error)
    throw error
  }

  return data as LevelBIntervention
}

/**
 * Complete Level B monitoring and determine outcome
 */
export async function completeLevelBMonitoring(
  id: string,
  notes?: string
): Promise<{ intervention: LevelBIntervention; shouldEscalate: boolean }> {
  const supabase = getSupabaseAdmin()

  // Get current intervention with daily rates
  const { data: current } = await supabase
    .from(Tables.levelBInterventions)
    .select('*')
    .eq('id', id)
    .single()

  if (!current) {
    throw new Error('Intervention not found')
  }

  const dailyRates = current.daily_success_rates as Record<string, number>
  const rates = Object.values(dailyRates)
  const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0

  const shouldEscalate = avgRate < SUCCESS_THRESHOLD
  const status: LevelBStatus = shouldEscalate ? 'completed_escalated' : 'completed_success'

  const { data, error } = await supabase
    .from(Tables.levelBInterventions)
    .update({
      status,
      final_success_rate: avgRate,
      escalated_to_c: shouldEscalate,
      escalation_reason: shouldEscalate
        ? `Success rate ${avgRate.toFixed(1)}% below ${SUCCESS_THRESHOLD}% threshold`
        : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error completing monitoring:', error)
    throw error
  }

  return { intervention: data as LevelBIntervention, shouldEscalate }
}

/**
 * Get Level B interventions with filters
 */
export async function getLevelBInterventions(options: {
  student_id?: string
  domain_id?: number
  staff_id?: string
  status?: LevelBStatus | LevelBStatus[]
  limit?: number
  offset?: number
}): Promise<{ data: LevelBIntervention[]; count: number }> {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from(Tables.levelBInterventions)
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

  if (options.domain_id) {
    query = query.eq('domain_id', options.domain_id)
  }

  if (options.staff_id) {
    query = query.eq('staff_id', options.staff_id)
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
    console.error('Error fetching Level B interventions:', error)
    throw error
  }

  return { data: data as LevelBIntervention[], count: count ?? 0 }
}

/**
 * Get a single Level B intervention by ID
 */
export async function getLevelBInterventionById(
  id: string
): Promise<LevelBIntervention | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.levelBInterventions)
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
    console.error('Error fetching Level B intervention:', error)
    throw error
  }

  return data as LevelBIntervention
}

/**
 * Get active Level B interventions needing monitoring
 */
export async function getActiveMonitoringInterventions(): Promise<LevelBIntervention[]> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.levelBInterventions)
    .select(
      `
      *,
      domain:behavioral_domains(*)
    `
    )
    .eq('status', 'monitoring')
    .order('monitoring_end_date', { ascending: true })

  if (error) {
    console.error('Error fetching active monitoring:', error)
    throw error
  }

  return data as LevelBIntervention[]
}

/**
 * Check for Level B interventions that need to be completed
 * (Monitoring period has ended)
 */
export async function checkExpiredMonitoring(): Promise<LevelBIntervention[]> {
  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from(Tables.levelBInterventions)
    .select('*')
    .eq('status', 'monitoring')
    .lte('monitoring_end_date', today)

  if (error) {
    console.error('Error checking expired monitoring:', error)
    throw error
  }

  return data as LevelBIntervention[]
}

/**
 * Calculate completion percentage for a Level B intervention
 */
export function calculateCompletionPercentage(intervention: LevelBIntervention): number {
  const steps = [
    intervention.b1_regulate_completed,
    intervention.b2_pattern_naming_completed,
    intervention.b3_reflection_completed,
    intervention.b4_repair_completed,
    intervention.b5_replacement_completed,
    intervention.b6_reset_goal_completed,
    intervention.b7_documentation_completed,
  ]

  const completed = steps.filter(Boolean).length
  return Math.round((completed / steps.length) * 100)
}

/**
 * Get reflection prompts for Level B
 */
export function getReflectionPrompts(): string[] {
  return [
    'What happened just before this incident?',
    'How were you feeling at that moment?',
    'Who was affected by your actions?',
    'What expectation did you not meet?',
    'What could you have done differently?',
    'How would you handle this situation next time?',
  ]
}

/**
 * Get reset goal examples
 */
export function getResetGoalExamples(domainKey: string): string[] {
  const examples: Record<string, string[]> = {
    prayer_space: [
      'Enter the prayer hall with hands at sides and voice off for 3 days',
      'Complete wudu fully before entering prayer space for 3 days',
      'Maintain stillness during salah for 3 consecutive prayers',
    ],
    hallways: [
      'Walk on the right side with hands to self for 3 days',
      'Use whisper voice during all transitions for 3 days',
      'Keep appropriate spacing from peers during all transitions',
    ],
    lunch_recess: [
      'Invite at least one different peer to join activities daily',
      'Clean up my eating area completely before leaving for 3 days',
      'Use words instead of physical contact when frustrated',
    ],
    respect: [
      'Respond to adult directions the first time for 3 days',
      'Use "I disagree because..." instead of arguing for 3 days',
      'Apologize sincerely when I make a mistake that affects others',
    ],
  }

  return examples[domainKey] ?? examples.respect
}
