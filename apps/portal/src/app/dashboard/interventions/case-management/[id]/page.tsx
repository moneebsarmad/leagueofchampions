'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import type {
  LevelCCase,
  BehavioralDomain,
  AdminResponseType,
  RepairAction,
  DailyCheckIn,
} from '@/types/interventions'
import { ADMIN_RESPONSE_TYPES } from '@/types/interventions'

interface PageProps {
  params: Promise<{ id: string }>
}

const PHASE_STEPS = [
  { key: 'context', label: 'Context Packet', description: 'Document incident and patterns' },
  { key: 'admin', label: 'Admin Response', description: 'Record consequence decision' },
  { key: 'reentry', label: 'Re-entry Plan', description: 'Support plan and scheduling' },
  { key: 'monitoring', label: 'Monitor & Close', description: 'Track progress to closure' },
]

const ADMIN_RESPONSE_LABELS: Record<AdminResponseType, string> = {
  detention: 'Detention',
  iss: 'In-School Suspension (ISS)',
  oss: 'Out-of-School Suspension (OSS)',
  behavior_contract: 'Behavior Contract',
  parent_conference: 'Parent Conference',
  other: 'Other',
}

const ENVIRONMENTAL_FACTORS = [
  'Peer conflict',
  'Academic frustration',
  'Home situation',
  'Transition difficulty',
  'Sensory overwhelm',
  'Social exclusion',
  'Schedule change',
  'Staff relationship',
  'Unmet needs',
  'Other',
]

export default function LevelCDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [caseData, setCaseData] = useState<LevelCCase | null>(null)
  const [domains, setDomains] = useState<BehavioralDomain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states for each phase
  const [incidentSummary, setIncidentSummary] = useState('')
  const [patternReview, setPatternReview] = useState('')
  const [environmentalFactors, setEnvironmentalFactors] = useState<string[]>([])
  const [priorInterventions, setPriorInterventions] = useState('')

  const [adminResponseType, setAdminResponseType] = useState<AdminResponseType | ''>('')
  const [adminResponseDetails, setAdminResponseDetails] = useState('')
  const [consequenceStartDate, setConsequenceStartDate] = useState('')
  const [consequenceEndDate, setConsequenceEndDate] = useState('')

  const [supportPlanGoal, setSupportPlanGoal] = useState('')
  const [supportPlanStrategies, setSupportPlanStrategies] = useState<string[]>([''])
  const [adultMentorName, setAdultMentorName] = useState('')
  const [reentryDate, setReentryDate] = useState('')
  const [reentryType, setReentryType] = useState<'standard' | 'restricted'>('standard')
  const [repairActions, setRepairActions] = useState<RepairAction[]>([])

  const [checkInNotes, setCheckInNotes] = useState('')
  const [closureNotes, setClosureNotes] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const [caseRes, domainsRes] = await Promise.all([
          fetch(`/api/interventions/level-c/${id}`),
          fetch('/api/interventions/domains'),
        ])
        const caseJson = await caseRes.json()
        const domainsJson = await domainsRes.json()

        if (caseJson.success) {
          setCaseData(caseJson.data)
          // Populate form fields
          setIncidentSummary(caseJson.data.incident_summary ?? '')
          setPatternReview(caseJson.data.pattern_review ?? '')
          setEnvironmentalFactors(caseJson.data.environmental_factors ?? [])
          setPriorInterventions(caseJson.data.prior_interventions_summary ?? '')
          setAdminResponseType(caseJson.data.admin_response_type ?? '')
          setAdminResponseDetails(caseJson.data.admin_response_details ?? '')
          setConsequenceStartDate(caseJson.data.consequence_start_date ?? '')
          setConsequenceEndDate(caseJson.data.consequence_end_date ?? '')
          setSupportPlanGoal(caseJson.data.support_plan_goal ?? '')
          setSupportPlanStrategies(
            caseJson.data.support_plan_strategies?.length
              ? caseJson.data.support_plan_strategies
              : ['']
          )
          setAdultMentorName(caseJson.data.adult_mentor_name ?? '')
          setReentryDate(caseJson.data.reentry_date ?? '')
          setReentryType(caseJson.data.reentry_type ?? 'standard')
          setRepairActions(caseJson.data.repair_actions ?? [])
        } else {
          setError(caseJson.error)
        }

        if (domainsJson.success) {
          setDomains(domainsJson.data)
        }
      } catch (err) {
        setError('Failed to load case')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id])

  const updateCase = async (action: string, data: Record<string, unknown>) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/interventions/level-c/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      })
      const json = await res.json()
      if (json.success) {
        setCaseData(json.data)
      } else {
        setError(json.error)
      }
    } catch (err) {
      setError('Failed to update case')
    } finally {
      setIsSubmitting(false)
    }
  }

  const saveContextPacket = () => {
    updateCase('update_context_packet', {
      incident_summary: incidentSummary,
      pattern_review: patternReview,
      environmental_factors: environmentalFactors,
      prior_interventions_summary: priorInterventions,
    })
  }

  const saveAdminResponse = () => {
    if (!adminResponseType) return
    updateCase('record_admin_response', {
      admin_response_type: adminResponseType,
      admin_response_details: adminResponseDetails,
      consequence_start_date: consequenceStartDate || undefined,
      consequence_end_date: consequenceEndDate || undefined,
    })
  }

  const saveReentryPlan = () => {
    if (!supportPlanGoal || !reentryDate) return
    updateCase('create_reentry_plan', {
      support_plan_goal: supportPlanGoal,
      support_plan_strategies: supportPlanStrategies.filter((s) => s.trim()),
      adult_mentor_name: adultMentorName || undefined,
      repair_actions: repairActions,
      reentry_date: reentryDate,
      reentry_type: reentryType,
    })
  }

  const startMonitoring = () => {
    updateCase('start_monitoring', {})
  }

  const logCheckIn = () => {
    if (!checkInNotes.trim()) return
    const checkIn: DailyCheckIn = {
      date: new Date().toISOString().split('T')[0],
      notes: checkInNotes,
      logged_by: 'Current User',
      logged_at: new Date().toISOString(),
    }
    updateCase('log_check_in', { check_in: checkIn })
    setCheckInNotes('')
  }

  const closeCase = (outcome: 'closed_success' | 'closed_continued_support' | 'closed_escalated') => {
    updateCase('close_case', {
      outcome_status: outcome,
      outcome_notes: closureNotes,
    })
  }

  const getCurrentPhase = (): string => {
    if (!caseData) return 'context'
    if (caseData.status === 'closed') return 'closed'
    if (caseData.status === 'monitoring') return 'monitoring'
    if (caseData.status === 'pending_reentry') return 'reentry'
    if (caseData.status === 'admin_response') return 'admin'
    if (caseData.context_packet_completed) return 'admin'
    return 'context'
  }

  const focusDomain = domains.find((d) => d.id === caseData?.domain_focus_id)

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading case...</p>
        </div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-red-50 rounded-lg">
          <p className="text-red-600">{error || 'Case not found'}</p>
          <button
            onClick={() => router.push('/dashboard/interventions/case-management')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Back to Case Management
          </button>
        </div>
      </div>
    )
  }

  const currentPhase = getCurrentPhase()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/interventions/case-management')}
          className="text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Back to Case Management
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Level C Case: {caseData.student?.student_name ?? 'Unknown Student'}
            </h1>
            <p className="text-gray-500 mt-1">
              {focusDomain?.domain_name ?? 'No domain focus'} •{' '}
              {caseData.case_manager_name
                ? `Case Manager: ${caseData.case_manager_name}`
                : 'No case manager assigned'}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              caseData.status === 'closed'
                ? 'bg-gray-100 text-gray-800'
                : caseData.status === 'monitoring'
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {caseData.case_type !== 'standard' && `${caseData.case_type.toUpperCase()} • `}
            {caseData.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Phase Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {PHASE_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentPhase === step.key
                    ? 'bg-red-500 text-white'
                    : (currentPhase === 'closed' ||
                        PHASE_STEPS.findIndex((s) => s.key === currentPhase) > i)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {(currentPhase === 'closed' ||
                  PHASE_STEPS.findIndex((s) => s.key === currentPhase) > i)
                  ? '✓'
                  : i + 1}
              </div>
              {i < PHASE_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    PHASE_STEPS.findIndex((s) => s.key === currentPhase) > i || currentPhase === 'closed'
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          {PHASE_STEPS.map((step) => (
            <span key={step.key} className="text-center flex-1">
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {/* Phase Content */}
      {currentPhase === 'context' && (
        <div className="bg-white rounded-lg border p-6 space-y-6">
          <h2 className="text-lg font-semibold">Step 2: Context Packet</h2>
          <p className="text-sm text-gray-500">
            Document the incident, patterns, and contributing factors.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Incident Summary *
            </label>
            <textarea
              value={incidentSummary}
              onChange={(e) => setIncidentSummary(e.target.value)}
              placeholder="Describe what happened..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern Review *
            </label>
            <textarea
              value={patternReview}
              onChange={(e) => setPatternReview(e.target.value)}
              placeholder="Describe recurring patterns or behaviors..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environmental Factors *
            </label>
            <div className="flex flex-wrap gap-2">
              {ENVIRONMENTAL_FACTORS.map((factor) => (
                <button
                  key={factor}
                  type="button"
                  onClick={() => {
                    if (environmentalFactors.includes(factor)) {
                      setEnvironmentalFactors(environmentalFactors.filter((f) => f !== factor))
                    } else {
                      setEnvironmentalFactors([...environmentalFactors, factor])
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${
                    environmentalFactors.includes(factor)
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-gray-100 text-gray-700'
                  } border`}
                >
                  {factor}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prior Interventions Summary *
            </label>
            <textarea
              value={priorInterventions}
              onChange={(e) => setPriorInterventions(e.target.value)}
              placeholder="Summarize Level A/B interventions attempted..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <button
            onClick={saveContextPacket}
            disabled={
              isSubmitting ||
              !incidentSummary ||
              !patternReview ||
              !environmentalFactors.length ||
              !priorInterventions
            }
            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
          >
            {isSubmitting ? 'Saving...' : 'Save Context Packet & Continue'}
          </button>
        </div>
      )}

      {currentPhase === 'admin' && (
        <div className="bg-white rounded-lg border p-6 space-y-6">
          <h2 className="text-lg font-semibold">Step 3: Admin Response</h2>
          <p className="text-sm text-gray-500">
            Record the administrative decision and consequence.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ADMIN_RESPONSE_TYPES).map(([key, value]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAdminResponseType(value)}
                  className={`p-3 rounded-lg border text-left ${
                    adminResponseType === value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {ADMIN_RESPONSE_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Response Details
            </label>
            <textarea
              value={adminResponseDetails}
              onChange={(e) => setAdminResponseDetails(e.target.value)}
              placeholder="Additional details about the decision..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={consequenceStartDate}
                onChange={(e) => setConsequenceStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={consequenceEndDate}
                onChange={(e) => setConsequenceEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <button
            onClick={saveAdminResponse}
            disabled={isSubmitting || !adminResponseType}
            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
          >
            {isSubmitting ? 'Saving...' : 'Save Admin Response & Continue'}
          </button>
        </div>
      )}

      {currentPhase === 'reentry' && (
        <div className="bg-white rounded-lg border p-6 space-y-6">
          <h2 className="text-lg font-semibold">Step 4: Re-entry Planning & Support Plan</h2>
          <p className="text-sm text-gray-500">
            Create the one-page Student Support Plan and schedule re-entry.
          </p>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h4 className="font-medium text-amber-800">One-Page Support Plan</h4>
            <p className="text-sm text-amber-700 mt-1">
              Focus on a single domain with one measurable goal and designated adult mentor.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Support Plan Goal *
            </label>
            <textarea
              value={supportPlanGoal}
              onChange={(e) => setSupportPlanGoal(e.target.value)}
              placeholder="Single, measurable goal for the student..."
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Strategies
            </label>
            {supportPlanStrategies.map((strategy, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={strategy}
                  onChange={(e) => {
                    const newStrategies = [...supportPlanStrategies]
                    newStrategies[i] = e.target.value
                    setSupportPlanStrategies(newStrategies)
                  }}
                  placeholder={`Strategy ${i + 1}`}
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                {supportPlanStrategies.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSupportPlanStrategies(supportPlanStrategies.filter((_, j) => j !== i))
                    }
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSupportPlanStrategies([...supportPlanStrategies, ''])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Strategy
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adult Mentor
            </label>
            <input
              type="text"
              value={adultMentorName}
              onChange={(e) => setAdultMentorName(e.target.value)}
              placeholder="Name of designated adult mentor"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Re-entry Date *
              </label>
              <input
                type="date"
                value={reentryDate}
                onChange={(e) => setReentryDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Re-entry Type
              </label>
              <select
                value={reentryType}
                onChange={(e) => setReentryType(e.target.value as 'standard' | 'restricted')}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="standard">Standard</option>
                <option value="restricted">Restricted (supervised transitions, structured lunch)</option>
              </select>
            </div>
          </div>

          <button
            onClick={saveReentryPlan}
            disabled={isSubmitting || !supportPlanGoal || !reentryDate}
            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
          >
            {isSubmitting ? 'Saving...' : 'Save Re-entry Plan & Start Monitoring'}
          </button>
        </div>
      )}

      {currentPhase === 'monitoring' && (
        <div className="space-y-6">
          {/* Support Plan Summary */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Student Support Plan</h2>
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Goal:</span> {caseData.support_plan_goal}
              </p>
              {caseData.support_plan_strategies?.length > 0 && (
                <div>
                  <span className="font-medium">Strategies:</span>
                  <ul className="list-disc list-inside mt-1">
                    {caseData.support_plan_strategies.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {caseData.adult_mentor_name && (
                <p>
                  <span className="font-medium">Adult Mentor:</span> {caseData.adult_mentor_name}
                </p>
              )}
              <p>
                <span className="font-medium">Monitoring Duration:</span>{' '}
                {caseData.monitoring_duration_days} days
              </p>
            </div>
          </div>

          {/* Daily Check-ins */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Daily Check-ins</h3>

            {caseData.daily_check_ins?.length > 0 && (
              <div className="space-y-2 mb-4">
                {caseData.daily_check_ins.map((checkIn, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{checkIn.date}</span>
                      <span className="text-gray-500">{checkIn.logged_by}</span>
                    </div>
                    <p className="text-sm mt-1">{checkIn.notes}</p>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Today&apos;s Check-in Notes
              </label>
              <textarea
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="Notes from today's check-in..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <button
                onClick={logCheckIn}
                disabled={isSubmitting || !checkInNotes.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Log Check-in
              </button>
            </div>
          </div>

          {/* Close Case */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Close Case</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Closure Notes
              </label>
              <textarea
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="Summary of outcomes and recommendations..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => closeCase('closed_success')}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
              >
                Close: Success
              </button>
              <button
                onClick={() => closeCase('closed_continued_support')}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300"
              >
                Close: Continued Support
              </button>
              <button
                onClick={() => closeCase('closed_escalated')}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                Close: Escalated
              </button>
            </div>
          </div>
        </div>
      )}

      {currentPhase === 'closed' && (
        <div className="bg-white rounded-lg border p-6">
          <div
            className={`text-center py-8 ${
              caseData.outcome_status === 'closed_success'
                ? 'text-green-600'
                : caseData.outcome_status === 'closed_continued_support'
                  ? 'text-amber-600'
                  : 'text-red-600'
            }`}
          >
            <div className="text-5xl mb-4">
              {caseData.outcome_status === 'closed_success' ? '✓' : '!'}
            </div>
            <h2 className="text-2xl font-bold">
              Case Closed:{' '}
              {caseData.outcome_status === 'closed_success'
                ? 'Success'
                : caseData.outcome_status === 'closed_continued_support'
                  ? 'Continued Support'
                  : 'Escalated'}
            </h2>
            {caseData.outcome_notes && (
              <p className="mt-4 text-gray-600">{caseData.outcome_notes}</p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Closed on {caseData.closure_date}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
