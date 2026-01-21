'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import type { ReentryProtocol, ReadinessChecklistItem, DailyLog } from '@/types/interventions'

const SOURCE_LABELS = {
  level_b: 'Level B Reset',
  detention: 'Detention',
  iss: 'In-School Suspension',
  oss: 'Out-of-School Suspension',
}

const MONITORING_TYPE_LABELS = {
  '3_day': '3-Day Monitoring',
  '5_day': '5-Day Monitoring',
  '10_day': '10-Day Monitoring',
}

const STATUS_CONFIG = {
  pending: { label: 'Pending Readiness', color: 'bg-yellow-100 text-yellow-800' },
  ready: { label: 'Ready for Return', color: 'bg-blue-100 text-blue-800' },
  active: { label: 'In Monitoring', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ReentryDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [protocol, setProtocol] = useState<ReentryProtocol | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Daily log form state
  const [dailyNotes, setDailyNotes] = useState('')
  const [successIndicators, setSuccessIndicators] = useState<string[]>([])
  const [concerns, setConcerns] = useState<string[]>([])
  const [newIndicator, setNewIndicator] = useState('')
  const [newConcern, setNewConcern] = useState('')

  // Completion form state
  const [completionOutcome, setCompletionOutcome] = useState<'success' | 'partial' | 'escalated'>('success')
  const [completionNotes, setCompletionNotes] = useState('')

  // Reset goal for script generation
  const [resetGoal, setResetGoal] = useState('')

  const fetchProtocol = async () => {
    try {
      const res = await fetch(`/api/interventions/reentry/${id}`)
      const json = await res.json()
      if (json.success) {
        setProtocol(json.data)
        if (json.data.reset_goal_from_intervention) {
          setResetGoal(json.data.reset_goal_from_intervention)
        }
      } else {
        setError('Protocol not found')
      }
    } catch (err) {
      setError('Failed to load protocol')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProtocol()
  }, [id])

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleChecklistUpdate = async (index: number, completed: boolean) => {
    if (!protocol) return

    const newChecklist = [...protocol.readiness_checklist]
    newChecklist[index] = {
      ...newChecklist[index],
      completed,
      completed_at: completed ? new Date().toISOString() : undefined,
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/interventions/reentry/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_checklist',
          checklist: newChecklist,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setProtocol(json.data)
        const allComplete = newChecklist.every(item => item.completed)
        if (allComplete) {
          showSuccess('All checklist items complete! Student is ready for return.')
        }
      }
    } catch (err) {
      setError('Failed to update checklist')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateScript = async () => {
    if (!resetGoal.trim()) {
      setError('Please enter a reset goal')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/interventions/reentry/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_script',
          reset_goal: resetGoal,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setProtocol(json.data)
        showSuccess('Teacher script generated!')
      }
    } catch (err) {
      setError('Failed to generate script')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartReentry = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/interventions/reentry/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_reentry' }),
      })
      const json = await res.json()
      if (json.success) {
        setProtocol(json.data)
        showSuccess('Re-entry started! Monitoring period has begun.')
      }
    } catch (err) {
      setError('Failed to start re-entry')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCompleteFirstRep = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/interventions/reentry/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_first_rep' }),
      })
      const json = await res.json()
      if (json.success) {
        setProtocol(json.data)
        showSuccess('First behavioral rep completed!')
      }
    } catch (err) {
      setError('Failed to mark first rep')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogDaily = async () => {
    if (!dailyNotes.trim()) {
      setError('Please enter notes for the daily log')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/interventions/reentry/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_daily',
          notes: dailyNotes,
          success_indicators: successIndicators,
          concerns: concerns,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setProtocol(json.data)
        setDailyNotes('')
        setSuccessIndicators([])
        setConcerns([])
        showSuccess('Daily log recorded!')
      }
    } catch (err) {
      setError('Failed to log daily entry')
    } finally {
      setIsSaving(false)
    }
  }

  const handleComplete = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/interventions/reentry/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          outcome: completionOutcome,
          notes: completionNotes,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setProtocol(json.data)
        showSuccess('Re-entry protocol completed!')
      }
    } catch (err) {
      setError('Failed to complete protocol')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
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
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading protocol...</p>
      </div>
    )
  }

  if (!protocol) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600">Protocol not found</p>
        <button
          onClick={() => router.push('/dashboard/interventions/reentry')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Re-entry List
        </button>
      </div>
    )
  }

  const daysIntoMonitoring = protocol.monitoring_start_date
    ? Math.floor(
        (new Date().getTime() - new Date(protocol.monitoring_start_date).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0

  const monitoringDuration = protocol.monitoring_type
    ? parseInt(protocol.monitoring_type.split('_')[0])
    : 3

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/interventions/reentry')}
          className="text-gray-500 hover:text-gray-700 mb-4"
        >
          &larr; Back to Re-entry List
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {protocol.student?.student_name ?? 'Unknown Student'}
            </h1>
            <p className="text-gray-500 mt-1">
              {SOURCE_LABELS[protocol.source_type]} Re-entry
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[protocol.status].color}`}
          >
            {STATUS_CONFIG[protocol.status].label}
          </span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 mb-6">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">
            Dismiss
          </button>
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 mb-6">
          {successMessage}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Re-entry Date</p>
          <p className="text-lg font-semibold">{formatDate(protocol.reentry_date)}</p>
          {protocol.reentry_time && (
            <p className="text-sm text-gray-500">{protocol.reentry_time}</p>
          )}
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Monitoring Type</p>
          <p className="text-lg font-semibold">
            {protocol.monitoring_type
              ? MONITORING_TYPE_LABELS[protocol.monitoring_type]
              : 'Not Set'}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Receiving Teacher</p>
          <p className="text-lg font-semibold">
            {protocol.receiving_teacher_name || 'Not Assigned'}
          </p>
        </div>
      </div>

      {/* Phase 1: Readiness Checklist (Pending Status) */}
      {(protocol.status === 'pending' || protocol.status === 'ready') && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Readiness Checklist</h2>
          <p className="text-sm text-gray-500 mb-4">
            Complete all items to verify the student is ready for return.
          </p>

          <div className="space-y-3">
            {protocol.readiness_checklist.map((item, index) => (
              <label
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  item.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => handleChecklistUpdate(index, e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <p className={item.completed ? 'text-green-800' : 'text-gray-700'}>
                    {item.item}
                  </p>
                  {item.completed && item.completed_at && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Completed {formatDateTime(item.completed_at)}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Checklist progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Progress</span>
              <span>
                {protocol.readiness_checklist.filter((i) => i.completed).length} /{' '}
                {protocol.readiness_checklist.length}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${
                    (protocol.readiness_checklist.filter((i) => i.completed).length /
                      protocol.readiness_checklist.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: Teacher Script (Ready Status) */}
      {protocol.status === 'ready' && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Teacher Re-entry Script</h2>

          {!protocol.teacher_script ? (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Enter the student's reset goal to generate a teacher script for the return.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reset Goal
                  </label>
                  <input
                    type="text"
                    value={resetGoal}
                    onChange={(e) => setResetGoal(e.target.value)}
                    placeholder="e.g., I will raise my hand before speaking in class"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleGenerateScript}
                  disabled={isSaving || !resetGoal.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {isSaving ? 'Generating...' : 'Generate Script'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-800 mb-2">Teacher Script:</p>
                <p className="text-blue-900 italic">"{protocol.teacher_script}"</p>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                <strong>Reset Goal:</strong> {protocol.reset_goal_from_intervention}
              </p>
              <button
                onClick={handleStartReentry}
                disabled={isSaving}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-medium"
              >
                {isSaving ? 'Starting...' : 'Start Re-entry & Begin Monitoring'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phase 3: Active Monitoring */}
      {protocol.status === 'active' && (
        <>
          {/* First Rep Section */}
          {!protocol.first_behavioral_rep_completed && (
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                First Behavioral Rep Required
              </h2>
              <p className="text-sm text-yellow-700 mb-4">
                The receiving teacher should ask the student to demonstrate their reset goal
                within the first 5 minutes of return.
              </p>
              {protocol.teacher_script && (
                <div className="bg-white rounded p-3 mb-4">
                  <p className="text-sm text-gray-600 italic">"{protocol.teacher_script}"</p>
                </div>
              )}
              <button
                onClick={handleCompleteFirstRep}
                disabled={isSaving}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300"
              >
                {isSaving ? 'Marking...' : 'Mark First Rep Completed'}
              </button>
            </div>
          )}

          {/* Monitoring Progress */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Monitoring Progress</h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">
                  Day {Math.min(daysIntoMonitoring, monitoringDuration)} of {monitoringDuration}
                </p>
                <p className="text-xs text-gray-400">
                  Until {formatDate(protocol.monitoring_end_date!)}
                </p>
              </div>
              {protocol.first_behavioral_rep_completed && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                  First rep done
                </span>
              )}
            </div>

            {/* Day progress indicators */}
            <div className="flex gap-1 mb-6">
              {Array.from({ length: monitoringDuration }).map((_, i) => {
                const hasLog = protocol.daily_logs.some(
                  (log) => {
                    const logDate = new Date(log.date)
                    const startDate = new Date(protocol.monitoring_start_date!)
                    const dayNum = Math.floor(
                      (logDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                    )
                    return dayNum === i
                  }
                )
                const isToday = i + 1 === daysIntoMonitoring
                return (
                  <div
                    key={i}
                    className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-medium ${
                      hasLog
                        ? 'bg-green-500 text-white'
                        : isToday
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                          : i + 1 < daysIntoMonitoring
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                )
              })}
            </div>

            {/* Daily Log Form */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Log Today's Observations</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={dailyNotes}
                    onChange={(e) => setDailyNotes(e.target.value)}
                    placeholder="How did the student do today?"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Success Indicators
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newIndicator}
                        onChange={(e) => setNewIndicator(e.target.value)}
                        placeholder="Add success..."
                        className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newIndicator.trim()) {
                            setSuccessIndicators([...successIndicators, newIndicator.trim()])
                            setNewIndicator('')
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newIndicator.trim()) {
                            setSuccessIndicators([...successIndicators, newIndicator.trim()])
                            setNewIndicator('')
                          }
                        }}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {successIndicators.map((ind, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs"
                        >
                          {ind}
                          <button
                            onClick={() =>
                              setSuccessIndicators(successIndicators.filter((_, j) => j !== i))
                            }
                            className="text-green-600 hover:text-green-800"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Concerns
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newConcern}
                        onChange={(e) => setNewConcern(e.target.value)}
                        placeholder="Add concern..."
                        className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newConcern.trim()) {
                            setConcerns([...concerns, newConcern.trim()])
                            setNewConcern('')
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newConcern.trim()) {
                            setConcerns([...concerns, newConcern.trim()])
                            setNewConcern('')
                          }
                        }}
                        className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {concerns.map((con, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs"
                        >
                          {con}
                          <button
                            onClick={() => setConcerns(concerns.filter((_, j) => j !== i))}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogDaily}
                  disabled={isSaving || !dailyNotes.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {isSaving ? 'Saving...' : 'Save Daily Log'}
                </button>
              </div>
            </div>
          </div>

          {/* Previous Logs */}
          {protocol.daily_logs.length > 0 && (
            <div className="bg-white rounded-lg border p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Previous Logs</h2>
              <div className="space-y-4">
                {protocol.daily_logs
                  .slice()
                  .reverse()
                  .map((log, index) => (
                    <div key={index} className="border-l-4 border-gray-300 pl-4 py-2">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium">{formatDate(log.date)}</p>
                        <p className="text-xs text-gray-500">by {log.logged_by}</p>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{log.notes}</p>
                      <div className="flex gap-4 text-xs">
                        {log.success_indicators.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {log.success_indicators.map((ind, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded"
                              >
                                {ind}
                              </span>
                            ))}
                          </div>
                        )}
                        {log.concerns.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {log.concerns.map((con, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded"
                              >
                                {con}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Complete Re-entry */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Complete Re-entry Protocol</h2>
            <p className="text-sm text-gray-500 mb-4">
              Monitoring period ends on {formatDate(protocol.monitoring_end_date!)}. Complete
              the protocol when the monitoring period is over or if early closure is needed.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outcome
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'success', label: 'Success', color: 'green' },
                    { value: 'partial', label: 'Partial Success', color: 'yellow' },
                    { value: 'escalated', label: 'Escalated', color: 'red' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setCompletionOutcome(option.value as 'success' | 'partial' | 'escalated')
                      }
                      className={`p-3 rounded-lg border-2 text-center transition-colors ${
                        completionOutcome === option.value
                          ? option.color === 'green'
                            ? 'border-green-500 bg-green-50'
                            : option.color === 'yellow'
                              ? 'border-yellow-500 bg-yellow-50'
                              : 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outcome Notes (Optional)
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Summary of the monitoring period and student progress..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleComplete}
                disabled={isSaving}
                className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-300 font-medium"
              >
                {isSaving ? 'Completing...' : 'Complete Re-entry Protocol'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Completed View */}
      {protocol.status === 'completed' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Protocol Completed</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-gray-500">Outcome:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  protocol.outcome === 'success'
                    ? 'bg-green-100 text-green-800'
                    : protocol.outcome === 'partial'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {protocol.outcome === 'success'
                  ? 'Success'
                  : protocol.outcome === 'partial'
                    ? 'Partial Success'
                    : 'Escalated'}
              </span>
            </div>

            {protocol.completed_at && (
              <p className="text-gray-500">
                Completed on {formatDateTime(protocol.completed_at)}
              </p>
            )}

            {protocol.outcome_notes && (
              <div className="bg-gray-50 rounded p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Outcome Notes:</p>
                <p className="text-gray-600">{protocol.outcome_notes}</p>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {protocol.daily_logs.length}
                </p>
                <p className="text-sm text-gray-500">Daily Logs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {protocol.first_behavioral_rep_completed ? 'Yes' : 'No'}
                </p>
                <p className="text-sm text-gray-500">First Rep Done</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {protocol.monitoring_type?.split('_')[0] || '-'}
                </p>
                <p className="text-sm text-gray-500">Day Monitoring</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
