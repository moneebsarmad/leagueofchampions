'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { VIEWS } from '@/lib/views'
import CrestLoader from '@/components/CrestLoader'

type Student = {
  name: string
  grade: number
  section: string
  house: string
}

type Staff = {
  name: string
  email: string
}

type MeritEntry = {
  studentName: string
  grade: number
  section: string
  house: string
  points: number
  staffName: string
  category: string
  subcategory: string
  timestamp: string
  notes: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [entries, setEntries] = useState<MeritEntry[]>([])
  const [staffAwards, setStaffAwards] = useState<{ name: string; points: number; awards: number; students: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStudentKey, setSelectedStudentKey] = useState<string | null>(null)
  const [selectedStaffName, setSelectedStaffName] = useState<string | null>(null)

  const getRowValue = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      if (key in row) return row[key]
    }
    const normalizedKeys = Object.keys(row).reduce<Record<string, string>>((acc, key) => {
      acc[key.toLowerCase()] = key
      return acc
    }, {})
    for (const key of keys) {
      const normalized = normalizedKeys[key.toLowerCase()]
      if (normalized) return row[normalized]
    }
    return undefined
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [studentRes, entryRes, staffRes] = await Promise.all([
          supabase.from(VIEWS.STUDENT_POINTS).select('*'),
          supabase.from(VIEWS.STUDENT_POINTS_BY_R).select('*'),
          supabase.from(VIEWS.STAFF_3R).select('*'),
        ])

        if (studentRes.error) {
          console.error('Supabase error:', studentRes.error)
          setStudents([])
        } else {
          const allStudents: Student[] = (studentRes.data || []).map((s) => ({
            name: s.student_name || s.name || '',
            grade: s.grade || 0,
            section: s.section || '',
            house: s.house || s.house_name || ''}))
          setStudents(allStudents.filter((s) => s.name))
        }

        if (entryRes.error) {
          console.error('Supabase error:', entryRes.error)
          setEntries([])
        } else {
          const mappedEntries: MeritEntry[] = (entryRes.data || []).map((m) => ({
            studentName: String(getRowValue(m, ['student_name', 'student', 'name']) ?? ''),
            grade: Number(getRowValue(m, ['grade']) ?? 0),
            section: String(getRowValue(m, ['section']) ?? ''),
            house: String(getRowValue(m, ['house', 'house_name']) ?? ''),
            points: Number(getRowValue(m, ['points', 'total_points']) ?? 0),
            staffName: String(getRowValue(m, ['staff_name', 'staff']) ?? ''),
            category: String(getRowValue(m, ['category', 'r']) ?? ''),
            subcategory: String(getRowValue(m, ['subcategory']) ?? ''),
            timestamp: String(getRowValue(m, ['timestamp', 'awarded_at', 'date']) ?? ''),
            notes: String(getRowValue(m, ['notes']) ?? '')}))
          setEntries(mappedEntries)
        }

        if (staffRes.error) {
          console.error('Supabase error:', staffRes.error)
          setStaff([])
          setStaffAwards([])
        } else {
          const staffRows = (staffRes.data || []).map((row) => ({
            name: String(getRowValue(row, ['staff_name', 'staff']) ?? ''),
            points: Number(getRowValue(row, ['total_points', 'points']) ?? 0),
            awards: Number(getRowValue(row, ['awards', 'award_count', 'recognitions']) ?? 0),
            students: Number(getRowValue(row, ['students', 'unique_students']) ?? 0)}))
          setStaffAwards(staffRows.filter((row) => row.name))
          setStaff(staffRows.filter((row) => row.name).map((row) => ({ name: row.name, email: '' })))
        }
      } catch (error) {
        console.error('Search data error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredStudents = useMemo(() => {
    if (!normalizedQuery) return []
    return students.filter((s) => s.name.toLowerCase().includes(normalizedQuery))
  }, [students, normalizedQuery])

  const filteredStaff = useMemo(() => {
    if (!normalizedQuery) return []
    return staff.filter((s) => s.name.toLowerCase().includes(normalizedQuery))
  }, [staff, normalizedQuery])

  const studentHistory = useMemo(() => {
    if (!selectedStudentKey) return []
    return entries
      .filter((e) => `${e.studentName.toLowerCase()}|${e.grade}|${e.section.toLowerCase()}` === selectedStudentKey)
      .slice(0, 5)
  }, [entries, selectedStudentKey])

  const staffStats = useMemo(() => {
    if (!selectedStaffName) return null
    const staffEntry = staffAwards.find((entry) => entry.name.toLowerCase() === selectedStaffName.toLowerCase())
    return {
      points: staffEntry?.points ?? 0,
      awards: staffEntry?.awards ?? 0,
      students: staffEntry?.students ?? 0}
  }, [staffAwards, selectedStaffName])

  if (isLoading) {
    return <CrestLoader label="Loading search..." />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Student & Staff Search
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-[var(--accent)] rounded-full"></div>
          <p className="text-[var(--text-muted)] text-sm font-medium">Quick lookup for profiles and history</p>
        </div>
      </div>

      <div className="card rounded-2xl p-6 mb-8">
        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 tracking-wider">
          Search by name
        </label>
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelectedStudentKey(null)
            setSelectedStaffName(null)
          }}
          placeholder="Type a student or staff name..."
          className="input w-full px-4 py-3 rounded-xl text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text)]">
            Students
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">Click a student to view recent recognitions.</p>
          <div className="mt-4 space-y-3">
            {filteredStudents.length === 0 && normalizedQuery ? (
              <p className="text-sm text-[var(--text-muted)]">No student matches found.</p>
            ) : (
              filteredStudents.slice(0, 8).map((student) => {
                const key = `${student.name.toLowerCase()}|${student.grade}|${student.section.toLowerCase()}`
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedStudentKey(key)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--border)] transition bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[var(--text)]">{student.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Grade {student.grade}{student.section} • {student.house}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">View</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {selectedStudentKey && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-[var(--text-muted)] tracking-wider mb-2">Recent recognitions</p>
              {studentHistory.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No recognitions found.</p>
              ) : (
                <div className="space-y-2">
                  {studentHistory.map((entry, index) => (
                    <div key={`${entry.timestamp}-${index}`} className="rounded-xl bg-[var(--surface-2)] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[var(--text)]">
                          {entry.subcategory || entry.category}
                        </p>
                        <span className="text-sm font-semibold text-[var(--accent)]">{entry.points} pts</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {entry.staffName} • {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text)]">
            Staff
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">Quick stats for staff contributions.</p>
          <div className="mt-4 space-y-3">
            {filteredStaff.length === 0 && normalizedQuery ? (
              <p className="text-sm text-[var(--text-muted)]">No staff matches found.</p>
            ) : (
              filteredStaff.slice(0, 8).map((member) => (
                <button
                  key={`${member.name}-${member.email}`}
                  onClick={() => setSelectedStaffName(member.name)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--border)] transition bg-white"
                >
                  <p className="font-semibold text-[var(--text)]">{member.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{member.email}</p>
                </button>
              ))
            )}
          </div>

          {selectedStaffName && staffStats && (
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
                <p className="text-xs text-[var(--text-muted)] tracking-wider">Points</p>
                <p className="text-lg font-semibold text-[var(--text)]">{staffStats.points.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
                <p className="text-xs text-[var(--text-muted)] tracking-wider">Awards</p>
                <p className="text-lg font-semibold text-[var(--text)]">{staffStats.awards.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
                <p className="text-xs text-[var(--text-muted)] tracking-wider">Students</p>
                <p className="text-lg font-semibold text-[var(--text)]">{staffStats.students.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
