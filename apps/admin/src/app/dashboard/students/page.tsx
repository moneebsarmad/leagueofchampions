'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { VIEWS } from '@/lib/views'
import CrestLoader from '@/components/CrestLoader'

interface Student {
  id: string
  name: string
  grade: number
  section: string
  house: string
  gender: string
  points: number
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

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [categoryTotals, setCategoryTotals] = useState<
    { studentKey: string; category: string; points: number }[]
  >([])
  const [searchText, setSearchText] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { data: studentData, error: studentError } = await supabase
        .from(VIEWS.STUDENT_POINTS)
        .select('*')
      if (studentError) {
        console.error('Supabase error:', studentError)
        setStudents([])
        return
      }

      const allStudents: Student[] = (studentData || []).map((s, index) => ({
        id: s.id || `${index}`,
        name: s.student_name || s.name || '',
        grade: s.grade || 0,
        section: s.section || '',
        house: s.house || s.house_name || '',
        gender: s.gender || '',
        points: Number(s.total_points ?? s.points ?? 0)}))

      const { data: categoryData, error: categoryError } = await supabase
        .from(VIEWS.STUDENT_POINTS_BY_R)
        .select('*')
      if (categoryError) {
        console.error('Supabase error:', categoryError)
        setCategoryTotals([])
      } else {
        const totals = (categoryData || []).map((row) => {
          const studentName = String(row.student_name ?? row.student ?? row.name ?? '')
          const grade = Number(row.grade ?? 0)
          const section = String(row.section ?? '')
          const studentKey = `${studentName.toLowerCase()}|${grade}|${section.toLowerCase()}`
          return {
            studentKey,
            category: String(row.category ?? row.r ?? ''),
            points: Number(row.total_points ?? row.points ?? 0)}
        })
        setCategoryTotals(totals)
      }

      setStudents(allStudents)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique grades
  const grades = [...new Set(students.map((s) => s.grade))].sort((a, b) => a - b)

  // Filter students
  const filteredStudents = students
    .filter((s) => {
      if (searchText && !s.name.toLowerCase().includes(searchText.toLowerCase())) return false
      if (selectedGrade && s.grade !== parseInt(selectedGrade)) return false
      if (selectedHouse && s.house !== selectedHouse) return false
      return true
    })
    .sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade
      if (a.section !== b.section) return a.section.localeCompare(b.section)
      return a.name.localeCompare(b.name)
    })

  // Group students by class
  const groupedStudents: Record<string, Student[]> = {}
  filteredStudents.forEach((s) => {
    const key = `${s.grade}${s.section}`
    if (!groupedStudents[key]) groupedStudents[key] = []
    groupedStudents[key].push(s)
  })

  // Get student merit entries
  const studentKey = selectedStudent
    ? `${selectedStudent.name.toLowerCase()}|${selectedStudent.grade}|${selectedStudent.section.toLowerCase()}`
    : ''

  const getCategoryPoints = (category: string) => {
    if (!studentKey) return 0
    const match = categoryTotals.find(
      (entry) =>
        entry.studentKey === studentKey &&
        entry.category.toLowerCase().includes(category.toLowerCase())
    )
    return match?.points ?? 0
  }

  // Get initials
  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  if (isLoading) {
    return <CrestLoader label="Loading students..." />
  }

  return (
    <div className="flex gap-6">
      {/* Student List */}
      <div className={`${selectedStudent ? 'w-1/2' : 'w-full'} transition-all`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--text)]">Students ({students.length})</h1>
        </div>

        {/* Search and Filters */}
        <div className="card p-4 mb-6">
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
              {Object.keys(houseColors).map((h) => (
                <option key={h} value={h}>{h}</option>
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
              <div className="card overflow-hidden">
                {classStudents.map((student, index) => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                      index !== classStudents.length - 1 ? 'border-b border-[var(--border)]' : ''
                    } ${selectedStudent?.id === student.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-2)]'}`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        color: 'var(--accent-2)'}}
                    >
                      {getInitials(student.name)}
                    </div>
                    <div className="flex-1">
                      <p
                        className="font-semibold text-[var(--text)]"
                      >
                        {student.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <span>Grade {student.grade}{student.section}</span>
                        <span>•</span>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: houseColors[student.house] }}
                        />
                        <span>{student.house?.replace('House of ', '')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="font-bold text-[var(--text)]"
                      >
                        {student.points}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Detail Panel */}
      {selectedStudent && (
        <div className="w-1/2 sticky top-24 h-fit">
          <div className="card overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text)]">Student Details</h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    color: houseColors[selectedStudent.house] || 'var(--text-muted)',
                    border: '1px solid var(--border)'}}
                >
                  {getInitials(selectedStudent.name)}
                </div>
                <div>
                  <p
                    className="text-xl font-bold text-[var(--text)]"
                  >
                    {selectedStudent.name}
                  </p>
                  <p className="text-[var(--text-muted)]">
                    <Link
                      href={`/dashboard/analytics?grade=${encodeURIComponent(String(selectedStudent.grade))}&section=${encodeURIComponent(selectedStudent.section)}`}
                      className="hover:text-[var(--accent-2)] transition-colors"
                    >
                      Grade {selectedStudent.grade}{selectedStudent.section}
                    </Link>
                    <span className="text-[var(--text-muted)]"> • </span>
                    <Link
                      href={`/dashboard/analytics?house=${encodeURIComponent(selectedStudent.house)}`}
                      className="hover:text-[var(--accent-2)] transition-colors"
                    >
                      {selectedStudent.house}
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Total Points */}
            <div className="p-6 border-b border-[var(--border)] text-center">
              <p className="text-sm text-[var(--text-muted)] mb-1">Total Points</p>
              <p
                className="text-4xl font-bold"
                style={{
                  color: houseColors[selectedStudent.house] || 'var(--text)'}}
              >
                {selectedStudent.points}
              </p>
            </div>

            {/* Points by Category */}
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">Points by Category</h3>
              {['Respect', 'Responsibility', 'Righteousness'].map((category) => {
                const categoryPoints = getCategoryPoints(category)
                const color = categoryColors[category] || 'var(--text-muted)'
                return (
                  <div key={category} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm text-[var(--text)]">{category}</span>
                    </div>
                    <span className="font-semibold" style={{ color }}>{categoryPoints}</span>
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
