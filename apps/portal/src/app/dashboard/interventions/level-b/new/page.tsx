'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { BehavioralDomain, EscalationTrigger } from '@/types/interventions'
import { ESCALATION_TRIGGERS, ESCALATION_TRIGGER_LABELS } from '@/types/interventions'

interface Student {
  id: string
  student_name: string
  grade: number
  section: string
  house: string
}

export default function NewLevelBPage() {
  const router = useRouter()
  const [domains, setDomains] = useState<BehavioralDomain[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<number | null>(null)
  const [escalationTrigger, setEscalationTrigger] = useState<EscalationTrigger | null>(null)

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

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedDomain || !escalationTrigger) {
      setError('Please select a student, domain, and escalation trigger')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/interventions/level-b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          domain_id: selectedDomain,
          escalation_trigger: escalationTrigger,
        }),
      })

      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error || 'Failed to create intervention')
      }

      // Navigate to the workflow
      router.push(`/dashboard/interventions/level-b/${json.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create intervention')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedDomainData = domains.find((d) => d.id === selectedDomain)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/dashboard/interventions/level-b')}
        className="text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Back to Level B List
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Start Level B Reset Conference
      </h1>
      <p className="text-gray-500 mb-8">Structured 15-20 minute intervention</p>

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
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium">{selectedStudent.student_name}</p>
                <p className="text-sm text-gray-500">
                  Grade {selectedStudent.grade}
                  {selectedStudent.section} • {selectedStudent.house}
                </p>
              </div>
              <button
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            2. Behavioral Domain
          </label>
          <div className="grid grid-cols-2 gap-3">
            {domains.map((domain) => (
              <button
                key={domain.id}
                onClick={() => setSelectedDomain(domain.id)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedDomain === domain.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium">{domain.domain_name}</p>
                <p className="text-sm text-gray-500 mt-1">{domain.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Escalation Trigger */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            3. Why Level B? (Escalation Trigger)
          </label>
          <div className="space-y-2">
            {Object.entries(ESCALATION_TRIGGERS).map(([key, value]) => (
              <button
                key={value}
                onClick={() => setEscalationTrigger(value)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  escalationTrigger === value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {ESCALATION_TRIGGER_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        {/* Domain Expectations Preview */}
        {selectedDomainData && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">
              {selectedDomainData.domain_name} Expectations:
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {selectedDomainData.expectations.map((exp, i) => (
                <li key={i}>• {exp}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedStudent || !selectedDomain || !escalationTrigger}
          className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-lg"
        >
          {isSubmitting ? 'Starting...' : 'Start Level B Conference'}
        </button>
      </div>
    </div>
  )
}
