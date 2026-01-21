'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { BehavioralDomain, LevelCTriggerType, LevelCCaseType } from '@/types/interventions'
import { LEVEL_C_TRIGGER_TYPES, LEVEL_C_CASE_TYPES } from '@/types/interventions'

interface Student {
  id: string
  student_name: string
  grade: number
  section: string
  house: string
}

const TRIGGER_LABELS: Record<LevelCTriggerType, { label: string; description: string }> = {
  safety_incident: {
    label: 'Safety Incident',
    description: 'Immediate physical/emotional safety concern',
  },
  no_improvement_2_level_b: {
    label: 'No Improvement (2+ Level B)',
    description: 'Student has had 2+ Level B interventions without improvement',
  },
  chronic_pattern: {
    label: 'Chronic Pattern',
    description: 'Ongoing behavioral pattern across multiple domains or time periods',
  },
  post_oss_reentry: {
    label: 'Post-OSS Re-entry',
    description: 'Re-entry planning after out-of-school suspension',
  },
  threshold_20_points: {
    label: '20 SIS Demerit Points',
    description: 'Student has accumulated 20 demerit points in SIS',
  },
  threshold_30_points: {
    label: '30 SIS Demerit Points',
    description: 'Student has accumulated 30 demerit points in SIS',
  },
  threshold_35_points: {
    label: '35 SIS Demerit Points',
    description: 'Student has accumulated 35 demerit points in SIS',
  },
  threshold_40_points: {
    label: '40 SIS Demerit Points',
    description: 'Student has accumulated 40 demerit points in SIS',
  },
  admin_referral: {
    label: 'Admin Referral',
    description: 'Direct referral from administration',
  },
}

const CASE_TYPE_INFO: Record<LevelCCaseType, { label: string; description: string; duration: string }> = {
  lite: {
    label: 'Level C Lite',
    description: 'Abbreviated case management for moderate concerns',
    duration: '1-2 weeks',
  },
  standard: {
    label: 'Standard',
    description: 'Full case management with all phases',
    duration: '2-4 weeks',
  },
  intensive: {
    label: 'Intensive',
    description: 'Extended case management for complex situations',
    duration: '4-6+ weeks',
  },
}

export default function NewLevelCCasePage() {
  const router = useRouter()
  const [domains, setDomains] = useState<BehavioralDomain[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [triggerType, setTriggerType] = useState<LevelCTriggerType | null>(null)
  const [caseType, setCaseType] = useState<LevelCCaseType>('standard')
  const [domainFocusId, setDomainFocusId] = useState<number | null>(null)
  const [sisDemeritPoints, setSisDemeritPoints] = useState<string>('')

  // Fetch domains on mount
  useEffect(() => {
    async function fetchDomains() {
      try {
        const res = await fetch('/api/interventions/domains')
        const json = await res.json()
        if (json.success) {
          setDomains(json.data)
        }
      } catch (err) {
        console.error('Failed to fetch domains:', err)
      }
    }
    fetchDomains()
  }, [])

  // Search students
  useEffect(() => {
    if (searchQuery.length < 2) {
      setStudents([])
      return
    }

    const debounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/students?search=${encodeURIComponent(searchQuery)}&limit=10`
        )
        const json = await res.json()
        if (json.data) {
          setStudents(json.data)
        }
      } catch (err) {
        console.error('Failed to search students:', err)
      }
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchQuery])

  // Auto-select case type based on trigger
  useEffect(() => {
    if (!triggerType) return

    // Safety incidents and post-OSS get standard by default
    if (triggerType === 'safety_incident' || triggerType === 'post_oss_reentry') {
      setCaseType('standard')
    }
    // Threshold-based triggers auto-select based on points
    else if (triggerType === 'threshold_20_points') {
      setCaseType('lite')
    } else if (triggerType === 'threshold_30_points' || triggerType === 'threshold_35_points') {
      setCaseType('standard')
    } else if (triggerType === 'threshold_40_points') {
      setCaseType('intensive')
    }
  }, [triggerType])

  const handleSubmit = async () => {
    if (!selectedStudent || !triggerType) {
      setError('Please select a student and trigger type')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/interventions/level-c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          trigger_type: triggerType,
          case_type: caseType,
          domain_focus_id: domainFocusId || undefined,
          sis_demerit_points_at_creation: sisDemeritPoints ? parseInt(sisDemeritPoints) : undefined,
        }),
      })

      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error || 'Failed to create case')
      }

      // Navigate to the case detail page
      router.push(`/dashboard/interventions/case-management/${json.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isThresholdTrigger = triggerType?.startsWith('threshold_')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/dashboard/interventions/case-management')}
        className="text-gray-500 hover:text-gray-700 mb-4"
      >
        &larr; Back to Case Management
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Open New Level C Case
      </h1>
      <p className="text-gray-500 mb-8">
        Intensive case management for students requiring sustained support (2-4 weeks)
      </p>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Student Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            1. Select Student
          </label>
          {selectedStudent ? (
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div>
                <p className="font-medium">{selectedStudent.student_name}</p>
                <p className="text-sm text-gray-500">
                  Grade {selectedStudent.grade}
                  {selectedStudent.section} &bull; {selectedStudent.house}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-purple-600 hover:text-purple-800"
              >
                Change
              </button>
            </div>
          ) : (
            <div>
              <input
                type="text"
                placeholder="Search student by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              {students.length > 0 && (
                <ul className="mt-2 border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                  {students.map((student) => (
                    <li key={student.id}>
                      <button
                        onClick={() => {
                          setSelectedStudent(student)
                          setSearchQuery('')
                          setStudents([])
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <p className="font-medium">{student.student_name}</p>
                        <p className="text-sm text-gray-500">
                          Grade {student.grade}
                          {student.section} &bull; {student.house}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Trigger Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            2. Reason for Level C (Trigger)
          </label>
          <div className="space-y-2">
            {Object.entries(LEVEL_C_TRIGGER_TYPES).map(([key, value]) => (
              <button
                key={value}
                onClick={() => setTriggerType(value)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  triggerType === value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium">{TRIGGER_LABELS[value].label}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {TRIGGER_LABELS[value].description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* SIS Demerit Points (for threshold triggers) */}
        {isThresholdTrigger && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current SIS Demerit Points (for reference)
            </label>
            <input
              type="number"
              value={sisDemeritPoints}
              onChange={(e) => setSisDemeritPoints(e.target.value)}
              placeholder="Enter current point total from SIS"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Record the student's current demerit point total for tracking purposes.
            </p>
          </div>
        )}

        {/* Case Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            3. Case Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(LEVEL_C_CASE_TYPES).map(([key, value]) => (
              <button
                key={value}
                onClick={() => setCaseType(value)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  caseType === value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium">{CASE_TYPE_INFO[value].label}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {CASE_TYPE_INFO[value].duration}
                </p>
              </button>
            ))}
          </div>
          {caseType && (
            <p className="text-sm text-gray-500 mt-2">
              {CASE_TYPE_INFO[caseType].description}
            </p>
          )}
        </div>

        {/* Domain Focus (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            4. Primary Domain Focus (Optional)
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Select if there's a specific behavioral domain this case will focus on.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDomainFocusId(null)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                domainFocusId === null
                  ? 'border-gray-500 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-600">No specific focus</p>
              <p className="text-xs text-gray-500">Multi-domain approach</p>
            </button>
            {domains.map((domain) => (
              <button
                key={domain.id}
                onClick={() => setDomainFocusId(domain.id)}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  domainFocusId === domain.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium">{domain.domain_name}</p>
                <p className="text-xs text-gray-500 truncate">{domain.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {selectedStudent && triggerType && (
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h4 className="font-medium text-gray-700 mb-2">Case Summary</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><span className="font-medium">Student:</span> {selectedStudent.student_name}</li>
              <li><span className="font-medium">Trigger:</span> {TRIGGER_LABELS[triggerType].label}</li>
              <li><span className="font-medium">Case Type:</span> {CASE_TYPE_INFO[caseType].label} ({CASE_TYPE_INFO[caseType].duration})</li>
              {domainFocusId && (
                <li><span className="font-medium">Domain Focus:</span> {domains.find(d => d.id === domainFocusId)?.domain_name}</li>
              )}
              {sisDemeritPoints && (
                <li><span className="font-medium">SIS Points:</span> {sisDemeritPoints}</li>
              )}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedStudent || !triggerType}
          className="w-full py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-lg"
        >
          {isSubmitting ? 'Creating Case...' : 'Open Level C Case'}
        </button>

        <p className="text-sm text-gray-500 text-center">
          After creating the case, you'll be taken to the case detail page to complete the context packet.
        </p>
      </div>
    </div>
  )
}
