/**
 * Decision Tree Engine for A/B/C Intervention Level Determination
 *
 * Implements the DAAIS decision tree logic:
 * 1. Safety/Major Harm? → YES = Level C + Admin consequence
 * 2. Pattern/Impact Assessment → YES = Level B (or C if 2+ Level B attempts)
 * 3. Otherwise → Level A
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'
import type {
  IncidentAssessment,
  InterventionLevel,
  DecisionTreeResult,
} from '@/types/interventions'

/**
 * Check if student has a pattern in the specified domain (3+ incidents in 10 days)
 */
export async function checkStudentDomainPattern(
  studentId: string,
  domainId: number,
  days: number = 10
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const { count, error } = await supabase
    .from(Tables.levelAInterventions)
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('domain_id', domainId)
    .gte('event_timestamp', cutoffDate.toISOString())

  if (error) {
    console.error('Error checking student pattern:', error)
    return false
  }

  return (count ?? 0) >= 3
}

/**
 * Count completed Level B interventions for student in domain
 */
export async function countLevelBAttempts(
  studentId: string,
  domainId: number
): Promise<number> {
  const supabase = getSupabaseAdmin()

  const { count, error } = await supabase
    .from(Tables.levelBInterventions)
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('domain_id', domainId)
    .in('status', ['completed_success', 'completed_escalated'])

  if (error) {
    console.error('Error counting Level B attempts:', error)
    return 0
  }

  return count ?? 0
}

/**
 * Get recent Level A interventions for a student (for same-day detection)
 */
export async function getRecentLevelAInterventions(
  studentId: string,
  domainId?: number
): Promise<{ count: number; today_count: number }> {
  const supabase = getSupabaseAdmin()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let query = supabase
    .from(Tables.levelAInterventions)
    .select('event_timestamp', { count: 'exact' })
    .eq('student_id', studentId)

  if (domainId) {
    query = query.eq('domain_id', domainId)
  }

  const { data, count, error } = await query.gte(
    'event_timestamp',
    today.toISOString()
  )

  if (error) {
    console.error('Error getting recent interventions:', error)
    return { count: 0, today_count: 0 }
  }

  return {
    count: count ?? 0,
    today_count: data?.length ?? 0,
  }
}

/**
 * Main decision tree function to determine intervention level
 */
export async function determineInterventionLevel(
  assessment: IncidentAssessment
): Promise<DecisionTreeResult> {
  const reasons: string[] = []

  // Step 1: Safety/Major Harm check
  if (assessment.is_safety_incident) {
    reasons.push('Safety incident detected - requires Level C + Admin consequence')
    return {
      recommended_level: 'C',
      reasons,
      is_pattern_student: false,
      prior_level_b_count: 0,
    }
  }

  // Step 2: Check pattern status
  const isPatternStudent = await checkStudentDomainPattern(
    assessment.student_id,
    assessment.domain_id
  )

  // Step 3: Assess escalation triggers
  const escalationTriggers: string[] = []

  if (assessment.demerit_assigned) {
    escalationTriggers.push('Demerit was assigned')
  }

  if (assessment.ignored_prompts >= 2) {
    escalationTriggers.push(`Ignored ${assessment.ignored_prompts} prompts`)
  }

  if (isPatternStudent) {
    escalationTriggers.push('3rd incident in 10 days (same domain)')
  }

  if (assessment.affected_peers) {
    escalationTriggers.push('Affected other students')
  }

  if (assessment.disrupted_space) {
    escalationTriggers.push('Disrupted shared space')
  }

  if (assessment.is_safety_risk) {
    escalationTriggers.push('Safety risk identified')
  }

  // If any escalation trigger is present
  if (escalationTriggers.length > 0) {
    reasons.push(...escalationTriggers)

    // Check if 2+ Level B cycles already attempted
    const levelBCount = await countLevelBAttempts(
      assessment.student_id,
      assessment.domain_id
    )

    if (levelBCount >= 2) {
      reasons.push(
        `${levelBCount} Level B attempts already completed for this domain`
      )
      return {
        recommended_level: 'C',
        reasons,
        is_pattern_student: isPatternStudent,
        prior_level_b_count: levelBCount,
      }
    }

    return {
      recommended_level: 'B',
      reasons,
      is_pattern_student: isPatternStudent,
      prior_level_b_count: levelBCount,
    }
  }

  // No escalation triggers - Level A
  reasons.push('No escalation triggers present')
  return {
    recommended_level: 'A',
    reasons,
    is_pattern_student: isPatternStudent,
    prior_level_b_count: 0,
  }
}

/**
 * Quick check if an incident should potentially be logged
 * Based on logging rules: Only log Level A if repeated same day, affected others, or known pattern
 */
export async function shouldLogLevelA(
  studentId: string,
  domainId: number,
  affectedOthers: boolean
): Promise<{ should_log: boolean; reason: string }> {
  // Always log if affected others
  if (affectedOthers) {
    return { should_log: true, reason: 'Affected other students' }
  }

  // Check if pattern student
  const isPattern = await checkStudentDomainPattern(studentId, domainId)
  if (isPattern) {
    return { should_log: true, reason: 'Known pattern student' }
  }

  // Check if repeated same day
  const recent = await getRecentLevelAInterventions(studentId, domainId)
  if (recent.today_count > 0) {
    return { should_log: true, reason: 'Repeated incident same day' }
  }

  return { should_log: false, reason: 'First minor incident of the day' }
}

/**
 * Get escalation recommendation summary for UI
 */
export function getEscalationSummary(result: DecisionTreeResult): {
  level: InterventionLevel
  color: 'green' | 'yellow' | 'red'
  title: string
  description: string
} {
  switch (result.recommended_level) {
    case 'A':
      return {
        level: 'A',
        color: 'green',
        title: 'Level A: In-the-moment Coaching',
        description:
          'Quick redirect (30-90 seconds). Use universal script and positive closure.',
      }
    case 'B':
      return {
        level: 'B',
        color: 'yellow',
        title: 'Level B: Structured Reset Conference',
        description:
          'Pull student for 15-20 minute reset. Complete all 7 steps and set monitoring period.',
      }
    case 'C':
      return {
        level: 'C',
        color: 'red',
        title: 'Level C: Case Management',
        description:
          'Escalate to Case Manager (Tarbiyah Director/Counselor). 2-4 week intensive support required.',
      }
  }
}
