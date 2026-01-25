'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import CrestLoader from '../../../components/CrestLoader'
import { RequireStaff, AccessDenied } from '../../../components/PermissionGate'

interface DomainData {
  id: number
  domain_key: string
  display_name: string
  color: string
}

interface DomainHealth {
  id: number
  domain_key: string
  display_name: string
  color: string
  currentPoints: number
  previousPoints: number
  trend: 'up' | 'down' | 'stable'
  percentage: number
}

interface MeritEntry {
  domain_id: number | null
  points: number
  timestamp: string
}

function getAcademicWeek(): number {
  const now = new Date()
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  const academicStart = new Date(year, 7, 15) // Aug 15
  const diffTime = now.getTime() - academicStart.getTime()
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1
  return Math.max(1, diffWeeks)
}

export default function CultureHealthPage() {
  const [domains, setDomains] = useState<DomainData[]>([])
  const [domainHealth, setDomainHealth] = useState<DomainHealth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch domains
      const { data: domainsData } = await supabase
        .from('merit_domains')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      const allDomains: DomainData[] = (domainsData || []).map((d) => ({
        id: d.id,
        domain_key: d.domain_key || '',
        display_name: d.display_name || '',
        color: d.color || '#2D5016',
      }))
      setDomains(allDomains)

      // Calculate date ranges
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      // Fetch merit_log entries from last 14 days
      const { data: meritData } = await supabase
        .from('merit_log')
        .select('domain_id, points, timestamp')
        .gte('timestamp', fourteenDaysAgo.toISOString())

      const entries: MeritEntry[] = (meritData || []).map((m) => ({
        domain_id: m.domain_id,
        points: m.points || 0,
        timestamp: m.timestamp || '',
      }))

      // Calculate health metrics per domain
      const healthData: DomainHealth[] = allDomains.map((domain) => {
        const domainEntries = entries.filter((e) => e.domain_id === domain.id)

        const currentPoints = domainEntries
          .filter((e) => new Date(e.timestamp) >= sevenDaysAgo)
          .reduce((sum, e) => sum + e.points, 0)

        const previousPoints = domainEntries
          .filter((e) => {
            const ts = new Date(e.timestamp)
            return ts >= fourteenDaysAgo && ts < sevenDaysAgo
          })
          .reduce((sum, e) => sum + e.points, 0)

        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (currentPoints > previousPoints * 1.1) {
          trend = 'up'
        } else if (currentPoints < previousPoints * 0.9) {
          trend = 'down'
        }

        return {
          ...domain,
          currentPoints,
          previousPoints,
          trend,
          percentage: 0, // Will be calculated after we have all totals
        }
      })

      // Calculate percentages based on total points across all domains
      const totalCurrentPoints = healthData.reduce((sum, d) => sum + d.currentPoints, 0)

      const healthWithPercentages = healthData.map((d) => ({
        ...d,
        percentage: totalCurrentPoints > 0
          ? Math.round((d.currentPoints / totalCurrentPoints) * 100)
          : 20, // Equal distribution if no points
      }))

      setDomainHealth(healthWithPercentages)
    } catch (error) {
      console.error('Error fetching culture health data:', error)
    } finally {
      setLoading(false)
    }
  }

  const overallHealth = useMemo(() => {
    if (domainHealth.length === 0) return 0
    // Calculate overall health based on whether all domains have activity
    const activeDomainsCount = domainHealth.filter((d) => d.currentPoints > 0).length
    const totalDomains = domainHealth.length
    const activityScore = totalDomains > 0 ? Math.round((activeDomainsCount / totalDomains) * 100) : 0

    // Factor in trends
    const upTrends = domainHealth.filter((d) => d.trend === 'up').length
    const downTrends = domainHealth.filter((d) => d.trend === 'down').length
    const trendBonus = (upTrends - downTrends) * 5

    return Math.max(0, Math.min(100, activityScore + trendBonus))
  }, [domainHealth])

  const actionableInsight = useMemo(() => {
    if (domainHealth.length === 0) return null

    const lowestDomain = [...domainHealth].sort((a, b) => a.percentage - b.percentage)[0]
    const decliningDomains = domainHealth.filter((d) => d.trend === 'down')

    if (decliningDomains.length > 0) {
      const declining = decliningDomains[0]
      const changePercent = declining.previousPoints > 0
        ? Math.round(((declining.previousPoints - declining.currentPoints) / declining.previousPoints) * 100)
        : 0
      return {
        domain: declining.display_name,
        message: `${declining.display_name} shows a ${changePercent}% decline this week. Consider focusing recognition efforts in this area.`,
      }
    }

    if (lowestDomain && lowestDomain.percentage < 15) {
      return {
        domain: lowestDomain.display_name,
        message: `${lowestDomain.display_name} has the lowest recognition activity. Consider proactive intervention before issues arise.`,
      }
    }

    return null
  }, [domainHealth])

  const weekNumber = getAcademicWeek()

  if (loading) {
    return <CrestLoader label="Loading culture health..." />
  }

  return (
    <RequireStaff fallback={<AccessDenied message="Admin access required to view Culture Health Dashboard." />}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1a1a1a] mb-1" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Culture Health Dashboard
            </h1>
            <p className="text-[#1a1a1a]/50 text-sm">Week {weekNumber} Overview - All Domains</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-[#2D5016]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              {overallHealth}%
            </p>
            <p className="text-sm text-[#1a1a1a]/50">Overall Health</p>
          </div>
        </div>

        {/* Domain Health Cards */}
        <div className="space-y-4 mb-6">
          {domainHealth.map((domain) => (
            <div
              key={domain.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-[#B8860B]/10"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#1a1a1a]">{domain.display_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1a1a1a]">{domain.percentage}%</span>
                  <span className={`text-lg ${
                    domain.trend === 'up' ? 'text-green-600' :
                    domain.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {domain.trend === 'up' ? '↑' : domain.trend === 'down' ? '↓' : '→'}
                  </span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${domain.percentage}%`,
                    backgroundColor: domain.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Actionable Insight */}
        {actionableInsight && (
          <div className="bg-[#B8860B]/10 border border-[#B8860B]/20 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#B8860B]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#8b6508]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">Actionable Insight</p>
                <p className="text-sm text-[#1a1a1a]/70">
                  <span className="text-[#B8860B] font-medium">{actionableInsight.domain}</span>
                  {' '}{actionableInsight.message.replace(actionableInsight.domain, '').trim()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No insights message */}
        {!actionableInsight && domainHealth.length > 0 && (
          <div className="bg-[#055437]/10 border border-[#055437]/20 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#055437]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#055437]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#1a1a1a] mb-1">All Domains Healthy</p>
                <p className="text-sm text-[#1a1a1a]/70">
                  Recognition activity is balanced across all domains. Keep up the great work!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireStaff>
  )
}
