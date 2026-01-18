'use client'

import { useEffect, useState } from 'react'
import { supabase, isDemo } from '@/lib/supabase'
import { VIEWS, TABLES } from '@/lib/views'
import CrestLoader from '@/components/CrestLoader'

interface Student {
  id: string
  name: string
  grade: number
  section: string
  house: string
}

interface CategoryRow {
  id: number
  r: string
  subcategory: string
  points: number
  description?: string
}

interface MeritCategory {
  id: string
  name: string
  description: string
  icon: string
  subcategories: MeritSubcategory[]
}

interface MeritSubcategory {
  id: string
  name: string
  description: string
  points: number
  dbId: number
}

const houseColors: Record<string, string> = {
  'House of Abū Bakr': 'var(--house-abu)',
  'House of Khadījah': 'var(--house-khad)',
  'House of ʿUmar': 'var(--house-umar)',
  'House of ʿĀʾishah': 'var(--house-aish)'}

const categoryMeta: Record<string, { icon: string; description: string }> = {
  Respect: { icon: '🤝', description: 'Showing consideration for others' },
  Responsibility: { icon: '✅', description: 'Being accountable for actions' },
  Righteousness: { icon: '⭐', description: 'Doing what is morally right' }}

// Fallback categories in case DB fetch fails
const fallbackCategories: MeritCategory[] = [
  {
    id: 'respect',
    name: 'Respect',
    description: 'Showing consideration for others',
    icon: '🤝',
    subcategories: [
      { id: 'r1', name: 'Polite Communication', description: 'Using kind words and respectful tone', points: 5, dbId: 0 },
      { id: 'r2', name: 'Active Listening', description: 'Paying attention when others speak', points: 5, dbId: 0 },
      { id: 'r3', name: 'Helping Others', description: 'Offering assistance to classmates or teachers', points: 10, dbId: 0 },
      { id: 'r4', name: 'Conflict Resolution', description: 'Resolving disagreements peacefully', points: 15, dbId: 0 },
    ]},
  {
    id: 'responsibility',
    name: 'Responsibility',
    description: 'Being accountable for actions',
    icon: '✅',
    subcategories: [
      { id: 's1', name: 'Punctuality', description: 'Arriving on time to class', points: 5, dbId: 0 },
      { id: 's2', name: 'Homework Completion', description: 'Submitting assignments on time', points: 5, dbId: 0 },
      { id: 's3', name: 'Leadership', description: 'Taking initiative in group activities', points: 10, dbId: 0 },
      { id: 's4', name: 'Taking Ownership', description: 'Admitting mistakes and learning from them', points: 15, dbId: 0 },
    ]},
  {
    id: 'righteousness',
    name: 'Righteousness',
    description: 'Doing what is morally right',
    icon: '⭐',
    subcategories: [
      { id: 'g1', name: 'Honesty', description: 'Being truthful in all situations', points: 10, dbId: 0 },
      { id: 'g2', name: 'Integrity', description: 'Doing the right thing even when unobserved', points: 10, dbId: 0 },
      { id: 'g3', name: 'Fairness', description: 'Treating everyone equally', points: 10, dbId: 0 },
      { id: 'g4', name: 'Excellence', description: 'Going above and beyond expectations', points: 15, dbId: 0 },
    ]},
]

export default function AddPointsClient() {
  const [students, setStudents] = useState<Student[]>([])
  const [meritCategories, setMeritCategories] = useState<MeritCategory[]>(fallbackCategories)
  const [searchText, setSearchText] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<MeritCategory | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<MeritSubcategory | null>(null)
  const [notes, setNotes] = useState('')
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [staffName, setStaffName] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    fetchStudents()
    fetchCategories()
    fetchStaffName()
  }, [])

  const fetchStaffName = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      // Try to get staff name from staff table via email
      const { data: staffData } = await supabase
        .from(TABLES.STAFF)
        .select('staff_name')
        .eq('email', authData.user.email)
        .single()

      if (staffData?.staff_name) {
        setStaffName(staffData.staff_name)
      } else {
        // Fallback to email or user metadata
        setStaffName(authData.user.user_metadata?.full_name || authData.user.email || 'Staff')
      }
    } catch (error) {
      console.error('Error fetching staff name:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .order('r')
        .order('subcategory')

      if (error) {
        console.error('Error fetching categories:', error)
        return // Keep fallback categories
      }

      if (!data || data.length === 0) {
        console.warn('No categories found in database, using fallback')
        return
      }

      // Group by R category
      const grouped: Record<string, CategoryRow[]> = {}
      data.forEach((row: CategoryRow) => {
        const rName = row.r || 'Other'
        if (!grouped[rName]) {
          grouped[rName] = []
        }
        grouped[rName].push(row)
      })

      // Transform to MeritCategory format
      const categories: MeritCategory[] = Object.entries(grouped).map(([rName, rows]) => {
        const meta = categoryMeta[rName] || { icon: '📋', description: rName }
        return {
          id: rName.toLowerCase(),
          name: rName,
          description: meta.description,
          icon: meta.icon,
          subcategories: rows.map((row, index) => ({
            id: `${rName.toLowerCase()}-${index}`,
            name: row.subcategory,
            description: row.description || row.subcategory,
            points: row.points,
            dbId: row.id}))}
      })

      if (categories.length > 0) {
        setMeritCategories(categories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchStudents = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from(VIEWS.STUDENT_POINTS)
        .select('*')
      if (error) {
        console.error('Supabase error:', error)
        setStudents([])
        return
      }
      const allStudents: Student[] = (data || []).map((s, index) => ({
        id: s.id || `${index}`,
        name: s.student_name || s.name || '',
        grade: s.grade || 0,
        section: s.section || '',
        house: s.house || s.house_name || ''}))
      setStudents(allStudents)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredStudents = students
    .filter((s) => searchText && s.name.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10)

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedCategory || !selectedSubcategory) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Construct the merit_log entry
      const meritEntry = {
        student_name: selectedStudent.name,
        grade: selectedStudent.grade,
        section: selectedStudent.section,
        house: selectedStudent.house,
        points: selectedSubcategory.points,
        staff_name: staffName,
        r: selectedCategory.name,
        subcategory: selectedSubcategory.name,
        timestamp: new Date(eventDate).toISOString(),
        notes: notes || null}

      const { error } = await supabase
        .from(TABLES.MERIT_LOG)
        .insert(meritEntry)

      if (error) {
        console.error('Supabase insert error:', error)
        if (error.code === '42501') {
          setSubmitError('Permission denied. You may not have permission to award points.')
        } else {
          setSubmitError(error.message || 'Failed to add points. Please try again.')
        }
        return
      }

      // Success
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        resetForm()
      }, 2500)
    } catch (error) {
      console.error('Error:', error)
      setSubmitError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedStudent(null)
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setNotes('')
    setEventDate(new Date().toISOString().split('T')[0])
    setSearchText('')
    setSubmitError(null)
  }

  if (isLoading) {
    return <CrestLoader label="Loading..." />
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Add Points
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-[var(--accent)] rounded-full"></div>
          <p className="text-[var(--text-muted)] text-sm font-medium">Award merit points to students</p>
        </div>
      </div>

      {showSuccess && (
        <div className="bg-[var(--house-khad)]/10 border border-[var(--border)] text-[var(--house-khad)] px-5 py-4 rounded-xl mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--house-khad)] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="font-medium">Points awarded successfully!</span>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Leaderboard will update automatically.</p>
          </div>
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <span className="font-medium">Failed to award points</span>
            <p className="text-sm text-red-600/80 mt-0.5">{submitError}</p>
          </div>
          <button
            onClick={() => setSubmitError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--border)] mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-8 h-8 bg-[var(--accent)] text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
          <h2 className="text-lg font-semibold text-[var(--text)]">Select Student</h2>
        </div>

        {selectedStudent ? (
          <div className="flex items-center gap-4 p-4 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: `${houseColors[selectedStudent.house]}20`,
                color: houseColors[selectedStudent.house]}}
            >
              {getInitials(selectedStudent.name)}
            </div>
            <div className="flex-1">
              <p className="font-medium text-[var(--text)]">{selectedStudent.name}</p>
              <p className="text-sm text-[var(--text-muted)]">
                Grade {selectedStudent.grade}{selectedStudent.section} • {selectedStudent.house}
              </p>
            </div>
            <button
              onClick={() => setSelectedStudent(null)}
              className="text-[var(--accent)] hover:text-[var(--accent)] font-medium text-sm transition-colors"
            >
              Change
            </button>
          </div>
        ) : (
          <div>
            <input
              type="text"
              placeholder="Search for a student..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--border)] outline-none mb-3 transition-all"
            />
            {filteredStudents.length > 0 && (
              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                {filteredStudents.map((student, index) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student)
                      setSearchText('')
                    }}
                    className={`w-full flex items-center gap-4 p-3.5 hover:bg-[var(--bg)] transition-colors ${
                      index !== filteredStudents.length - 1 ? 'border-b border-[var(--border)]' : ''
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: `${houseColors[student.house]}20`,
                        color: houseColors[student.house]}}
                    >
                      {getInitials(student.name)}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-[var(--text)]">{student.name}</p>
                      <p className="text-sm text-[var(--text-muted)]">
                        Grade {student.grade}{student.section} • {student.house?.replace('House of ', '')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--border)] mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-8 h-8 bg-[var(--accent)] text-white rounded-full flex items-center justify-center font-bold text-sm">2</span>
          <h2 className="text-lg font-semibold text-[var(--text)]">Select Category</h2>
        </div>

        <div className="space-y-3">
          {meritCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category)
                setSelectedSubcategory(null)
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selectedCategory?.id === category.id
                  ? 'border-[var(--border)] bg-[var(--accent)]/5'
                  : 'border-[var(--border)] hover:border-[var(--border)]'
              }`}
            >
              <span className="text-2xl">{category.icon}</span>
              <div className="text-left flex-1">
                <p className="font-medium text-[var(--text)]">{category.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{category.description}</p>
              </div>
              {selectedCategory?.id === category.id && (
                <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedCategory && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--border)] mb-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 bg-[var(--accent)] text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
            <h2 className="text-lg font-semibold text-[var(--text)]">Select Reason</h2>
          </div>

          <div className="space-y-2">
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubcategory(sub)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedSubcategory?.id === sub.id
                    ? 'border-[var(--border)] bg-[var(--accent)]/5'
                    : 'border-[var(--border)] hover:border-[var(--border)]'
                }`}
              >
                <div className="text-left flex-1">
                  <p className="font-medium text-[var(--text)]">{sub.name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{sub.description}</p>
                </div>
                <span className="font-bold text-[var(--house-khad)]">+{sub.points}</span>
                {selectedSubcategory?.id === sub.id && (
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSubcategory && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--border)] mb-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 bg-[var(--accent)] text-white rounded-full flex items-center justify-center font-bold text-sm">4</span>
            <h2 className="text-lg font-semibold text-[var(--text)]">Date of Event</h2>
          </div>

          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--border)] outline-none transition-all"
          />
        </div>
      )}

      {selectedSubcategory && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--border)] mb-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 bg-[var(--accent)] text-white rounded-full flex items-center justify-center font-bold text-sm">5</span>
            <h2 className="text-lg font-semibold text-[var(--text)]">Add Notes (Optional)</h2>
          </div>

          <textarea
            placeholder="Add any additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--border)] outline-none resize-none transition-all"
            rows={3}
          />
        </div>
      )}

      {selectedStudent && selectedCategory && selectedSubcategory && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || showSuccess}
          className="btn-primary w-full font-medium flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Awarding points...</span>
            </>
          ) : (
            <>
              <span>Award {selectedSubcategory.points} points to {selectedStudent.name}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  )
}
