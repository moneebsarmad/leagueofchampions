import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'
import {
  calculateStaffParticipation,
  calculateCategoryBalance,
  calculateHouseDistribution,
  type HealthStatus,
} from './analyticsCalculator'
import { generateStaffAnalytics } from './biasDetector'

/**
 * Alert Engine Service
 *
 * Monitors system metrics and triggers alerts when thresholds are crossed:
 * - Low staff participation
 * - Category imbalance
 * - House point variance
 * - Staff outlier behavior
 * - Point inflation
 */

export type AlertType =
  | 'LOW_PARTICIPATION'
  | 'CATEGORY_DRIFT'
  | 'HOUSE_IMBALANCE'
  | 'OUTLIER_BEHAVIOR'
  | 'INFLATION'
  | 'STAFF_INACTIVE'

export type AlertSeverity = 'AMBER' | 'RED'

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'

export type Alert = {
  id?: string
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  recommended_action: string | null
  triggered_by_data: Record<string, unknown>
  related_staff_email: string | null
  related_metric: string
  metric_value: number
  threshold_value: number
  status: AlertStatus
  created_at?: string
}

export type AlertThreshold = {
  metric_name: string
  display_name: string
  amber_threshold: number
  red_threshold: number
  comparison_operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'
  is_enabled: boolean
  consecutive_periods: number
}

// Default thresholds (also stored in database)
const DEFAULT_THRESHOLDS: Record<string, AlertThreshold> = {
  participation_rate: {
    metric_name: 'participation_rate',
    display_name: 'Staff Participation Rate',
    amber_threshold: 70,
    red_threshold: 50,
    comparison_operator: 'lt',
    is_enabled: true,
    consecutive_periods: 1,
  },
  category_imbalance: {
    metric_name: 'category_imbalance',
    display_name: 'Category Imbalance',
    amber_threshold: 50,
    red_threshold: 60,
    comparison_operator: 'gt',
    is_enabled: true,
    consecutive_periods: 2,
  },
  house_variance: {
    metric_name: 'house_variance',
    display_name: 'House Point Variance',
    amber_threshold: 25,
    red_threshold: 35,
    comparison_operator: 'gt',
    is_enabled: true,
    consecutive_periods: 2,
  },
  days_since_point: {
    metric_name: 'days_since_point',
    display_name: 'Days Since Last Point',
    amber_threshold: 5,
    red_threshold: 10,
    comparison_operator: 'gt',
    is_enabled: true,
    consecutive_periods: 1,
  },
  staff_outlier_zscore: {
    metric_name: 'staff_outlier_zscore',
    display_name: 'Staff Outlier Z-Score',
    amber_threshold: 2.0,
    red_threshold: 3.0,
    comparison_operator: 'gt',
    is_enabled: true,
    consecutive_periods: 1,
  },
  weekly_participation_drop: {
    metric_name: 'weekly_participation_drop',
    display_name: 'Weekly Participation Drop',
    amber_threshold: 10,
    red_threshold: 20,
    comparison_operator: 'gt',
    is_enabled: true,
    consecutive_periods: 1,
  },
}

/**
 * Check if a metric value crosses a threshold
 */
function checkThreshold(
  value: number,
  threshold: AlertThreshold
): { crossed: boolean; severity: AlertSeverity | null } {
  const { amber_threshold, red_threshold, comparison_operator } = threshold

  const compare = (val: number, thresh: number): boolean => {
    switch (comparison_operator) {
      case 'lt':
        return val < thresh
      case 'lte':
        return val <= thresh
      case 'gt':
        return val > thresh
      case 'gte':
        return val >= thresh
      case 'eq':
        return val === thresh
      default:
        return false
    }
  }

  // Check RED first (more severe)
  if (compare(value, red_threshold)) {
    return { crossed: true, severity: 'RED' }
  }

  // Check AMBER
  if (compare(value, amber_threshold)) {
    return { crossed: true, severity: 'AMBER' }
  }

  return { crossed: false, severity: null }
}

/**
 * Get alert thresholds from database or use defaults
 */
export async function getAlertThresholds(): Promise<Map<string, AlertThreshold>> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.alertThresholds)
    .select('*')
    .eq('is_enabled', true)

  if (error) {
    console.warn('Failed to load thresholds from DB, using defaults:', error.message)
    return new Map(Object.entries(DEFAULT_THRESHOLDS))
  }

  const thresholds = new Map<string, AlertThreshold>()
  ;(data || []).forEach((row) => {
    thresholds.set(row.metric_name, row as AlertThreshold)
  })

  // Fill in any missing with defaults
  Object.entries(DEFAULT_THRESHOLDS).forEach(([key, threshold]) => {
    if (!thresholds.has(key)) {
      thresholds.set(key, threshold)
    }
  })

  return thresholds
}

/**
 * Check if an alert already exists for this type and is still active
 */
async function alertExists(alertType: AlertType, relatedStaffEmail?: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from(Tables.alertHistory)
    .select('id')
    .eq('alert_type', alertType)
    .eq('status', 'ACTIVE')

  if (relatedStaffEmail) {
    query = query.eq('related_staff_email', relatedStaffEmail)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    console.warn('Error checking existing alerts:', error.message)
    return false
  }

  return (data || []).length > 0
}

/**
 * Create a new alert
 */
export async function createAlert(alert: Omit<Alert, 'id' | 'created_at'>): Promise<string | null> {
  const supabase = getSupabaseAdmin()

  // Check if similar alert already exists
  const exists = await alertExists(alert.alert_type, alert.related_staff_email || undefined)
  if (exists) {
    return null // Don't create duplicate
  }

  const { data, error } = await supabase
    .from(Tables.alertHistory)
    .insert({
      ...alert,
      triggered_by_data: alert.triggered_by_data,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create alert:', error.message)
    return null
  }

  return data?.id || null
}

/**
 * Get active alerts
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.alertHistory)
    .select('*')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get active alerts:', error.message)
    return []
  }

  return (data || []) as Alert[]
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from(Tables.alertHistory)
    .update({
      status: 'ACKNOWLEDGED',
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', alertId)

  if (error) {
    console.error('Failed to acknowledge alert:', error.message)
    return false
  }

  return true
}

/**
 * Resolve an alert
 */
export async function resolveAlert(
  alertId: string,
  userId: string,
  resolutionNotes?: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from(Tables.alertHistory)
    .update({
      status: 'RESOLVED',
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', alertId)

  if (error) {
    console.error('Failed to resolve alert:', error.message)
    return false
  }

  return true
}

/**
 * Dismiss an alert
 */
export async function dismissAlert(alertId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from(Tables.alertHistory)
    .update({
      status: 'DISMISSED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', alertId)

  if (error) {
    console.error('Failed to dismiss alert:', error.message)
    return false
  }

  return true
}

/**
 * Check all thresholds and generate alerts
 */
export async function checkAllThresholds(
  startDate: string,
  endDate: string
): Promise<Alert[]> {
  const thresholds = await getAlertThresholds()
  const alerts: Alert[] = []

  // Check participation rate
  const participationThreshold = thresholds.get('participation_rate')
  if (participationThreshold?.is_enabled) {
    const participation = await calculateStaffParticipation(startDate, endDate)
    if (participation.participationRate !== null) {
      const result = checkThreshold(participation.participationRate, participationThreshold)
      if (result.crossed && result.severity) {
        alerts.push({
          alert_type: 'LOW_PARTICIPATION',
          severity: result.severity,
          title: 'Low Staff Participation',
          message: `Staff participation has dropped to ${participation.participationRate.toFixed(1)}%. ${participation.inactiveStaffList.length} staff members have not given any points.`,
          recommended_action:
            result.severity === 'RED'
              ? 'Execute re-engagement playbook: Send reminder emails, schedule department meetings, review training needs.'
              : 'Monitor closely and send gentle participation reminder to inactive staff.',
          triggered_by_data: {
            participation_rate: participation.participationRate,
            active_staff: participation.activeStaffCount,
            total_staff: participation.totalStaffCount,
            inactive_staff: participation.inactiveStaffList.slice(0, 10),
          },
          related_staff_email: null,
          related_metric: 'participation_rate',
          metric_value: participation.participationRate,
          threshold_value:
            result.severity === 'RED'
              ? participationThreshold.red_threshold
              : participationThreshold.amber_threshold,
          status: 'ACTIVE',
        })
      }
    }
  }

  // Check category balance
  const categoryThreshold = thresholds.get('category_imbalance')
  if (categoryThreshold?.is_enabled) {
    const categoryBalance = await calculateCategoryBalance(startDate, endDate)
    const maxCategoryPct = Math.max(
      categoryBalance.categoryPercentages.Respect || 0,
      categoryBalance.categoryPercentages.Responsibility || 0,
      categoryBalance.categoryPercentages.Righteousness || 0
    )

    if (maxCategoryPct > 0) {
      const result = checkThreshold(maxCategoryPct, categoryThreshold)
      if (result.crossed && result.severity) {
        alerts.push({
          alert_type: 'CATEGORY_DRIFT',
          severity: result.severity,
          title: 'Category Imbalance Detected',
          message: `${categoryBalance.dominantCategory} represents ${maxCategoryPct.toFixed(1)}% of all points. Consider encouraging recognition in other categories.`,
          recommended_action:
            'Send category balance reminder to staff. Share behavior examples for underused categories. Consider a mini calibration session.',
          triggered_by_data: {
            category_percentages: categoryBalance.categoryPercentages,
            dominant_category: categoryBalance.dominantCategory,
            balance_score: categoryBalance.balanceScore,
          },
          related_staff_email: null,
          related_metric: 'category_imbalance',
          metric_value: maxCategoryPct,
          threshold_value:
            result.severity === 'RED'
              ? categoryThreshold.red_threshold
              : categoryThreshold.amber_threshold,
          status: 'ACTIVE',
        })
      }
    }
  }

  // Check house variance
  const houseThreshold = thresholds.get('house_variance')
  if (houseThreshold?.is_enabled) {
    const houseDistribution = await calculateHouseDistribution(startDate, endDate)
    const result = checkThreshold(houseDistribution.variance, houseThreshold)
    if (result.crossed && result.severity) {
      // Find most/least favored houses
      const housePoints = Object.entries(houseDistribution.housePoints)
      const sorted = housePoints.sort((a, b) => b[1] - a[1])
      const highest = sorted[0]
      const lowest = sorted[sorted.length - 1]

      alerts.push({
        alert_type: 'HOUSE_IMBALANCE',
        severity: result.severity,
        title: 'House Point Imbalance',
        message: `House point variance is ${houseDistribution.variance.toFixed(1)}%. ${highest[0]} has ${highest[1]} points while ${lowest[0]} has only ${lowest[1]} points.`,
        recommended_action:
          'Review house distribution by staff. Check for structural issues in class assignments. Discuss findings with house mentors.',
        triggered_by_data: {
          house_points: houseDistribution.housePoints,
          variance: houseDistribution.variance,
          balance_score: houseDistribution.balanceScore,
        },
        related_staff_email: null,
        related_metric: 'house_variance',
        metric_value: houseDistribution.variance,
        threshold_value:
          result.severity === 'RED'
            ? houseThreshold.red_threshold
            : houseThreshold.amber_threshold,
        status: 'ACTIVE',
      })
    }
  }

  // Check for staff outliers
  const outlierThreshold = thresholds.get('staff_outlier_zscore')
  if (outlierThreshold?.is_enabled) {
    const staffAnalytics = await generateStaffAnalytics(startDate, endDate)
    const outliers = staffAnalytics.filter((s) => s.outlier_flag && Math.abs(s.z_score || 0) >= outlierThreshold.amber_threshold)

    for (const outlier of outliers) {
      const zScore = Math.abs(outlier.z_score || 0)
      const result = checkThreshold(zScore, outlierThreshold)
      if (result.crossed && result.severity) {
        alerts.push({
          alert_type: 'OUTLIER_BEHAVIOR',
          severity: result.severity,
          title: `Staff Outlier: ${outlier.staff_name}`,
          message: outlier.outlier_reason || `Staff member has unusual point-giving pattern (z-score: ${zScore.toFixed(2)})`,
          recommended_action:
            'Review individual staff metrics. Schedule a private conversation to understand context and provide guidance.',
          triggered_by_data: {
            staff_name: outlier.staff_name,
            points_given: outlier.points_given_period,
            school_average: outlier.school_avg_points,
            z_score: outlier.z_score,
          },
          related_staff_email: outlier.staff_email,
          related_metric: 'staff_outlier_zscore',
          metric_value: zScore,
          threshold_value:
            result.severity === 'RED'
              ? outlierThreshold.red_threshold
              : outlierThreshold.amber_threshold,
          status: 'ACTIVE',
        })
      }
    }
  }

  // Create alerts in database
  for (const alert of alerts) {
    await createAlert(alert)
  }

  return alerts
}

/**
 * Get alert history with filters
 */
export async function getAlertHistory(options: {
  status?: AlertStatus
  alertType?: AlertType
  severity?: AlertSeverity
  limit?: number
  offset?: number
}): Promise<{ alerts: Alert[]; total: number }> {
  const supabase = getSupabaseAdmin()

  let query = supabase.from(Tables.alertHistory).select('*', { count: 'exact' })

  if (options.status) {
    query = query.eq('status', options.status)
  }
  if (options.alertType) {
    query = query.eq('alert_type', options.alertType)
  }
  if (options.severity) {
    query = query.eq('severity', options.severity)
  }

  query = query.order('created_at', { ascending: false })

  if (options.limit) {
    query = query.limit(options.limit)
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to get alert history:', error.message)
    return { alerts: [], total: 0 }
  }

  return {
    alerts: (data || []) as Alert[],
    total: count || 0,
  }
}

/**
 * Get alert summary for dashboard
 */
export async function getAlertSummary(): Promise<{
  activeCount: number
  redCount: number
  amberCount: number
  recentAlerts: Alert[]
}> {
  const supabase = getSupabaseAdmin()

  try {
    const [activeRes, redRes, amberRes, recentRes] = await Promise.all([
      supabase
        .from(Tables.alertHistory)
        .select('id', { count: 'exact' })
        .eq('status', 'ACTIVE'),
      supabase
        .from(Tables.alertHistory)
        .select('id', { count: 'exact' })
        .eq('status', 'ACTIVE')
        .eq('severity', 'RED'),
      supabase
        .from(Tables.alertHistory)
        .select('id', { count: 'exact' })
        .eq('status', 'ACTIVE')
        .eq('severity', 'AMBER'),
      supabase
        .from(Tables.alertHistory)
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    // Check if table doesn't exist (error code 42P01)
    if (activeRes.error?.code === '42P01') {
      console.warn('alert_history table does not exist - run migration 007_tier2_analytics.sql')
      return { activeCount: 0, redCount: 0, amberCount: 0, recentAlerts: [] }
    }

    return {
      activeCount: activeRes.count || 0,
      redCount: redRes.count || 0,
      amberCount: amberRes.count || 0,
      recentAlerts: (recentRes.data || []) as Alert[],
    }
  } catch (error) {
    // Gracefully handle missing table
    console.warn('Alert summary failed (table may not exist):', error)
    return { activeCount: 0, redCount: 0, amberCount: 0, recentAlerts: [] }
  }
}

/**
 * Auto-resolve stale alerts (older than specified days)
 */
export async function autoResolveStaleAlerts(daysOld: number = 30): Promise<number> {
  const supabase = getSupabaseAdmin()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const { data, error } = await supabase
    .from(Tables.alertHistory)
    .update({
      status: 'RESOLVED',
      resolution_notes: 'Auto-resolved due to age',
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'ACTIVE')
    .lt('created_at', cutoffDate.toISOString())
    .select('id')

  if (error) {
    console.error('Failed to auto-resolve stale alerts:', error.message)
    return 0
  }

  return data?.length || 0
}
