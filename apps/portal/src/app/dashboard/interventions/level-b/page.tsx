'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { LevelBIntervention } from '@/types/interventions'
import { ESCALATION_TRIGGER_LABELS } from '@/types/interventions'

export default function LevelBPage() {
  const [interventions, setInterventions] = useState<LevelBIntervention[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'monitoring' | 'completed'>('active')

  const fetchInterventions = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'active') {
        params.set('status', 'in_progress')
      } else if (filter === 'monitoring') {
        params.set('active_monitoring', 'true')
      } else {
        // completed includes both success and escalated
      }
      params.set('limit', '100')

      const res = await fetch(`/api/interventions/level-b?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        let data = json.data
        if (filter === 'completed') {
          data = data.filter(
            (i: LevelBIntervention) =>
              i.status === 'completed_success' || i.status === 'completed_escalated'
          )
        }
        setInterventions(data)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            In Progress
          </span>
        )
      case 'monitoring':
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
            Monitoring
          </span>
        )
      case 'completed_success':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Success
          </span>
        )
      case 'completed_escalated':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            Escalated to C
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {status}
          </span>
        )
    }
  }

  const calculateProgress = (intervention: LevelBIntervention) => {
    const steps = [
      intervention.b1_regulate_completed,
      intervention.b2_pattern_naming_completed,
      intervention.b3_reflection_completed,
      intervention.b4_repair_completed,
      intervention.b5_replacement_completed,
      intervention.b6_reset_goal_completed,
      intervention.b7_documentation_completed,
    ]
    return steps.filter(Boolean).length
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Level B Interventions
          </h1>
          <p className="text-gray-500 mt-1">
            Structured reset conferences (15-20 minutes)
          </p>
        </div>
        <Link
          href="/dashboard/interventions/level-b/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Level B
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Active Conferences</p>
          <p className="text-2xl font-bold text-blue-600">
            {interventions.filter((i) => i.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">In Monitoring</p>
          <p className="text-2xl font-bold text-amber-600">
            {interventions.filter((i) => i.status === 'monitoring').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Completed Success</p>
          <p className="text-2xl font-bold text-green-600">
            {interventions.filter((i) => i.status === 'completed_success').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Escalated to C</p>
          <p className="text-2xl font-bold text-red-600">
            {interventions.filter((i) => i.escalated_to_c).length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['active', 'monitoring', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'active'
              ? 'Active'
              : f === 'monitoring'
                ? 'Monitoring'
                : 'Completed'}
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
          <p className="text-gray-500">No Level B interventions found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {interventions.map((intervention) => (
            <Link
              key={intervention.id}
              href={`/dashboard/interventions/level-b/${intervention.id}`}
              className="block bg-white rounded-lg border p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">
                      {intervention.student?.student_name ?? 'Unknown Student'}
                    </h3>
                    {getStatusBadge(intervention.status)}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    <span>{intervention.domain?.domain_name}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {ESCALATION_TRIGGER_LABELS[intervention.escalation_trigger]}
                    </span>
                  </div>
                  {intervention.b6_reset_goal && (
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Goal:</span> {intervention.b6_reset_goal}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {formatDate(intervention.created_at)}
                  </p>
                  {intervention.status === 'in_progress' && (
                    <p className="text-sm text-blue-600 mt-1">
                      Step {calculateProgress(intervention)}/7
                    </p>
                  )}
                  {intervention.status === 'monitoring' && intervention.final_success_rate && (
                    <p className="text-sm text-amber-600 mt-1">
                      {intervention.final_success_rate.toFixed(0)}% success
                    </p>
                  )}
                </div>
              </div>

              {/* Progress Bar for Active */}
              {intervention.status === 'in_progress' && (
                <div className="mt-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${(calculateProgress(intervention) / 7) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Monitoring Progress */}
              {intervention.status === 'monitoring' && intervention.monitoring_end_date && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <span>Monitoring until:</span>
                  <span className="font-medium">
                    {new Date(intervention.monitoring_end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
