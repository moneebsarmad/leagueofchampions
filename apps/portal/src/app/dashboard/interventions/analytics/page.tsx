'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface InterventionSummary {
  level_a_count: number
  level_b_count: number
  level_c_count: number
  reentry_count: number
  distribution_healthy: boolean
}

interface DomainMetrics {
  domain_key: string
  domain_name: string
  level_a_count: number
  level_b_count: number
  repeat_rate: number
}

interface EscalationMetrics {
  a_to_b_count: number
  a_to_b_rate: number
  b_to_c_count: number
  b_to_c_rate: number
}

interface OutcomeMetrics {
  level_b_completed: number
  level_b_success_rate: number
  level_c_completed: number
  level_c_success_rate: number
  reentry_success_rate: number
}

interface TrendDataPoint {
  date: string
  level_a: number
  level_b: number
  level_c: number
}

interface RecentActivity {
  id: string
  type: 'level_a' | 'level_b' | 'level_c' | 'reentry'
  student_name: string
  description: string
  timestamp: string
}

interface DashboardData {
  summary: InterventionSummary
  domain_metrics: DomainMetrics[]
  escalation_metrics: EscalationMetrics
  outcome_metrics: OutcomeMetrics
  weekly_trends: TrendDataPoint[]
  recent_activity: RecentActivity[]
}

const ACTIVITY_TYPE_CONFIG = {
  level_a: { label: 'Level A', color: 'bg-green-100 text-green-800', link: '/dashboard/interventions/level-a' },
  level_b: { label: 'Level B', color: 'bg-blue-100 text-blue-800', link: '/dashboard/interventions/level-b' },
  level_c: { label: 'Level C', color: 'bg-purple-100 text-purple-800', link: '/dashboard/interventions/case-management' },
  reentry: { label: 'Re-entry', color: 'bg-yellow-100 text-yellow-800', link: '/dashboard/interventions/reentry' },
}

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const end = new Date().toISOString()

      const res = await fetch(`/api/interventions/analytics?type=dashboard&start=${start}&end=${end}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Intervention Analytics</h1>
        <div className="text-center py-12">
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Intervention Analytics</h1>
        <div className="text-center py-12">
          <p className="text-red-600">Failed to load analytics data</p>
        </div>
      </div>
    )
  }

  const totalInterventions =
    data.summary.level_a_count + data.summary.level_b_count + data.summary.level_c_count

  // Calculate distribution percentages
  const levelAPercent = totalInterventions > 0 ? (data.summary.level_a_count / totalInterventions) * 100 : 0
  const levelBPercent = totalInterventions > 0 ? (data.summary.level_b_count / totalInterventions) * 100 : 0
  const levelCPercent = totalInterventions > 0 ? (data.summary.level_c_count / totalInterventions) * 100 : 0

  // Calculate max for trend chart scaling
  const maxTrend = Math.max(
    ...data.weekly_trends.map((t) => Math.max(t.level_a, t.level_b * 3, t.level_c * 5))
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intervention Analytics</h1>
          <p className="text-gray-500 mt-1">
            Monitor the health of your A/B/C intervention system
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                dateRange === range
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Distribution Health Banner */}
      <div
        className={`rounded-lg p-4 mb-6 ${
          data.summary.distribution_healthy
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              data.summary.distribution_healthy ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <div>
            <p
              className={`font-medium ${
                data.summary.distribution_healthy ? 'text-green-800' : 'text-yellow-800'
              }`}
            >
              {data.summary.distribution_healthy
                ? 'Healthy Distribution'
                : 'Distribution Needs Attention'}
            </p>
            <p
              className={`text-sm ${
                data.summary.distribution_healthy ? 'text-green-600' : 'text-yellow-600'
              }`}
            >
              {data.summary.distribution_healthy
                ? 'Your intervention pyramid is balanced: Many Level A, Some Level B, Few Level C'
                : 'Consider increasing Level A interventions to prevent escalations'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Link
          href="/dashboard/interventions/level-a"
          className="bg-white rounded-lg border p-6 hover:border-green-300 transition-colors"
        >
          <p className="text-sm text-gray-500">Level A</p>
          <p className="text-3xl font-bold text-green-600">{data.summary.level_a_count}</p>
          <p className="text-sm text-gray-400 mt-1">{levelAPercent.toFixed(0)}% of total</p>
        </Link>
        <Link
          href="/dashboard/interventions/level-b"
          className="bg-white rounded-lg border p-6 hover:border-blue-300 transition-colors"
        >
          <p className="text-sm text-gray-500">Level B</p>
          <p className="text-3xl font-bold text-blue-600">{data.summary.level_b_count}</p>
          <p className="text-sm text-gray-400 mt-1">{levelBPercent.toFixed(0)}% of total</p>
        </Link>
        <Link
          href="/dashboard/interventions/case-management"
          className="bg-white rounded-lg border p-6 hover:border-purple-300 transition-colors"
        >
          <p className="text-sm text-gray-500">Level C</p>
          <p className="text-3xl font-bold text-purple-600">{data.summary.level_c_count}</p>
          <p className="text-sm text-gray-400 mt-1">{levelCPercent.toFixed(0)}% of total</p>
        </Link>
        <Link
          href="/dashboard/interventions/reentry"
          className="bg-white rounded-lg border p-6 hover:border-yellow-300 transition-colors"
        >
          <p className="text-sm text-gray-500">Re-entries</p>
          <p className="text-3xl font-bold text-yellow-600">{data.summary.reentry_count}</p>
          <p className="text-sm text-gray-400 mt-1">Active protocols</p>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Distribution Chart */}
        <div className="col-span-2 bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Intervention Distribution</h2>
          <div className="h-8 rounded-full overflow-hidden bg-gray-100 flex">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${levelAPercent}%` }}
              title={`Level A: ${data.summary.level_a_count} (${levelAPercent.toFixed(1)}%)`}
            />
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${levelBPercent}%` }}
              title={`Level B: ${data.summary.level_b_count} (${levelBPercent.toFixed(1)}%)`}
            />
            <div
              className="bg-purple-500 transition-all"
              style={{ width: `${levelCPercent}%` }}
              title={`Level C: ${data.summary.level_c_count} (${levelCPercent.toFixed(1)}%)`}
            />
          </div>
          <div className="flex justify-between mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500" /> Level A
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-500" /> Level B
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-purple-500" /> Level C
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Target: ~70% Level A, ~25% Level B, ~5% Level C
          </p>
        </div>

        {/* Escalation Rates */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Escalation Rates</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">A &rarr; B</span>
                <span className="font-medium">{data.escalation_metrics.a_to_b_rate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    data.escalation_metrics.a_to_b_rate > 20 ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(data.escalation_metrics.a_to_b_rate, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {data.escalation_metrics.a_to_b_count} escalations
              </p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">B &rarr; C</span>
                <span className="font-medium">{data.escalation_metrics.b_to_c_rate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    data.escalation_metrics.b_to_c_rate > 15 ? 'bg-red-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(data.escalation_metrics.b_to_c_rate, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {data.escalation_metrics.b_to_c_count} escalations
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Target: A&rarr;B &lt;20%, B&rarr;C &lt;15%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Domain Breakdown */}
        <div className="col-span-2 bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">By Behavioral Domain</h2>
          <div className="space-y-4">
            {data.domain_metrics.map((domain) => (
              <div key={domain.domain_key} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">{domain.domain_name}</div>
                <div className="flex-1">
                  <div className="flex gap-1 mb-1">
                    <div
                      className="h-6 bg-green-500 rounded-l"
                      style={{
                        width: `${(domain.level_a_count / Math.max(totalInterventions, 1)) * 100}%`,
                      }}
                      title={`Level A: ${domain.level_a_count}`}
                    />
                    <div
                      className="h-6 bg-blue-500 rounded-r"
                      style={{
                        width: `${(domain.level_b_count / Math.max(totalInterventions, 1)) * 100}%`,
                      }}
                      title={`Level B: ${domain.level_b_count}`}
                    />
                  </div>
                </div>
                <div className="w-24 text-right">
                  <span
                    className={`text-sm font-medium ${
                      domain.repeat_rate > 25 ? 'text-red-600' : 'text-gray-600'
                    }`}
                  >
                    {domain.repeat_rate}% repeat
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Success Rates */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Success Rates</h2>
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {data.outcome_metrics.level_b_success_rate}%
              </p>
              <p className="text-sm text-blue-700">Level B Success</p>
              <p className="text-xs text-blue-500">
                {data.outcome_metrics.level_b_completed} completed
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">
                {data.outcome_metrics.level_c_success_rate}%
              </p>
              <p className="text-sm text-purple-700">Level C Success</p>
              <p className="text-xs text-purple-500">
                {data.outcome_metrics.level_c_completed} completed
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">
                {data.outcome_metrics.reentry_success_rate}%
              </p>
              <p className="text-sm text-yellow-700">Re-entry Success</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trends */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Weekly Trends (8 Weeks)</h2>
        <div className="flex items-end gap-4 h-40">
          {data.weekly_trends.map((week, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col gap-0.5">
                <div
                  className="w-full bg-green-500 rounded-t"
                  style={{
                    height: `${maxTrend > 0 ? (week.level_a / maxTrend) * 100 : 0}px`,
                    minHeight: week.level_a > 0 ? '4px' : '0',
                  }}
                  title={`Level A: ${week.level_a}`}
                />
                <div
                  className="w-full bg-blue-500"
                  style={{
                    height: `${maxTrend > 0 ? ((week.level_b * 3) / maxTrend) * 100 : 0}px`,
                    minHeight: week.level_b > 0 ? '4px' : '0',
                  }}
                  title={`Level B: ${week.level_b}`}
                />
                <div
                  className="w-full bg-purple-500 rounded-b"
                  style={{
                    height: `${maxTrend > 0 ? ((week.level_c * 5) / maxTrend) * 100 : 0}px`,
                    minHeight: week.level_c > 0 ? '4px' : '0',
                  }}
                  title={`Level C: ${week.level_c}`}
                />
              </div>
              <span className="text-xs text-gray-500">{formatDate(week.date)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">
          Note: Level B and C bars are scaled up for visibility (3x and 5x respectively)
        </p>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {data.recent_activity.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            data.recent_activity.map((activity) => (
              <Link
                key={activity.id}
                href={
                  activity.type === 'level_b'
                    ? `/dashboard/interventions/level-b/${activity.id}`
                    : activity.type === 'level_c'
                      ? `/dashboard/interventions/case-management/${activity.id}`
                      : activity.type === 'reentry'
                        ? `/dashboard/interventions/reentry/${activity.id}`
                        : ACTIVITY_TYPE_CONFIG[activity.type].link
                }
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${ACTIVITY_TYPE_CONFIG[activity.type].color}`}
                >
                  {ACTIVITY_TYPE_CONFIG[activity.type].label}
                </span>
                <span className="flex-1 text-gray-700">{activity.description}</span>
                <span className="text-sm text-gray-400">{formatDateTime(activity.timestamp)}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
