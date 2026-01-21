'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import LevelBWorkflow from '@/components/interventions/LevelBWorkflow'
import type { LevelBIntervention, BehavioralDomain } from '@/types/interventions'
import { ESCALATION_TRIGGER_LABELS } from '@/types/interventions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function LevelBDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [intervention, setIntervention] = useState<LevelBIntervention | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchIntervention() {
      try {
        const res = await fetch(`/api/interventions/level-b/${id}`)
        const json = await res.json()
        if (json.success) {
          setIntervention(json.data)
        } else {
          setError(json.error || 'Failed to load intervention')
        }
      } catch (err) {
        setError('Failed to load intervention')
      } finally {
        setIsLoading(false)
      }
    }
    fetchIntervention()
  }, [id])

  const handleUpdate = (updated: LevelBIntervention) => {
    setIntervention(updated)
  }

  const handleComplete = () => {
    router.push('/dashboard/interventions/level-b')
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading intervention...</p>
        </div>
      </div>
    )
  }

  if (error || !intervention) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-red-50 rounded-lg">
          <p className="text-red-600">{error || 'Intervention not found'}</p>
          <button
            onClick={() => router.push('/dashboard/interventions/level-b')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Back to Level B List
          </button>
        </div>
      </div>
    )
  }

  const domain = intervention.domain as BehavioralDomain

  // If monitoring, show monitoring view
  if (intervention.status === 'monitoring') {
    return <MonitoringView intervention={intervention} onUpdate={handleUpdate} />
  }

  // If completed, show summary
  if (
    intervention.status === 'completed_success' ||
    intervention.status === 'completed_escalated'
  ) {
    return <CompletedView intervention={intervention} />
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/interventions/level-b')}
          className="text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Back to Level B List
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Level B Reset Conference
            </h1>
            <p className="text-gray-500 mt-1">
              {intervention.student?.student_name ?? 'Unknown Student'} •{' '}
              {domain?.domain_name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {ESCALATION_TRIGGER_LABELS[intervention.escalation_trigger]}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Started{' '}
              {new Date(intervention.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Universal Script Reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-blue-800 mb-1">
          Level B Universal Script:
        </p>
        <p className="text-sm text-blue-700">
          &quot;This is a Level B reset. Not a lecture.
          <br />
          1. What happened? 2. Who was affected? 3. Which expectation did you break?
          <br />
          4. Choose your repair. 5. Practice the right way. 6. Set your reset goal for 1-3 days.&quot;
        </p>
      </div>

      {/* Workflow */}
      {domain && (
        <LevelBWorkflow
          intervention={intervention}
          domain={domain}
          onUpdate={handleUpdate}
          onComplete={handleComplete}
        />
      )}
    </div>
  )
}

// Monitoring View Component
function MonitoringView({
  intervention,
  onUpdate,
}: {
  intervention: LevelBIntervention
  onUpdate: (i: LevelBIntervention) => void
}) {
  const router = useRouter()
  const [todayRate, setTodayRate] = useState<number>(100)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const dailyRates = intervention.daily_success_rates as Record<string, number>
  const hasLoggedToday = dailyRates[today] !== undefined

  const logTodayRate = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/interventions/level-b/${intervention.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_daily_rate',
          date: today,
          success_rate: todayRate,
        }),
      })
      const json = await res.json()
      if (json.success) {
        onUpdate(json.data)
      }
    } catch (err) {
      console.error('Failed to log rate:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const completeMonitoring = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/interventions/level-b/${intervention.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_monitoring',
        }),
      })
      const json = await res.json()
      if (json.success) {
        onUpdate(json.data)
        if (json.should_escalate) {
          alert(
            'Student did not meet the 80% success threshold. Consider escalating to Level C.'
          )
        }
        router.push('/dashboard/interventions/level-b')
      }
    } catch (err) {
      console.error('Failed to complete monitoring:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isMonitoringComplete =
    intervention.monitoring_end_date &&
    new Date(intervention.monitoring_end_date) <= new Date()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/dashboard/interventions/level-b')}
        className="text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Back to Level B List
      </button>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-amber-800 mb-2">
          Monitoring Period Active
        </h2>
        <p className="text-amber-700">
          {intervention.monitoring_start_date} to {intervention.monitoring_end_date}
        </p>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h3 className="font-medium mb-4">Reset Goal:</h3>
        <p className="text-lg">{intervention.b6_reset_goal}</p>
      </div>

      {/* Daily Rates Log */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h3 className="font-medium mb-4">Daily Success Rates</h3>
        <div className="space-y-2">
          {Object.entries(dailyRates).map(([date, rate]) => (
            <div key={date} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>{new Date(date).toLocaleDateString()}</span>
              <span
                className={`font-medium ${rate >= 80 ? 'text-green-600' : 'text-red-600'}`}
              >
                {rate}%
              </span>
            </div>
          ))}
          {Object.keys(dailyRates).length === 0 && (
            <p className="text-gray-500 text-sm">No daily rates logged yet.</p>
          )}
        </div>
      </div>

      {/* Log Today */}
      {!hasLoggedToday && !isMonitoringComplete && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h3 className="font-medium mb-4">Log Today&apos;s Success Rate</h3>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={todayRate}
              onChange={(e) => setTodayRate(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-2xl font-bold w-16 text-right">{todayRate}%</span>
          </div>
          <button
            onClick={logTodayRate}
            disabled={isSubmitting}
            className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            Log Today&apos;s Rate
          </button>
        </div>
      )}

      {/* Complete Monitoring */}
      {isMonitoringComplete && (
        <button
          onClick={completeMonitoring}
          disabled={isSubmitting}
          className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-medium"
        >
          Complete Monitoring Period
        </button>
      )}
    </div>
  )
}

// Completed View Component
function CompletedView({ intervention }: { intervention: LevelBIntervention }) {
  const router = useRouter()
  const isSuccess = intervention.status === 'completed_success'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/dashboard/interventions/level-b')}
        className="text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Back to Level B List
      </button>

      <div
        className={`rounded-lg p-6 mb-6 ${
          isSuccess
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}
      >
        <h2
          className={`text-xl font-bold mb-2 ${
            isSuccess ? 'text-green-800' : 'text-red-800'
          }`}
        >
          {isSuccess ? 'Completed Successfully' : 'Escalated to Level C'}
        </h2>
        <p className={isSuccess ? 'text-green-700' : 'text-red-700'}>
          Final success rate: {intervention.final_success_rate?.toFixed(1)}%
        </p>
        {intervention.escalation_reason && (
          <p className="text-red-600 mt-2">{intervention.escalation_reason}</p>
        )}
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-medium mb-4">Conference Summary</h3>
        <div className="space-y-3 text-sm">
          <p>
            <span className="font-medium">Domain:</span>{' '}
            {intervention.domain?.domain_name}
          </p>
          <p>
            <span className="font-medium">Pattern:</span>{' '}
            {intervention.b2_pattern_notes}
          </p>
          <p>
            <span className="font-medium">Repair Action:</span>{' '}
            {intervention.b4_repair_action_selected}
          </p>
          <p>
            <span className="font-medium">Replacement Skill:</span>{' '}
            {intervention.b5_replacement_skill_practiced}
          </p>
          <p>
            <span className="font-medium">Reset Goal:</span>{' '}
            {intervention.b6_reset_goal}
          </p>
        </div>
      </div>
    </div>
  )
}
