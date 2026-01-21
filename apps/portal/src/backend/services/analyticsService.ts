/**
 * Intervention Analytics Service
 *
 * Provides metrics and analytics for the A/B/C intervention framework:
 * - Distribution ratios (Many A, Some B, Few C)
 * - Repeat rates by domain
 * - Escalation rates
 * - Goal achievement rates
 * - Hot zones identification
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'
import type { BehavioralDomainKey } from '@/types/interventions'

export interface InterventionSummary {
  level_a_count: number
  level_b_count: number
  level_c_count: number
  reentry_count: number
  distribution_healthy: boolean
}

export interface DomainMetrics {
  domain_key: BehavioralDomainKey
  domain_name: string
  level_a_count: number
  level_b_count: number
  repeat_rate: number
}

export interface EscalationMetrics {
  a_to_b_count: number
  a_to_b_rate: number
  b_to_c_count: number
  b_to_c_rate: number
}

export interface OutcomeMetrics {
  level_b_completed: number
  level_b_success_rate: number
  level_c_completed: number
  level_c_success_rate: number
  reentry_success_rate: number
}

export interface TrendDataPoint {
  date: string
  level_a: number
  level_b: number
  level_c: number
}

export interface AnalyticsDashboardData {
  summary: InterventionSummary
  domain_metrics: DomainMetrics[]
  escalation_metrics: EscalationMetrics
  outcome_metrics: OutcomeMetrics
  weekly_trends: TrendDataPoint[]
  recent_activity: RecentActivity[]
}

export interface RecentActivity {
  id: string
  type: 'level_a' | 'level_b' | 'level_c' | 'reentry'
  student_name: string
  description: string
  timestamp: string
}

/**
 * Get comprehensive analytics dashboard data
 */
export async function getDashboardAnalytics(
  dateRange: { start: string; end: string } = getDefaultDateRange()
): Promise<AnalyticsDashboardData> {
  const [summary, domainMetrics, escalationMetrics, outcomeMetrics, weeklyTrends, recentActivity] =
    await Promise.all([
      getInterventionSummary(dateRange),
      getDomainMetrics(dateRange),
      getEscalationMetrics(dateRange),
      getOutcomeMetrics(dateRange),
      getWeeklyTrends(),
      getRecentActivity(),
    ])

  return {
    summary,
    domain_metrics: domainMetrics,
    escalation_metrics: escalationMetrics,
    outcome_metrics: outcomeMetrics,
    weekly_trends: weeklyTrends,
    recent_activity: recentActivity,
  }
}

/**
 * Get intervention counts summary
 */
export async function getInterventionSummary(
  dateRange: { start: string; end: string }
): Promise<InterventionSummary> {
  const supabase = getSupabaseAdmin()

  const [levelAResult, levelBResult, levelCResult, reentryResult] = await Promise.all([
    supabase
      .from(Tables.levelAInterventions)
      .select('*', { count: 'exact', head: true })
      .gte('event_timestamp', dateRange.start)
      .lte('event_timestamp', dateRange.end),
    supabase
      .from(Tables.levelBInterventions)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end),
    supabase
      .from(Tables.levelCCases)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end),
    supabase
      .from(Tables.reentryProtocols)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end),
  ])

  const levelA = levelAResult.count ?? 0
  const levelB = levelBResult.count ?? 0
  const levelC = levelCResult.count ?? 0
  const reentry = reentryResult.count ?? 0

  // Distribution is healthy if: A > B > C (many quick interventions, few intensive)
  const total = levelA + levelB + levelC
  const distributionHealthy =
    total === 0 ||
    (levelA >= levelB && levelB >= levelC && levelA / Math.max(total, 1) >= 0.6)

  return {
    level_a_count: levelA,
    level_b_count: levelB,
    level_c_count: levelC,
    reentry_count: reentry,
    distribution_healthy: distributionHealthy,
  }
}

/**
 * Get metrics broken down by behavioral domain
 */
export async function getDomainMetrics(
  dateRange: { start: string; end: string }
): Promise<DomainMetrics[]> {
  const supabase = getSupabaseAdmin()

  // Get all domains
  const { data: domains } = await supabase
    .from(Tables.behavioralDomains)
    .select('id, domain_key, domain_name')
    .eq('is_active', true)

  if (!domains) return []

  const metrics = await Promise.all(
    domains.map(async (domain) => {
      // Count Level A interventions for this domain
      const { count: levelACount } = await supabase
        .from(Tables.levelAInterventions)
        .select('*', { count: 'exact', head: true })
        .eq('domain_id', domain.id)
        .gte('event_timestamp', dateRange.start)
        .lte('event_timestamp', dateRange.end)

      // Count Level B interventions for this domain
      const { count: levelBCount } = await supabase
        .from(Tables.levelBInterventions)
        .select('*', { count: 'exact', head: true })
        .eq('domain_id', domain.id)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)

      // Calculate repeat rate (students with 2+ Level A in same domain within 10 days)
      const { data: repeats } = await supabase.rpc('count_repeat_students_by_domain', {
        p_domain_id: domain.id,
        p_start_date: dateRange.start,
        p_end_date: dateRange.end,
      })

      const totalStudents = levelACount ?? 0
      const repeatRate = totalStudents > 0 ? ((repeats ?? 0) / totalStudents) * 100 : 0

      return {
        domain_key: domain.domain_key as BehavioralDomainKey,
        domain_name: domain.domain_name,
        level_a_count: levelACount ?? 0,
        level_b_count: levelBCount ?? 0,
        repeat_rate: Math.round(repeatRate),
      }
    })
  )

  return metrics
}

/**
 * Get escalation metrics
 */
export async function getEscalationMetrics(
  dateRange: { start: string; end: string }
): Promise<EscalationMetrics> {
  const supabase = getSupabaseAdmin()

  // Count Level A that escalated to B
  const { count: aToBCount } = await supabase
    .from(Tables.levelAInterventions)
    .select('*', { count: 'exact', head: true })
    .eq('escalated_to_b', true)
    .gte('event_timestamp', dateRange.start)
    .lte('event_timestamp', dateRange.end)

  // Total Level A
  const { count: totalA } = await supabase
    .from(Tables.levelAInterventions)
    .select('*', { count: 'exact', head: true })
    .gte('event_timestamp', dateRange.start)
    .lte('event_timestamp', dateRange.end)

  // Count Level B that escalated to C
  const { count: bToCCount } = await supabase
    .from(Tables.levelBInterventions)
    .select('*', { count: 'exact', head: true })
    .eq('escalated_to_c', true)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  // Total Level B
  const { count: totalB } = await supabase
    .from(Tables.levelBInterventions)
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  const aToB = aToBCount ?? 0
  const bToC = bToCCount ?? 0

  return {
    a_to_b_count: aToB,
    a_to_b_rate: totalA && totalA > 0 ? Math.round((aToB / totalA) * 100) : 0,
    b_to_c_count: bToC,
    b_to_c_rate: totalB && totalB > 0 ? Math.round((bToC / totalB) * 100) : 0,
  }
}

/**
 * Get outcome/success metrics
 */
export async function getOutcomeMetrics(
  dateRange: { start: string; end: string }
): Promise<OutcomeMetrics> {
  const supabase = getSupabaseAdmin()

  // Level B outcomes
  const { data: levelBData } = await supabase
    .from(Tables.levelBInterventions)
    .select('status')
    .in('status', ['completed_success', 'completed_escalated'])
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  const levelBCompleted = levelBData?.length ?? 0
  const levelBSuccess = levelBData?.filter((b) => b.status === 'completed_success').length ?? 0

  // Level C outcomes
  const { data: levelCData } = await supabase
    .from(Tables.levelCCases)
    .select('outcome_status')
    .in('outcome_status', ['closed_success', 'closed_continued_support', 'closed_escalated'])
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  const levelCCompleted = levelCData?.length ?? 0
  const levelCSuccess =
    levelCData?.filter(
      (c) => c.outcome_status === 'closed_success' || c.outcome_status === 'closed_continued_support'
    ).length ?? 0

  // Re-entry outcomes
  const { data: reentryData } = await supabase
    .from(Tables.reentryProtocols)
    .select('outcome')
    .eq('status', 'completed')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  const reentryCompleted = reentryData?.length ?? 0
  const reentrySuccess =
    reentryData?.filter((r) => r.outcome === 'success' || r.outcome === 'partial').length ?? 0

  return {
    level_b_completed: levelBCompleted,
    level_b_success_rate: levelBCompleted > 0 ? Math.round((levelBSuccess / levelBCompleted) * 100) : 0,
    level_c_completed: levelCCompleted,
    level_c_success_rate: levelCCompleted > 0 ? Math.round((levelCSuccess / levelCCompleted) * 100) : 0,
    reentry_success_rate: reentryCompleted > 0 ? Math.round((reentrySuccess / reentryCompleted) * 100) : 0,
  }
}

/**
 * Get weekly trend data for the past 8 weeks
 */
export async function getWeeklyTrends(): Promise<TrendDataPoint[]> {
  const supabase = getSupabaseAdmin()
  const trends: TrendDataPoint[] = []

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const startStr = weekStart.toISOString()
    const endStr = weekEnd.toISOString()

    const [levelAResult, levelBResult, levelCResult] = await Promise.all([
      supabase
        .from(Tables.levelAInterventions)
        .select('*', { count: 'exact', head: true })
        .gte('event_timestamp', startStr)
        .lte('event_timestamp', endStr),
      supabase
        .from(Tables.levelBInterventions)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr),
      supabase
        .from(Tables.levelCCases)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr),
    ])

    trends.push({
      date: weekStart.toISOString().split('T')[0],
      level_a: levelAResult.count ?? 0,
      level_b: levelBResult.count ?? 0,
      level_c: levelCResult.count ?? 0,
    })
  }

  return trends
}

/**
 * Get recent activity across all intervention types
 */
export async function getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
  const supabase = getSupabaseAdmin()

  const [levelAData, levelBData, levelCData, reentryData] = await Promise.all([
    supabase
      .from(Tables.levelAInterventions)
      .select('id, student_id, intervention_type, event_timestamp')
      .order('event_timestamp', { ascending: false })
      .limit(5),
    supabase
      .from(Tables.levelBInterventions)
      .select('id, student_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from(Tables.levelCCases)
      .select('id, student_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from(Tables.reentryProtocols)
      .select('id, student_id, status, source_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const activities: RecentActivity[] = []

  // Process Level A
  for (const item of levelAData.data ?? []) {
    activities.push({
      id: item.id,
      type: 'level_a',
      student_name: 'Student',
      description: `Level A intervention (${item.intervention_type.replace('_', ' ')})`,
      timestamp: item.event_timestamp,
    })
  }

  // Process Level B
  for (const item of levelBData.data ?? []) {
    activities.push({
      id: item.id,
      type: 'level_b',
      student_name: 'Student',
      description: `Level B reset conference (${item.status.replace('_', ' ')})`,
      timestamp: item.created_at,
    })
  }

  // Process Level C
  for (const item of levelCData.data ?? []) {
    activities.push({
      id: item.id,
      type: 'level_c',
      student_name: 'Student',
      description: `Level C case opened (${item.status.replace('_', ' ')})`,
      timestamp: item.created_at,
    })
  }

  // Process Re-entry
  for (const item of reentryData.data ?? []) {
    activities.push({
      id: item.id,
      type: 'reentry',
      student_name: 'Student',
      description: `Re-entry protocol (${item.source_type.replace('_', ' ')})`,
      timestamp: item.created_at,
    })
  }

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

/**
 * Get default date range (last 30 days)
 */
function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}
