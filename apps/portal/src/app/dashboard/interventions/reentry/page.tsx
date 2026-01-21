'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ReentryProtocol } from '@/types/interventions'

const SOURCE_LABELS = {
  level_b: 'Level B',
  detention: 'Detention',
  iss: 'ISS',
  oss: 'OSS',
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
}

export default function ReentryPage() {
  const [protocols, setProtocols] = useState<ReentryProtocol[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'active' | 'completed'>('pending')

  const fetchProtocols = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'pending') {
        params.set('pending', 'true')
      } else if (filter === 'active') {
        params.set('active', 'true')
      } else {
        params.set('status', 'completed')
      }

      const res = await fetch(`/api/interventions/reentry?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setProtocols(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch protocols:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProtocols()
  }, [filter])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const getChecklistProgress = (protocol: ReentryProtocol) => {
    const checklist = protocol.readiness_checklist
    const completed = checklist.filter((item) => item.completed).length
    return `${completed}/${checklist.length}`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Re-entry Protocols</h1>
          <p className="text-gray-500 mt-1">
            Track student re-entries after consequences
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Pending Today</p>
          <p className="text-2xl font-bold text-yellow-600">
            {protocols.filter((p) => p.status === 'pending' || p.status === 'ready').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">In Monitoring</p>
          <p className="text-2xl font-bold text-green-600">
            {protocols.filter((p) => p.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Ready for Return</p>
          <p className="text-2xl font-bold text-blue-600">
            {protocols.filter((p) => p.status === 'ready').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Completed This Week</p>
          <p className="text-2xl font-bold">
            {
              protocols.filter(
                (p) =>
                  p.status === 'completed' &&
                  p.completed_at &&
                  new Date(p.completed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ).length
            }
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'pending'
              ? 'Pending/Ready'
              : f === 'active'
                ? 'In Monitoring'
                : 'Completed'}
          </button>
        ))}
      </div>

      {/* Protocols List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading protocols...</p>
        </div>
      ) : protocols.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No re-entry protocols found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {protocols.map((protocol) => (
            <Link
              key={protocol.id}
              href={`/dashboard/interventions/reentry/${protocol.id}`}
              className="block bg-white rounded-lg border p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">
                      {protocol.student?.student_name ?? 'Unknown Student'}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[protocol.status]
                      }`}
                    >
                      {protocol.status === 'pending'
                        ? 'Pending Readiness'
                        : protocol.status === 'ready'
                          ? 'Ready for Return'
                          : protocol.status === 'active'
                            ? 'In Monitoring'
                            : 'Completed'}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {SOURCE_LABELS[protocol.source_type]}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    <span>Re-entry: {formatDate(protocol.reentry_date)}</span>
                    {protocol.receiving_teacher_name && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Teacher: {protocol.receiving_teacher_name}</span>
                      </>
                    )}
                  </div>
                  {protocol.reset_goal_from_intervention && (
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Goal:</span>{' '}
                      {protocol.reset_goal_from_intervention}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {protocol.status === 'pending' && (
                    <p className="text-sm text-yellow-600">
                      Checklist: {getChecklistProgress(protocol)}
                    </p>
                  )}
                  {protocol.status === 'active' && protocol.monitoring_end_date && (
                    <p className="text-sm text-gray-500">
                      Until: {formatDate(protocol.monitoring_end_date)}
                    </p>
                  )}
                  {protocol.outcome && (
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        protocol.outcome === 'success'
                          ? 'bg-green-100 text-green-800'
                          : protocol.outcome === 'partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {protocol.outcome}
                    </span>
                  )}
                </div>
              </div>

              {/* Readiness Checklist Progress */}
              {(protocol.status === 'pending' || protocol.status === 'ready') && (
                <div className="mt-4">
                  <div className="flex gap-1">
                    {protocol.readiness_checklist.map((item, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-2 rounded ${
                          item.completed ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                        title={item.item}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Monitoring Progress */}
              {protocol.status === 'active' && (
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <span>
                    {protocol.monitoring_type === '3_day'
                      ? '3-Day'
                      : protocol.monitoring_type === '5_day'
                        ? '5-Day'
                        : '10-Day'}{' '}
                    Monitoring
                  </span>
                  <span>•</span>
                  <span>{protocol.daily_logs.length} daily logs</span>
                  {protocol.first_behavioral_rep_completed && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">First rep completed</span>
                    </>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
