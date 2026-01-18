import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { Tables } from '@/lib/supabase/tables'
import {
  calculateStaffParticipation,
  calculatePointEconomy,
  calculateCategoryBalance,
  calculateHouseDistribution,
  calculateCompositeHealthScore,
  calculateConsistencyScore,
} from './analyticsCalculator'
import { getAlertSummary } from './alertEngine'
import { sendTemplatedEmail } from './emailService'

/**
 * Digest Generator Service
 *
 * Generates weekly implementation digests and quarterly board reports.
 */

type WeeklyDigestData = {
  weekStart: string
  weekEnd: string
  healthStatus: 'GREEN' | 'AMBER' | 'RED'
  healthScore: number
  participationRate: number | null
  totalPoints: number
  activeStaff: number
  totalStaff: number
  insights: string[]
  actions: string[]
  categoryBalance: Record<string, number>
  houseDistribution: Record<string, number>
  alerts: {
    activeCount: number
    redCount: number
    amberCount: number
  }
}

type QuarterlyReportData = {
  quarter: string
  year: number
  executiveSummary: string
  kpis: Array<{
    name: string
    current: string
    previous: string
    change: string
  }>
  highlights: string[]
  challenges: string[]
  nextQuarter: string[]
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/**
 * Generate insights based on metrics
 */
function generateInsights(data: {
  participationRate: number | null
  totalPoints: number
  categoryBalance: { dominantCategory: string | null; isBalanced: boolean }
  houseDistribution: { variance: number; isBalanced: boolean }
  alertSummary: { activeCount: number; redCount: number }
}): string[] {
  const insights: string[] = []

  // Participation insights
  if (data.participationRate !== null) {
    if (data.participationRate >= 80) {
      insights.push(`Excellent participation rate at ${data.participationRate.toFixed(0)}%`)
    } else if (data.participationRate >= 60) {
      insights.push(`Participation rate is moderate at ${data.participationRate.toFixed(0)}%`)
    } else {
      insights.push(`Participation rate needs attention at ${data.participationRate.toFixed(0)}%`)
    }
  }

  // Points insights
  if (data.totalPoints > 0) {
    insights.push(`${data.totalPoints.toLocaleString()} total points awarded this period`)
  }

  // Category balance insights
  if (data.categoryBalance.isBalanced) {
    insights.push('Category distribution is well-balanced across the 3Rs')
  } else if (data.categoryBalance.dominantCategory) {
    insights.push(`${data.categoryBalance.dominantCategory} category is dominant - consider diversifying`)
  }

  // House balance insights
  if (data.houseDistribution.isBalanced) {
    insights.push('House point distribution is equitable')
  } else if (data.houseDistribution.variance > 30) {
    insights.push(`Significant house imbalance detected (${data.houseDistribution.variance.toFixed(0)}% variance)`)
  }

  // Alert insights
  if (data.alertSummary.redCount > 0) {
    insights.push(`${data.alertSummary.redCount} critical alert(s) require immediate attention`)
  } else if (data.alertSummary.activeCount > 0) {
    insights.push(`${data.alertSummary.activeCount} active alert(s) to review`)
  } else {
    insights.push('No active alerts - system is healthy')
  }

  return insights.slice(0, 5) // Limit to 5 insights
}

/**
 * Generate recommended actions based on metrics
 */
function generateActions(data: {
  participationRate: number | null
  categoryBalance: { dominantCategory: string | null; isBalanced: boolean }
  houseDistribution: { variance: number }
  alertSummary: { redCount: number; amberCount: number }
  inactiveStaffCount: number
}): string[] {
  const actions: string[] = []

  // Participation actions
  if (data.participationRate !== null && data.participationRate < 70) {
    actions.push('Send participation reminder to inactive staff')
  }

  if (data.inactiveStaffCount > 5) {
    actions.push(`Follow up with ${data.inactiveStaffCount} inactive staff members`)
  }

  // Category balance actions
  if (!data.categoryBalance.isBalanced && data.categoryBalance.dominantCategory) {
    actions.push(`Encourage recognition in categories other than ${data.categoryBalance.dominantCategory}`)
  }

  // House balance actions
  if (data.houseDistribution.variance > 25) {
    actions.push('Review point distribution patterns by staff')
  }

  // Alert actions
  if (data.alertSummary.redCount > 0) {
    actions.push('Address critical alerts immediately')
  } else if (data.alertSummary.amberCount > 0) {
    actions.push('Review and address warning-level alerts')
  }

  // Default action
  if (actions.length === 0) {
    actions.push('Continue current implementation practices')
    actions.push('Schedule next huddle to review progress')
  }

  return actions.slice(0, 5) // Limit to 5 actions
}

/**
 * Generate weekly digest data
 */
export async function generateWeeklyDigest(
  startDate: string,
  endDate: string
): Promise<WeeklyDigestData> {
  // Fetch all metrics
  const [participation, economy, categoryBalance, houseDistribution, alertSummary, consistency] =
    await Promise.all([
      calculateStaffParticipation(startDate, endDate),
      calculatePointEconomy(startDate, endDate),
      calculateCategoryBalance(startDate, endDate),
      calculateHouseDistribution(startDate, endDate),
      getAlertSummary(),
      calculateConsistencyScore(startDate, endDate),
    ])

  // Calculate composite health score
  const { score: healthScore, status: healthStatus } = calculateCompositeHealthScore(
    participation.participationRate,
    categoryBalance.balanceScore,
    houseDistribution.balanceScore,
    consistency
  )

  // Generate insights and actions
  const insights = generateInsights({
    participationRate: participation.participationRate,
    totalPoints: economy.totalPoints,
    categoryBalance,
    houseDistribution,
    alertSummary,
  })

  const actions = generateActions({
    participationRate: participation.participationRate,
    categoryBalance,
    houseDistribution,
    alertSummary,
    inactiveStaffCount: participation.inactiveStaffList.length,
  })

  return {
    weekStart: startDate,
    weekEnd: endDate,
    healthStatus,
    healthScore,
    participationRate: participation.participationRate,
    totalPoints: economy.totalPoints,
    activeStaff: participation.activeStaffCount,
    totalStaff: participation.totalStaffCount,
    insights,
    actions,
    categoryBalance: categoryBalance.categoryPercentages,
    houseDistribution: houseDistribution.housePoints,
    alerts: {
      activeCount: alertSummary.activeCount,
      redCount: alertSummary.redCount,
      amberCount: alertSummary.amberCount,
    },
  }
}

/**
 * Send weekly digest emails
 */
export async function sendWeeklyDigestEmails(
  digestData: WeeklyDigestData,
  recipients: string[]
): Promise<number> {
  let sent = 0

  const variables = {
    week_start: digestData.weekStart,
    week_end: digestData.weekEnd,
    health_status: digestData.healthStatus,
    health_score: digestData.healthScore,
    participation_rate: digestData.participationRate?.toFixed(0) || 'N/A',
    total_points: digestData.totalPoints.toLocaleString(),
    active_staff: digestData.activeStaff,
    total_staff: digestData.totalStaff,
    insights: digestData.insights,
    actions: digestData.actions,
    dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard/tier2-analytics`,
  }

  for (const email of recipients) {
    const id = await sendTemplatedEmail('weekly_digest', email, undefined, variables)
    if (id) sent++
  }

  return sent
}

/**
 * Generate quarterly board report data
 */
export async function generateQuarterlyReport(
  quarter: string,
  year: number,
  startDate: string,
  endDate: string
): Promise<QuarterlyReportData> {
  const supabase = getSupabaseAdmin()

  // Get current quarter metrics
  const [participation, economy, categoryBalance, houseDistribution] = await Promise.all([
    calculateStaffParticipation(startDate, endDate),
    calculatePointEconomy(startDate, endDate),
    calculateCategoryBalance(startDate, endDate),
    calculateHouseDistribution(startDate, endDate),
  ])

  // Try to get previous quarter snapshot for comparison
  const { data: prevSnapshot } = await supabase
    .from(Tables.analyticsSnapshots)
    .select('*')
    .eq('snapshot_type', 'monthly')
    .lt('snapshot_date', startDate)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Build KPIs with comparison
  const kpis = [
    {
      name: 'Staff Participation Rate',
      current: `${participation.participationRate?.toFixed(0) || 'N/A'}%`,
      previous: prevSnapshot?.staff_participation_rate
        ? `${prevSnapshot.staff_participation_rate.toFixed(0)}%`
        : 'N/A',
      change: prevSnapshot?.staff_participation_rate && participation.participationRate
        ? `${((participation.participationRate - prevSnapshot.staff_participation_rate)).toFixed(0)}%`
        : 'N/A',
    },
    {
      name: 'Total Points Awarded',
      current: economy.totalPoints.toLocaleString(),
      previous: prevSnapshot?.total_points_awarded
        ? prevSnapshot.total_points_awarded.toLocaleString()
        : 'N/A',
      change: prevSnapshot?.total_points_awarded
        ? `${(((economy.totalPoints - prevSnapshot.total_points_awarded) / prevSnapshot.total_points_awarded) * 100).toFixed(0)}%`
        : 'N/A',
    },
    {
      name: 'Category Balance Score',
      current: `${categoryBalance.balanceScore.toFixed(0)}/100`,
      previous: prevSnapshot?.category_balance_score
        ? `${prevSnapshot.category_balance_score}/100`
        : 'N/A',
      change: prevSnapshot?.category_balance_score
        ? `${categoryBalance.balanceScore - prevSnapshot.category_balance_score}`
        : 'N/A',
    },
    {
      name: 'House Balance Score',
      current: `${houseDistribution.balanceScore.toFixed(0)}/100`,
      previous: prevSnapshot?.house_balance_score
        ? `${prevSnapshot.house_balance_score}/100`
        : 'N/A',
      change: prevSnapshot?.house_balance_score
        ? `${houseDistribution.balanceScore - prevSnapshot.house_balance_score}`
        : 'N/A',
    },
  ]

  // Generate executive summary
  const participationDesc =
    participation.participationRate && participation.participationRate >= 70
      ? 'strong'
      : participation.participationRate && participation.participationRate >= 50
        ? 'moderate'
        : 'below target'
  const executiveSummary = `During ${quarter} ${year}, the League of Champions system maintained ${participationDesc} staff engagement with ${participation.activeStaffCount} active staff members. A total of ${economy.totalPoints.toLocaleString()} merit points were awarded across ${economy.totalTransactions} transactions.`

  // Generate highlights
  const highlights: string[] = []
  if (participation.participationRate && participation.participationRate >= 70) {
    highlights.push('Staff participation exceeded 70% target')
  }
  if (categoryBalance.isBalanced) {
    highlights.push('Category balance maintained across the 3Rs framework')
  }
  if (houseDistribution.isBalanced) {
    highlights.push('House point distribution remained equitable')
  }
  highlights.push(`${economy.totalTransactions} recognition events recorded`)

  // Generate challenges
  const challenges: string[] = []
  if (participation.participationRate && participation.participationRate < 70) {
    challenges.push(`Staff participation at ${participation.participationRate.toFixed(0)}% - below 70% target`)
  }
  if (!categoryBalance.isBalanced && categoryBalance.dominantCategory) {
    challenges.push(`${categoryBalance.dominantCategory} category dominance requires calibration`)
  }
  if (participation.inactiveStaffList.length > 0) {
    challenges.push(`${participation.inactiveStaffList.length} staff members showed no activity`)
  }

  // Generate next quarter focus
  const nextQuarter: string[] = [
    'Continue monitoring staff engagement patterns',
    'Schedule quarterly calibration session',
    'Review and refresh training materials if needed',
  ]
  if (participation.participationRate && participation.participationRate < 70) {
    nextQuarter.unshift('Implement participation improvement initiative')
  }

  return {
    quarter,
    year,
    executiveSummary,
    kpis,
    highlights: highlights.slice(0, 5),
    challenges: challenges.length > 0 ? challenges : ['No significant challenges this quarter'],
    nextQuarter,
  }
}

/**
 * Save report to history
 */
export async function saveReportToHistory(
  reportType: string,
  reportName: string,
  periodStart: string,
  periodEnd: string,
  reportData: Record<string, unknown>,
  generatedBy?: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(Tables.reportHistory)
    .insert({
      report_type: reportType,
      report_name: reportName,
      period_start: periodStart,
      period_end: periodEnd,
      report_data: reportData,
      generated_by: generatedBy || null,
      generated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to save report:', error.message)
    return null
  }

  return data?.id || null
}
