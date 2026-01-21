'use client'

import { useState, useEffect } from 'react'
import LevelALogForm from '@/components/interventions/LevelALogForm'
import type { LevelAIntervention, BehavioralDomain } from '@/types/interventions'
import { LEVEL_A_INTERVENTION_LABELS } from '@/types/interventions'

export default function LevelAPage() {
  const [showForm, setShowForm] = useState(false)
  const [interventions, setInterventions] = useState<LevelAIntervention[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today')

  const fetchInterventions = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'today') {
        params.set('today_only', 'true')
      } else if (filter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        params.set('from_date', weekAgo.toISOString())
      }
      params.set('limit', '100')

      const res = await fetch(`/api/interventions/level-a?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setInterventions(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch interventions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInterventions()
  }, [filter])

  const handleSuccess = () => {
    setShowForm(false)
    fetchInterventions()
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'complied':
        return 'bg-green-100 text-green-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      case 'escalated':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  // Group by student for better overview
  const groupedByStudent = interventions.reduce(
    (acc, intervention) => {
      const studentId = intervention.student_id
      if (!acc[studentId]) {
        acc[studentId] = []
      }
      acc[studentId].push(intervention)
      return acc
    },
    {} as Record<string, LevelAIntervention[]>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Level A Interventions
          </h1>
          <p className="text-gray-500 mt-1">
            In-the-moment coaching (30-90 seconds)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Log Intervention
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Today&apos;s Total</p>
          <p className="text-2xl font-bold">
            {filter === 'today' ? interventions.length : '-'}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Complied</p>
          <p className="text-2xl font-bold text-green-600">
            {interventions.filter((i) => i.outcome === 'complied').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Partial</p>
          <p className="text-2xl font-bold text-yellow-600">
            {interventions.filter((i) => i.outcome === 'partial').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Escalated to B</p>
          <p className="text-2xl font-bold text-red-600">
            {interventions.filter((i) => i.escalated_to_b).length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['today', 'week', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'today' ? 'Today' : f === 'week' ? 'Past Week' : 'All Time'}
          </button>
        ))}
      </div>

      {/* Interventions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading interventions...</p>
        </div>
      ) : interventions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No interventions logged yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Log your first intervention
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Domain
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Outcome
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  Flags
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {interventions.map((intervention) => (
                <tr key={intervention.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium">
                      {formatTime(intervention.event_timestamp)}
                    </p>
                    {filter !== 'today' && (
                      <p className="text-gray-400 text-xs">
                        {formatDate(intervention.event_timestamp)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium">
                      {intervention.student?.student_name ?? 'Unknown'}
                    </p>
                    {intervention.student && (
                      <p className="text-gray-400 text-xs">
                        Grade {intervention.student.grade}
                        {intervention.student.section}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {intervention.domain?.domain_name ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {LEVEL_A_INTERVENTION_LABELS[intervention.intervention_type]}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {intervention.location ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(intervention.outcome)}`}
                    >
                      {intervention.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {intervention.is_pattern_student && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                          Pattern
                        </span>
                      )}
                      {intervention.is_repeated_same_day && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          Repeat
                        </span>
                      )}
                      {intervention.affected_others && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          Peers
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Log Level A Intervention</h2>
              <p className="text-sm text-gray-500 mt-1">
                In-the-moment coaching (30-90 seconds)
              </p>
            </div>
            <div className="p-6">
              <LevelALogForm
                onSuccess={handleSuccess}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
