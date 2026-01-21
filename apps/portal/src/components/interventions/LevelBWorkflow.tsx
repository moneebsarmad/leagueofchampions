'use client'

import { useState, useEffect } from 'react'
import type {
  LevelBIntervention,
  BehavioralDomain,
  UpdateLevelBStepRequest,
  MonitoringMethod,
} from '@/types/interventions'
import { MONITORING_METHODS } from '@/types/interventions'

interface LevelBWorkflowProps {
  intervention: LevelBIntervention
  domain: BehavioralDomain
  onUpdate: (intervention: LevelBIntervention) => void
  onComplete: () => void
}

const STEPS = [
  { number: 1, name: 'B1: Regulate', description: 'Help student calm down' },
  { number: 2, name: 'B2: Pattern Naming', description: 'Identify the pattern' },
  { number: 3, name: 'B3: Reflection', description: 'Guide reflection' },
  { number: 4, name: 'B4: Repair Action', description: 'Choose repair' },
  { number: 5, name: 'B5: Replacement', description: 'Practice replacement' },
  { number: 6, name: 'B6: Reset Goal', description: 'Set measurable goal' },
  { number: 7, name: 'B7: Documentation', description: 'Complete & monitor' },
]

const REFLECTION_PROMPTS = [
  'What happened just before this incident?',
  'How were you feeling at that moment?',
  'Who was affected by your actions?',
  'What expectation did you not meet?',
  'What could you have done differently?',
  'How would you handle this situation next time?',
]

export default function LevelBWorkflow({
  intervention,
  domain,
  onUpdate,
  onComplete,
}: LevelBWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state for each step
  const [regulateNotes, setRegulateNotes] = useState(
    intervention.b1_regulate_notes ?? ''
  )
  const [patternNotes, setPatternNotes] = useState(
    intervention.b2_pattern_notes ?? ''
  )
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>(
    intervention.b3_reflection_prompts_used ?? []
  )
  const [repairAction, setRepairAction] = useState(
    intervention.b4_repair_action_selected ?? ''
  )
  const [replacementSkill, setReplacementSkill] = useState(
    intervention.b5_replacement_skill_practiced ?? ''
  )
  const [resetGoal, setResetGoal] = useState(intervention.b6_reset_goal ?? '')
  const [goalTimeline, setGoalTimeline] = useState(
    intervention.b6_reset_goal_timeline_days ?? 3
  )
  const [monitoringMethod, setMonitoringMethod] = useState<MonitoringMethod>(
    intervention.monitoring_method ?? 'checklist'
  )

  // Determine which step we're on based on completion
  useEffect(() => {
    if (!intervention.b1_regulate_completed) setCurrentStep(1)
    else if (!intervention.b2_pattern_naming_completed) setCurrentStep(2)
    else if (!intervention.b3_reflection_completed) setCurrentStep(3)
    else if (!intervention.b4_repair_completed) setCurrentStep(4)
    else if (!intervention.b5_replacement_completed) setCurrentStep(5)
    else if (!intervention.b6_reset_goal_completed) setCurrentStep(6)
    else if (!intervention.b7_documentation_completed) setCurrentStep(7)
  }, [intervention])

  const updateStep = async (step: number, data: UpdateLevelBStepRequest['data']) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/interventions/level-b/${intervention.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_step',
          step,
          data,
        }),
      })
      const json = await res.json()
      if (json.success) {
        onUpdate(json.data)
        if (step < 7) {
          setCurrentStep(step + 1)
        }
      }
    } catch (err) {
      console.error('Failed to update step:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startMonitoring = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/interventions/level-b/${intervention.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_monitoring',
          monitoring_method: monitoringMethod,
        }),
      })
      const json = await res.json()
      if (json.success) {
        onUpdate(json.data)
        onComplete()
      }
    } catch (err) {
      console.error('Failed to start monitoring:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepStatus = (stepNum: number) => {
    const completions = [
      intervention.b1_regulate_completed,
      intervention.b2_pattern_naming_completed,
      intervention.b3_reflection_completed,
      intervention.b4_repair_completed,
      intervention.b5_replacement_completed,
      intervention.b6_reset_goal_completed,
      intervention.b7_documentation_completed,
    ]
    if (completions[stepNum - 1]) return 'completed'
    if (stepNum === currentStep) return 'current'
    return 'pending'
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Regulation Strategies:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Offer a calm, private space</li>
                <li>• Use a quiet, neutral tone</li>
                <li>• Allow brief silence for self-regulation</li>
                <li>• Offer water or a brief movement break</li>
                <li>• Wait until student is calm before proceeding</li>
              </ul>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes on student&apos;s regulation (optional)
              </label>
              <textarea
                value={regulateNotes}
                onChange={(e) => setRegulateNotes(e.target.value)}
                placeholder="How did the student respond to regulation strategies?"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={() =>
                updateStep(1, {
                  b1_regulate_completed: true,
                  b1_regulate_notes: regulateNotes || undefined,
                })
              }
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              Student is Regulated - Continue to Step 2
            </button>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 p-4 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-2">Pattern Naming Script:</h4>
              <p className="text-sm text-amber-700">
                &quot;I&apos;ve noticed this is the [X] time we&apos;ve had to talk about [domain behavior].
                This tells me we need to figure out what&apos;s making this hard for you.&quot;
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pattern identified
              </label>
              <textarea
                value={patternNotes}
                onChange={(e) => setPatternNotes(e.target.value)}
                placeholder="Describe the pattern you discussed with the student..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={() =>
                updateStep(2, {
                  b2_pattern_naming_completed: true,
                  b2_pattern_notes: patternNotes || undefined,
                })
              }
              disabled={isSubmitting || !patternNotes.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              Pattern Named - Continue to Step 3
            </button>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select reflection prompts used:
              </label>
              <div className="space-y-2">
                {REFLECTION_PROMPTS.map((prompt) => (
                  <label
                    key={prompt}
                    className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPrompts.includes(prompt)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPrompts([...selectedPrompts, prompt])
                        } else {
                          setSelectedPrompts(selectedPrompts.filter((p) => p !== prompt))
                        }
                      }}
                      className="mt-1"
                    />
                    <span className="text-sm">{prompt}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={() =>
                updateStep(3, {
                  b3_reflection_completed: true,
                  b3_reflection_prompts_used: selectedPrompts,
                })
              }
              disabled={isSubmitting || selectedPrompts.length === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              Reflection Complete - Continue to Step 4
            </button>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select repair action from {domain.domain_name}:
              </label>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Immediate Repairs:</p>
                {domain.repair_menu_immediate.map((repair) => (
                  <label
                    key={repair}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                      repairAction === repair
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="repair"
                      checked={repairAction === repair}
                      onChange={() => setRepairAction(repair)}
                      className="sr-only"
                    />
                    <span className="text-sm">{repair}</span>
                  </label>
                ))}
                <p className="text-xs text-gray-500 font-medium mt-4">Restorative Repairs:</p>
                {domain.repair_menu_restorative.map((repair) => (
                  <label
                    key={repair}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                      repairAction === repair
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="repair"
                      checked={repairAction === repair}
                      onChange={() => setRepairAction(repair)}
                      className="sr-only"
                    />
                    <span className="text-sm">{repair}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={() =>
                updateStep(4, {
                  b4_repair_completed: true,
                  b4_repair_action_selected: repairAction,
                })
              }
              disabled={isSubmitting || !repairAction}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              Repair Selected - Continue to Step 5
            </button>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Replacement Practice:</h4>
              <p className="text-sm text-green-700">
                Have the student physically practice the correct behavior. Model it first,
                then have them demonstrate it back to you.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What replacement skill was practiced?
              </label>
              <textarea
                value={replacementSkill}
                onChange={(e) => setReplacementSkill(e.target.value)}
                placeholder="Describe what the student practiced doing correctly..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={() =>
                updateStep(5, {
                  b5_replacement_completed: true,
                  b5_replacement_skill_practiced: replacementSkill,
                })
              }
              disabled={isSubmitting || !replacementSkill.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              Replacement Practiced - Continue to Step 6
            </button>
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">Reset Goal Requirements:</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Specific and measurable</li>
                <li>• 1-3 day timeline</li>
                <li>• Student can articulate it</li>
              </ul>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reset Goal
              </label>
              <textarea
                value={resetGoal}
                onChange={(e) => setResetGoal(e.target.value)}
                placeholder="e.g., Walk on the right side with hands to self during all transitions for 3 days"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Timeline (days)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setGoalTimeline(days)}
                    className={`flex-1 py-2 rounded-lg border ${
                      goalTimeline === days
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200'
                    }`}
                  >
                    {days} {days === 1 ? 'Day' : 'Days'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() =>
                updateStep(6, {
                  b6_reset_goal_completed: true,
                  b6_reset_goal: resetGoal,
                  b6_reset_goal_timeline_days: goalTimeline,
                })
              }
              disabled={isSubmitting || !resetGoal.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              Goal Set - Continue to Step 7
            </button>
          </div>
        )

      case 7:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Conference Summary:</h4>
              <div className="text-sm space-y-2">
                <p>
                  <span className="font-medium">Pattern:</span> {patternNotes}
                </p>
                <p>
                  <span className="font-medium">Repair:</span> {repairAction}
                </p>
                <p>
                  <span className="font-medium">Replacement:</span> {replacementSkill}
                </p>
                <p>
                  <span className="font-medium">Reset Goal:</span> {resetGoal} ({goalTimeline}{' '}
                  days)
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monitoring Method
              </label>
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                    monitoringMethod === 'checklist'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="monitoring"
                    checked={monitoringMethod === 'checklist'}
                    onChange={() => setMonitoringMethod('checklist')}
                    className="sr-only"
                  />
                  <span className="text-sm">
                    <strong>Checklist</strong> - Mark success at end of each day
                  </span>
                </label>
                <label
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                    monitoringMethod === 'verbal_check'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="monitoring"
                    checked={monitoringMethod === 'verbal_check'}
                    onChange={() => setMonitoringMethod('verbal_check')}
                    className="sr-only"
                  />
                  <span className="text-sm">
                    <strong>Verbal Check</strong> - Brief check-in conversations
                  </span>
                </label>
                <label
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                    monitoringMethod === 'written_log'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="monitoring"
                    checked={monitoringMethod === 'written_log'}
                    onChange={() => setMonitoringMethod('written_log')}
                    className="sr-only"
                  />
                  <span className="text-sm">
                    <strong>Written Log</strong> - Detailed daily notes
                  </span>
                </label>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Teacher Return Script:</strong> &quot;Welcome back. Your reset goal is{' '}
                <em>{resetGoal}</em>. Show me the first rep now.&quot;
              </p>
            </div>
            <button
              onClick={startMonitoring}
              disabled={isSubmitting}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-medium"
            >
              Complete Conference & Start {goalTimeline}-Day Monitoring
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step.number)
          return (
            <div key={step.number} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  status === 'completed'
                    ? 'bg-green-500 text-white'
                    : status === 'current'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {status === 'completed' ? '✓' : step.number}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Current Step Info */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">{STEPS[currentStep - 1].name}</h3>
        <p className="text-gray-500 text-sm">{STEPS[currentStep - 1].description}</p>
      </div>

      {/* Step Content */}
      <div className="border rounded-lg p-6">{renderStepContent()}</div>
    </div>
  )
}
