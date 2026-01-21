'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface InterventionStats {
  level_a_today: number
  level_a_week: number
  level_b_active: number
  level_b_monitoring: number
  level_c_active: number
  level_c_pending_reentry: number
}

export default function InterventionsOverviewPage() {
  const [stats, setStats] = useState<InterventionStats>({
    level_a_today: 0,
    level_a_week: 0,
    level_b_active: 0,
    level_b_monitoring: 0,
    level_c_active: 0,
    level_c_pending_reentry: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch Level A today
        const levelARes = await fetch('/api/interventions/level-a?today_only=true')
        const levelAJson = await levelARes.json()

        // Fetch Level B
        const levelBRes = await fetch('/api/interventions/level-b?limit=100')
        const levelBJson = await levelBRes.json()

        // Fetch Level C
        const levelCRes = await fetch('/api/interventions/level-c?limit=100')
        const levelCJson = await levelCRes.json()

        setStats({
          level_a_today: levelAJson.data?.length ?? 0,
          level_a_week: 0, // Would need another call
          level_b_active:
            levelBJson.data?.filter((i: { status: string }) => i.status === 'in_progress').length ?? 0,
          level_b_monitoring:
            levelBJson.data?.filter((i: { status: string }) => i.status === 'monitoring').length ?? 0,
          level_c_active:
            levelCJson.data?.filter((c: { status: string }) => c.status !== 'closed').length ?? 0,
          level_c_pending_reentry:
            levelCJson.data?.filter((c: { status: string }) => c.status === 'pending_reentry')
              .length ?? 0,
        })
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          A/B/C Intervention Framework
        </h1>
        <p className="text-gray-500 mt-1">
          Behavioral intervention system for Dar al-Arqam Islamic School
        </p>
      </div>

      {/* Philosophy Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 mb-8 border border-blue-100">
        <p className="text-lg font-medium text-gray-800">
          &quot;Consequences may be necessary, but re-entry is where behavior change occurs.&quot;
        </p>
        <p className="text-sm text-gray-600 mt-2">
          The A/B/C framework focuses on learning, repair, and re-entry protocols rooted in Islamic
          educational values.
        </p>
      </div>

      {/* Intervention Levels Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Level A Card */}
        <Link
          href="/dashboard/interventions/level-a"
          className="bg-white rounded-xl border-2 border-green-200 p-6 hover:border-green-400 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-green-600">A</span>
            </div>
            <span className="text-3xl font-bold text-green-600">
              {isLoading ? '-' : stats.level_a_today}
            </span>
          </div>
          <h3 className="font-semibold text-lg mb-1 group-hover:text-green-600">
            In-the-moment Coaching
          </h3>
          <p className="text-sm text-gray-500 mb-3">30-90 seconds • Quick redirect</p>
          <div className="text-xs text-gray-400">
            8 intervention types: Pre-Correct, Positive Narration, Quick Redirect, Redo, and more
          </div>
        </Link>

        {/* Level B Card */}
        <Link
          href="/dashboard/interventions/level-b"
          className="bg-white rounded-xl border-2 border-amber-200 p-6 hover:border-amber-400 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-amber-600">B</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-amber-600">
                {isLoading ? '-' : stats.level_b_active}
              </span>
              <p className="text-xs text-gray-500">
                + {stats.level_b_monitoring} monitoring
              </p>
            </div>
          </div>
          <h3 className="font-semibold text-lg mb-1 group-hover:text-amber-600">
            Structured Reset Conference
          </h3>
          <p className="text-sm text-gray-500 mb-3">15-20 minutes • 7 steps</p>
          <div className="text-xs text-gray-400">
            Regulate → Pattern → Reflect → Repair → Replace → Reset Goal → Document
          </div>
        </Link>

        {/* Level C Card */}
        <Link
          href="/dashboard/interventions/case-management"
          className="bg-white rounded-xl border-2 border-red-200 p-6 hover:border-red-400 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-red-600">C</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-red-600">
                {isLoading ? '-' : stats.level_c_active}
              </span>
              <p className="text-xs text-gray-500">
                {stats.level_c_pending_reentry} pending re-entry
              </p>
            </div>
          </div>
          <h3 className="font-semibold text-lg mb-1 group-hover:text-red-600">
            Case Management
          </h3>
          <p className="text-sm text-gray-500 mb-3">2-4 weeks • Intensive support</p>
          <div className="text-xs text-gray-400">
            Stabilize → Context Packet → Admin Action → Re-entry → Monitor & Close
          </div>
        </Link>
      </div>

      {/* Four Domains */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Four Behavioral Domains</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
            <h4 className="font-medium text-indigo-800">Prayer Space</h4>
            <p className="text-xs text-indigo-600 mt-1">
              Salah & transitions, sacred space respect, wudu preparation
            </p>
          </div>
          <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
            <h4 className="font-medium text-cyan-800">Hallways</h4>
            <p className="text-xs text-cyan-600 mt-1">
              Right-side flow, quiet voices, hands-to-self, spacing
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <h4 className="font-medium text-orange-800">Lunch/Recess</h4>
            <p className="text-xs text-orange-600 mt-1">
              Inclusion, environmental care, conflict resolution
            </p>
          </div>
          <div className="bg-pink-50 rounded-lg p-4 border border-pink-100">
            <h4 className="font-medium text-pink-800">Respect</h4>
            <p className="text-xs text-pink-600 mt-1">
              Speech, authority, peer interactions, dignity
            </p>
          </div>
        </div>
      </div>

      {/* Decision Tree Quick Reference */}
      <div className="bg-gray-50 rounded-xl p-6 border">
        <h2 className="text-lg font-semibold mb-4">Decision Tree Quick Reference</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Safety/Major Harm?</p>
              <p className="text-sm text-gray-500">
                YES → Level C + Admin consequence | NO → Continue to step 2
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Escalation Triggers Present?</p>
              <p className="text-sm text-gray-500">
                Demerit assigned, 2+ ignored prompts, 3rd in 10 days, peer impact, space disruption,
                safety risk
              </p>
              <p className="text-sm text-gray-500">
                YES → Level B | NO → Level A
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div>
              <p className="font-medium">Level B attempted twice for same pattern?</p>
              <p className="text-sm text-gray-500">
                YES → Level C | NO → Continue Level B
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex gap-4">
        <Link
          href="/dashboard/interventions/level-a"
          className="flex-1 py-4 bg-green-600 text-white rounded-lg text-center font-medium hover:bg-green-700"
        >
          Log Level A Intervention
        </Link>
        <Link
          href="/dashboard/interventions/level-b/new"
          className="flex-1 py-4 bg-amber-600 text-white rounded-lg text-center font-medium hover:bg-amber-700"
        >
          Start Level B Conference
        </Link>
        <Link
          href="/dashboard/interventions/case-management/new"
          className="flex-1 py-4 bg-red-600 text-white rounded-lg text-center font-medium hover:bg-red-700"
        >
          Create Level C Case
        </Link>
      </div>

      {/* Additional Links */}
      <div className="mt-6 flex gap-4">
        <Link
          href="/dashboard/interventions/reentry"
          className="flex-1 py-3 bg-white border-2 border-blue-300 text-blue-700 rounded-lg text-center font-medium hover:bg-blue-50"
        >
          View Re-entry Protocols
        </Link>
        <Link
          href="/dashboard/interventions/analytics"
          className="flex-1 py-3 bg-white border-2 border-purple-300 text-purple-700 rounded-lg text-center font-medium hover:bg-purple-50"
        >
          View Analytics Dashboard
        </Link>
      </div>
    </div>
  )
}
