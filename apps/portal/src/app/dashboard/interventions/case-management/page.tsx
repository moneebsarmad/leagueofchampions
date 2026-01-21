'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { LevelCCase, LevelCStatus } from '@/types/interventions'

const STATUS_LABELS: Record<LevelCStatus, string> = {
  active: 'Newly Created',
  context_packet: 'Context Packet',
  admin_response: 'Admin Response',
  pending_reentry: 'Pending Re-entry',
  monitoring: 'Monitoring',
  closed: 'Closed',
}

const STATUS_COLORS: Record<LevelCStatus, string> = {
  active: 'bg-blue-100 text-blue-800',
  context_packet: 'bg-purple-100 text-purple-800',
  admin_response: 'bg-orange-100 text-orange-800',
  pending_reentry: 'bg-amber-100 text-amber-800',
  monitoring: 'bg-teal-100 text-teal-800',
  closed: 'bg-gray-100 text-gray-800',
}

export default function CaseManagementPage() {
  const [cases, setCases] = useState<LevelCCase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'my_caseload' | 'all'>('active')

  const fetchCases = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'my_caseload') {
        params.set('my_caseload', 'true')
      } else if (filter === 'active') {
        // Get all non-closed
      }
      params.set('limit', '100')

      const res = await fetch(`/api/interventions/level-c?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        let data = json.data
        if (filter === 'active') {
          data = data.filter((c: LevelCCase) => c.status !== 'closed')
        }
        setCases(data)
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
  }, [filter])

  const getPhaseProgress = (caseItem: LevelCCase) => {
    const phases = [
      { name: 'Context', completed: caseItem.context_packet_completed },
      { name: 'Admin', completed: caseItem.admin_response_completed },
      { name: 'Re-entry', completed: caseItem.reentry_planning_completed },
      { name: 'Monitor', completed: caseItem.status === 'closed' },
    ]
    return phases
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  // Group cases by status
  const casesByStatus = cases.reduce(
    (acc, c) => {
      const status = c.status
      if (!acc[status]) acc[status] = []
      acc[status].push(c)
      return acc
    },
    {} as Record<LevelCStatus, LevelCCase[]>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Level C Case Management
          </h1>
          <p className="text-gray-500 mt-1">
            Intensive intervention (2-4 weeks) with dedicated case managers
          </p>
        </div>
        <Link
          href="/dashboard/interventions/case-management/new"
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
        >
          + New Level C Case
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Active</p>
          <p className="text-2xl font-bold">
            {cases.filter((c) => c.status !== 'closed').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Pending Re-entry</p>
          <p className="text-2xl font-bold text-amber-600">
            {cases.filter((c) => c.status === 'pending_reentry').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">In Monitoring</p>
          <p className="text-2xl font-bold text-teal-600">
            {cases.filter((c) => c.status === 'monitoring').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Need Attention</p>
          <p className="text-2xl font-bold text-red-600">
            {
              cases.filter(
                (c) =>
                  c.status === 'active' ||
                  c.status === 'context_packet' ||
                  c.status === 'admin_response'
              ).length
            }
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Closed This Month</p>
          <p className="text-2xl font-bold text-green-600">
            {
              cases.filter(
                (c) =>
                  c.status === 'closed' &&
                  c.closure_date &&
                  new Date(c.closure_date) >
                    new Date(new Date().setDate(new Date().getDate() - 30))
              ).length
            }
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['active', 'my_caseload', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'active' ? 'Active Cases' : f === 'my_caseload' ? 'My Caseload' : 'All Cases'}
          </button>
        ))}
      </div>

      {/* Cases List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading cases...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No Level C cases found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cases by Status */}
          {(['active', 'context_packet', 'admin_response', 'pending_reentry', 'monitoring', 'closed'] as LevelCStatus[]).map((status) => {
            const statusCases = casesByStatus[status] ?? []
            if (statusCases.length === 0) return null

            return (
              <div key={status}>
                <h3 className="font-medium text-gray-700 mb-3">
                  {STATUS_LABELS[status]} ({statusCases.length})
                </h3>
                <div className="space-y-3">
                  {statusCases.map((caseItem) => (
                    <Link
                      key={caseItem.id}
                      href={`/dashboard/interventions/case-management/${caseItem.id}`}
                      className="block bg-white rounded-lg border p-4 hover:border-red-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">
                              {caseItem.student?.student_name ?? 'Unknown Student'}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[caseItem.status]}`}
                            >
                              {STATUS_LABELS[caseItem.status]}
                            </span>
                            {caseItem.case_type !== 'standard' && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                {caseItem.case_type.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            <span>{caseItem.domain?.domain_name ?? 'No domain focus'}</span>
                            {caseItem.case_manager_name && (
                              <>
                                <span className="mx-2">•</span>
                                <span>CM: {caseItem.case_manager_name}</span>
                              </>
                            )}
                          </div>
                          {caseItem.support_plan_goal && (
                            <p className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Goal:</span>{' '}
                              {caseItem.support_plan_goal}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            Created {formatDate(caseItem.created_at)}
                          </p>
                          {caseItem.reentry_date && (
                            <p className="text-sm text-amber-600 mt-1">
                              Re-entry: {formatDate(caseItem.reentry_date)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Phase Progress */}
                      <div className="mt-4 flex gap-1">
                        {getPhaseProgress(caseItem).map((phase, i) => (
                          <div
                            key={phase.name}
                            className={`flex-1 h-2 rounded ${
                              phase.completed ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                            title={`${phase.name}: ${phase.completed ? 'Complete' : 'Pending'}`}
                          />
                        ))}
                      </div>
                      <div className="mt-1 flex gap-1 text-xs text-gray-400">
                        <span className="flex-1 text-center">Context</span>
                        <span className="flex-1 text-center">Admin</span>
                        <span className="flex-1 text-center">Re-entry</span>
                        <span className="flex-1 text-center">Monitor</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
