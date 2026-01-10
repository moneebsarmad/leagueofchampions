'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { VIEWS } from '../../../lib/views'
import CrestLoader from '../../../components/CrestLoader'

interface Student {
  id: string
  name: string
  grade: number
  section: string
  house: string
  points: number
}

interface MeritEntry {
  studentName: string
  points: number
  r: string
  subcategory: string
  dateOfEvent: string
  staffName: string
  grade: number
  section: string
}

const houseColors: Record<string, string> = {
  'House of Abū Bakr': 'var(--house-abu)',
  'House of Khadījah': 'var(--house-khad)',
  'House of ʿUmar': 'var(--house-umar)',
  'House of ʿĀʾishah': 'var(--house-aish)'}

const categoryColors: Record<string, string> = {
  Respect: 'var(--accent)',
  Responsibility: 'var(--house-khad)',
  Righteousness: 'var(--house-abu)',
}

function canonicalHouse(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[''`]/g, "'")
    .toLowerCase()
    .trim()

  if (normalized.includes('bakr') || normalized.includes('abu')) return 'House of Abū Bakr'
  if (normalized.includes('khadijah') || normalized.includes('khad')) return 'House of Khadījah'
  if (normalized.includes('umar')) return 'House of ʿUmar'
  if (normalized.includes('aishah') || normalized.includes('aish')) return 'House of ʿĀʾishah'
  return value
}

function getHouseColor(house: string): string {
  const canonical = canonicalHouse(house)
  return houseColors[canonical] || 'var(--text)'
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [meritEntries, setMeritEntries] = useState<MeritEntry[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedStaff) {
      setSelectedStaff(null)
    }
  }, [selectedStudent])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { data: studentData, error: studentError } = await supabase
        .from(VIEWS.STUDENT_POINTS)
        .select('*')
      if (studentError) {
        console.error('Supabase error:', studentError)
        setStudents([])
        setMeritEntries([])
        return
      }

      const allStudents: Student[] = (studentData || []).map((s, index) => ({
        id: s.id || `${index}`,
        name: s.student_name || s.name || '',
        grade: s.grade || 0,
        section: s.section || '',
        house: s.house || s.house_name || '',
        points: Number(s.total_points ?? s.points ?? 0)}))

      const { data: meritData, error: meritError } = await supabase
        .from(VIEWS.STUDENT_POINTS_BY_R)
        .select('*')
      if (meritError) {
        console.error('Supabase error:', meritError)
        setMeritEntries([])
      } else {
        const entries: MeritEntry[] = (meritData || []).map((m) => ({
          studentName: m.student_name || m.student || m.name || '',
          points: m.total_points || m.points || 0,
          r: m.r || m.category || '',
          subcategory: m.subcategory || '',
          dateOfEvent: m.date || '',
          staffName: m.staff_name || m.staff || '',
          grade: m.grade || 0,
          section: m.section || ''}))
        setMeritEntries(entries)
      }

      setStudents(allStudents)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const grades = [...new Set(students.map((s) => s.grade))].sort((a, b) => a - b)
  const sections = [...new Set(students.map((s) => s.section).filter(Boolean))].sort()
  const houses = [...new Set(students.map((s) => canonicalHouse(s.house)))].filter(Boolean)

  const filteredStudents = students
    .filter((s) => {
      if (searchText && !s.name.toLowerCase().includes(searchText.toLowerCase())) return false
      if (selectedGrade && s.grade !== parseInt(selectedGrade)) return false
      if (selectedSection && s.section !== selectedSection) return false
      if (selectedHouse && canonicalHouse(s.house) !== selectedHouse) return false
      return true
    })
    .sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade
      if (a.section !== b.section) return a.section.localeCompare(b.section)
      return a.name.localeCompare(b.name)
    })

  const groupedStudents: Record<string, Student[]> = {}
  filteredStudents.forEach((s) => {
    const key = `${s.grade}${s.section}`
    if (!groupedStudents[key]) groupedStudents[key] = []
    groupedStudents[key].push(s)
  })

  const studentMerits = selectedStudent
    ? meritEntries.filter((e) =>
        e.studentName.toLowerCase() === selectedStudent.name.toLowerCase() &&
        e.grade === selectedStudent.grade &&
        e.section.toLowerCase() === selectedStudent.section.toLowerCase()
      )
    : []
  const filteredStudentMerits = selectedStaff
    ? studentMerits.filter((e) => e.staffName === selectedStaff)
    : studentMerits

  const getCategoryPoints = (category: string) => {
    const match = filteredStudentMerits.find((entry) =>
      entry.r.toLowerCase().includes(category.toLowerCase())
    )
    return match?.points ?? 0
  }

  if (isLoading) {
    return (
      <CrestLoader label="Loading students..." />
    )
  }

  return (
    <div className="flex gap-6">
      {/* Student List */}
      <div className={`${selectedStudent ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
            Students
          </h1>
          <div className="flex items-center gap-3">
            <div className="h-1 w-16 bg-[var(--accent)] rounded-full"></div>
            <p className="text-[var(--text-muted)] text-sm font-medium">{students.length} students enrolled</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card rounded-2xl p-5 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search students..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="input w-full"
              />
            </div>

            {/* Grade Filter */}
            <select
              value={selectedGrade || ''}
              onChange={(e) => setSelectedGrade(e.target.value || null)}
              className="input"
            >
              <option value="">All Grades</option>
              {grades.map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>

            {/* House Filter */}
            <select
              value={selectedHouse || ''}
              onChange={(e) => setSelectedHouse(e.target.value || null)}
              className="input"
            >
              <option value="">All Houses</option>
              {houses.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            {/* Section Filter */}
            <select
              value={selectedSection || ''}
              onChange={(e) => setSelectedSection(e.target.value || null)}
              className="input"
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Student List */}
        <div className="space-y-6">
          {Object.entries(groupedStudents).map(([classLabel, classStudents]) => (
            <div key={classLabel}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-[var(--text)]">Class {classLabel}</h2>
                <span className="text-sm text-[var(--text-muted)]">{classStudents.length} students</span>
              </div>
              <div className="card rounded-2xl overflow-hidden">
                {classStudents.map((student, index) => {
                  const houseColor = getHouseColor(student.house)
                  return (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`flex items-center gap-4 p-4 cursor-pointer transition-all ${
                        index !== classStudents.length - 1 ? 'border-b border-[var(--border)]' : ''
                      } ${selectedStudent?.id === student.id ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'}`}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold"
                        style={{
                          backgroundColor: 'var(--surface-2)',
                          color: houseColor,
                          border: '1px solid var(--border)'}}
                      >
                        {getInitials(student.name)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text)]">{student.name}</p>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                          <span>Grade {student.grade}{student.section}</span>
                          <span className="text-[var(--text-muted)]">•</span>
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: houseColor }}
                          />
                          <span>{canonicalHouse(student.house)?.replace('House of ', '')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[var(--text)]">{student.points}</p>
                        <p className="text-xs text-[var(--text-muted)]">points</p>
                      </div>
                      <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {Object.keys(groupedStudents).length === 0 && (
            <div className="card rounded-2xl p-8 text-center">
              <p className="text-[var(--text-muted)]">No students found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Student Detail Panel */}
      {selectedStudent && (
        <div className="w-1/2 sticky top-24 h-fit">
          <div className="card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text)]">Student Details</h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold"
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    color: getHouseColor(selectedStudent.house),
                    border: '1px solid var(--border)'}}
                >
                  {getInitials(selectedStudent.name)}
                </div>
                <div>
                  <p className="text-xl font-bold text-[var(--text)]">
                    {selectedStudent.name}
                  </p>
                  <p className="text-[var(--text-muted)]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGrade(String(selectedStudent.grade))
                        setSelectedSection(selectedStudent.section || null)
                      }}
                      className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)] decoration-2 hover:text-[var(--text)] transition-colors"
                    >
                      Grade {selectedStudent.grade}{selectedStudent.section}
                    </button>
                    <span className="text-[var(--text-muted)]"> • </span>
                    <button
                      type="button"
                      onClick={() => setSelectedHouse(canonicalHouse(selectedStudent.house))}
                      className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)] decoration-2 hover:text-[var(--text)] transition-colors"
                    >
                      {canonicalHouse(selectedStudent.house)}
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Total Points */}
            <div className="surface-muted p-6 text-center">
              <p className="text-sm text-[var(--text-muted)] mb-1">Total Points</p>
              <p
                className="text-4xl font-bold"
                style={{
                  color: getHouseColor(selectedStudent.house)}}
              >
                {selectedStudent.points}
              </p>
            </div>

            {/* Points by Category */}
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Points by Category</h3>
              {['Respect', 'Responsibility', 'Righteousness'].map((category) => {
                const categoryPoints = getCategoryPoints(category)
                const color = categoryColors[category] || 'var(--text-muted)'
                return (
                  <div key={category} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm text-[var(--text-muted)]">{category}</span>
                    </div>
                    <span className="font-semibold" style={{ color }}>{categoryPoints}</span>
                  </div>
                )
              })}
            </div>

            {/* Recent Activity */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Recent Activity</h3>
                {selectedStaff ? (
                  <button
                    type="button"
                    onClick={() => setSelectedStaff(null)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                  >
                    Clear staff filter
                  </button>
                ) : null}
              </div>
              {filteredStudentMerits.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm">No activity yet</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {filteredStudentMerits.slice(0, 10).map((merit, index) => (
                    <div key={index} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          {merit.subcategory || merit.r?.split(' – ')[0]}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedStaff(merit.staffName)}
                          className="text-xs text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)] decoration-2 hover:text-[var(--text)] transition-colors"
                        >
                          {merit.staffName}
                        </button>
                      </div>
                      <span className="text-[var(--house-khad)] font-semibold">+{merit.points}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
