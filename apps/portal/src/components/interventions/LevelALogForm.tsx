'use client'

import { useState, useEffect } from 'react'
import type {
  BehavioralDomain,
  LevelAInterventionType,
  LevelAOutcome,
  CreateLevelARequest,
} from '@/types/interventions'
import {
  LEVEL_A_INTERVENTION_TYPES,
  LEVEL_A_INTERVENTION_LABELS,
  LEVEL_A_OUTCOMES,
} from '@/types/interventions'

interface Student {
  id: string
  student_name: string
  grade: number
  section: string
  house: string
}

interface LevelALogFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  preselectedStudent?: Student
}

const LOCATION_OPTIONS = [
  'Classroom',
  'Hallway',
  'Prayer Hall',
  'Cafeteria',
  'Playground',
  'Gym',
  'Library',
  'Office',
  'Restroom Area',
  'Other',
]

export default function LevelALogForm({
  onSuccess,
  onCancel,
  preselectedStudent,
}: LevelALogFormProps) {
  const [domains, setDomains] = useState<BehavioralDomain[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    preselectedStudent ?? null
  )
  const [selectedDomain, setSelectedDomain] = useState<number | null>(null)
  const [interventionType, setInterventionType] =
    useState<LevelAInterventionType | null>(null)
  const [outcome, setOutcome] = useState<LevelAOutcome>('complied')
  const [location, setLocation] = useState('')
  const [behaviorDescription, setBehaviorDescription] = useState('')
  const [affectedOthers, setAffectedOthers] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedStudent || !selectedDomain || !interventionType) {
      setError('Please select a student, domain, and intervention type')
      return
    }

    setIsLoading(true)

    try {
      const request: CreateLevelARequest = {
        student_id: selectedStudent.id,
        domain_id: selectedDomain,
        intervention_type: interventionType,
        outcome,
        location: location || undefined,
        behavior_description: behaviorDescription || undefined,
        affected_others: affectedOthers,
      }

      const res = await fetch('/api/interventions/level-a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error || 'Failed to log intervention')
      }

      // Reset form
      setSelectedStudent(null)
      setSelectedDomain(null)
      setInterventionType(null)
      setOutcome('complied')
      setLocation('')
      setBehaviorDescription('')
      setAffectedOthers(false)
      setSearchQuery('')

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log intervention')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedDomainData = domains.find((d) => d.id === selectedDomain)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Student Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Student *
        </label>
        {selectedStudent ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="font-medium">{selectedStudent.student_name}</p>
              <p className="text-sm text-gray-500">
                Grade {selectedStudent.grade}
                {selectedStudent.section} • {selectedStudent.house}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              className="text-blue-600 hover:text-blue-800"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {students.length > 0 && (
              <ul className="mt-2 border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                {students.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(student)
                        setSearchQuery('')
                        setStudents([])
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <p className="font-medium">{student.student_name}</p>
                      <p className="text-sm text-gray-500">
                        Grade {student.grade}
                        {student.section} • {student.house}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Domain Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Behavioral Domain *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {domains.map((domain) => (
            <button
              key={domain.id}
              type="button"
              onClick={() => setSelectedDomain(domain.id)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                selectedDomain === domain.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-sm">{domain.domain_name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Intervention Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Intervention Type *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(LEVEL_A_INTERVENTION_TYPES).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setInterventionType(type)}
              className={`p-2 rounded-lg border text-sm transition-colors ${
                interventionType === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {LEVEL_A_INTERVENTION_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select location...</option>
          {LOCATION_OPTIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* Brief Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Brief Description (Optional)
        </label>
        <textarea
          value={behaviorDescription}
          onChange={(e) => setBehaviorDescription(e.target.value)}
          placeholder="Quick note about the behavior..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Affected Others */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="affected_others"
          checked={affectedOthers}
          onChange={(e) => setAffectedOthers(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="affected_others" className="text-sm text-gray-700">
          This incident affected other students
        </label>
      </div>

      {/* Outcome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Outcome
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOutcome('complied')}
            className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
              outcome === 'complied'
                ? 'bg-green-100 border-green-500 text-green-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            Complied
          </button>
          <button
            type="button"
            onClick={() => setOutcome('partial')}
            className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
              outcome === 'partial'
                ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            Partial
          </button>
          <button
            type="button"
            onClick={() => setOutcome('escalated')}
            className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
              outcome === 'escalated'
                ? 'bg-red-100 border-red-500 text-red-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            Escalated
          </button>
        </div>
      </div>

      {/* Quick Script Reminder */}
      {selectedDomainData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800 mb-2">
            Universal Script Reminder:
          </p>
          <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1">
            <li>
              Name domain + expectation: &quot;In {selectedDomainData.domain_name}, we...&quot;
            </li>
            <li>Tell the fix clearly</li>
            <li>Have student practice the correct behavior</li>
            <li>Positive closure: &quot;Thank you&quot; or &quot;I knew you could do it&quot;</li>
          </ol>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !selectedStudent || !selectedDomain || !interventionType}
          className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? 'Logging...' : 'Log Intervention'}
        </button>
      </div>
    </form>
  )
}
