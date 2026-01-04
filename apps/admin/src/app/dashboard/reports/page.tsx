'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { VIEWS } from '@/lib/views'

type ReportTemplate = {
  id: string
  title: string
  description: string
  format: 'CSV' | 'PDF' | 'BOTH'
  scope: 'All-time' | 'Current month'
}

const templates: ReportTemplate[] = [
  {
    id: 'all-time-summary',
    title: 'All-Time Merit Summary',
    description: 'Totals by house, grade, staff, and category.',
    format: 'BOTH',
    scope: 'All-time',
  },
  {
    id: 'house-snapshot',
    title: 'House Performance Snapshot',
    description: 'Totals by house with student and staff engagement.',
    format: 'BOTH',
    scope: 'All-time',
  },
  {
    id: 'grade-section-leaderboard',
    title: 'Grade & Section Leaderboard',
    description: 'Total points by grade and section.',
    format: 'BOTH',
    scope: 'All-time',
  },
  {
    id: 'category-report',
    title: 'Merit Category Report',
    description: 'Points by 3R categories and subcategories.',
    format: 'BOTH',
    scope: 'All-time',
  },
  {
    id: 'monthly-merit',
    title: 'Monthly Merit Log',
    description: 'All merit entries for the current month.',
    format: 'BOTH',
    scope: 'Current month',
  },
  {
    id: 'monthly-highlights',
    title: 'Monthly Highlights',
    description: 'Top students, staff, and houses this month.',
    format: 'BOTH',
    scope: 'Current month',
  },
  {
    id: 'leadership-summary',
    title: 'Leadership Summary',
    description: 'Four key charts for leadership review.',
    format: 'BOTH',
    scope: 'All-time',
  },
  {
    id: 'staff-recognition',
    title: 'Staff Recognition Report',
    description: 'Monthly staff awards and participation stats.',
    format: 'BOTH',
    scope: 'Current month',
  },
]

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [students, setStudents] = useState<{ name: string; grade: number; section: string; house: string }[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<{ name: string; grade: number; section: string; house: string } | null>(null)
  const [selectedHouse, setSelectedHouse] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedSection, setSelectedSection] = useState('')

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from(VIEWS.STUDENT_POINTS)
      .select('*')
    if (error) {
      console.error('Supabase error:', error)
      setStudents([])
      return
    }
    const allStudents = (data || []).map((s) => ({
      name: s.student_name || s.name || '',
      grade: s.grade || 0,
      section: s.section || '',
      house: s.house || s.house_name || '',
    }))
    setStudents(allStudents.filter((s) => s.name))
  }

  useEffect(() => {
    fetchStudents()
  }, [])

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

  const fetchViewRows = async (view: string) => {
    const { data, error } = await supabase.from(view).select('*')
    if (error) {
      console.error('Supabase error:', error)
      return []
    }
    return data ?? []
  }

  const exportCSV = (rows: (string | number)[][], filename: string) => {
    const csvContent = rows.map((row) => row.map((cell) => `"${String(cell ?? '')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  const exportPDF = (
    title: string,
    summary: string,
    rows: (string | number)[][],
    headers: string[],
    options?: { variant?: 'default' | 'student'; summaryHtml?: string; chartsHtml?: string }
  ) => {
    const tableRows = rows.map((row) => `
      <tr>
        ${row.map((cell) => `<td>${String(cell ?? '')}</td>`).join('')}
      </tr>
    `).join('')

    const crestUrl = `${window.location.origin}/crest.png`
    const summaryHtml = options?.summaryHtml || summary.replace(/\n/g, '<br/>')
    const variant = options?.variant || 'default'
    const chartsHtml = options?.chartsHtml || ''
    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a2e; padding: 24px; background: #f7f4ee; }
            .report { background: #fffdf9; border: 1px solid #e7dfcf; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(20, 14, 4, 0.06); }
            .header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
            .crest { width: 64px; height: 64px; object-fit: contain; }
            .brand { font-size: 12px; letter-spacing: 0.12em; color: #7a6a43; }
            .title { font-size: 20px; margin: 4px 0 0; }
            .subtitle { font-size: 12px; color: #6b5b3a; margin: 6px 0 16px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
            .summary-card { border: 1px solid #eadfca; background: #fbf8f1; border-radius: 12px; padding: 10px 12px; }
            .summary-label { font-size: 10px; letter-spacing: 0.12em; color: #8a7a55; margin-bottom: 4px; }
            .summary-value { font-size: 16px; font-weight: 700; color: #2b1d0a; }
            .divider { height: 1px; background: #eadfca; margin: 14px 0; }
            .charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 16px 0; }
            .chart-card { border: 1px solid #eadfca; border-radius: 12px; padding: 12px; background: #fffaf0; }
            .chart-title { font-size: 11px; letter-spacing: 0.12em; color: #7a6a43; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #e7dfcf; padding: 7px 8px; text-align: left; }
            th { background: #f3ead6; color: #5b4a22; letter-spacing: 0.08em; font-size: 10px; }
            tr:nth-child(even) td { background: #fbf8f1; }
            .report-card .title { font-size: 22px; }
            .report-card .crest { width: 72px; height: 72px; }
          </style>
        </head>
        <body>
          <div class="report ${variant === 'student' ? 'report-card' : ''}">
            <div class="header">
              <img class="crest" src="${crestUrl}" alt="League of Stars Crest" />
              <div>
                <div class="brand">League of Stars • Brighter Horizon Academy</div>
                <div class="title">${title}</div>
              </div>
            </div>
            <div class="subtitle">${summaryHtml}</div>
            ${chartsHtml ? `<div class="charts">${chartsHtml}</div>` : ''}
            <div class="divider"></div>
            <table>
              <thead>
                <tr>
                  ${headers.map((header) => `<th>${header}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const hasCustomRange = Boolean(startDate || endDate)
  const customRangeLabel = `${startDate || '...'} to ${endDate || '...'}`
  const rangeBadgeLabel = hasCustomRange ? customRangeLabel : 'Default range'

  const reportConfigs: Record<string, {
    view: string
    title: string
    headers: string[]
    rowMapper: (row: Record<string, unknown>) => (string | number)[]
  }> = {
    'all-time-summary': {
      view: VIEWS.HOUSE_STANDINGS,
      title: 'All-Time Merit Summary',
      headers: ['House', 'Total Points'],
      rowMapper: (row) => [
        String(getRowValue(row, ['house', 'house_name']) ?? ''),
        Number(getRowValue(row, ['total_points', 'points']) ?? 0),
      ],
    },
    'house-snapshot': {
      view: VIEWS.HOUSE_STANDINGS,
      title: 'House Performance Snapshot',
      headers: ['House', 'Total Points', 'Rank'],
      rowMapper: (row) => [
        String(getRowValue(row, ['house', 'house_name']) ?? ''),
        Number(getRowValue(row, ['total_points', 'points']) ?? 0),
        Number(getRowValue(row, ['rank']) ?? 0),
      ],
    },
    'grade-section-leaderboard': {
      view: VIEWS.GRADE_SECTION_TOTALS,
      title: 'Grade & Section Leaderboard',
      headers: ['Grade', 'Section', 'Total Points'],
      rowMapper: (row) => [
        String(getRowValue(row, ['grade']) ?? ''),
        String(getRowValue(row, ['section']) ?? ''),
        Number(getRowValue(row, ['total_points', 'points']) ?? 0),
      ],
    },
    'category-report': {
      view: VIEWS.STUDENT_POINTS_BY_R,
      title: 'Merit Category Report',
      headers: ['Category', 'Subcategory', 'Points'],
      rowMapper: (row) => [
        String(getRowValue(row, ['category', 'r']) ?? ''),
        String(getRowValue(row, ['subcategory']) ?? ''),
        Number(getRowValue(row, ['total_points', 'points']) ?? 0),
      ],
    },
    'monthly-merit': {
      view: VIEWS.STUDENT_POINTS_BY_R,
      title: 'Monthly Merit Log',
      headers: ['Student Name', 'Grade', 'Section', 'House', 'Category', 'Subcategory', 'Points'],
      rowMapper: (row) => [
        String(getRowValue(row, ['student_name', 'student', 'name']) ?? ''),
        Number(getRowValue(row, ['grade']) ?? 0),
        String(getRowValue(row, ['section']) ?? ''),
        String(getRowValue(row, ['house', 'house_name']) ?? ''),
        String(getRowValue(row, ['category', 'r']) ?? ''),
        String(getRowValue(row, ['subcategory']) ?? ''),
        Number(getRowValue(row, ['total_points', 'points']) ?? 0),
      ],
    },
    'monthly-highlights': {
      view: VIEWS.TOP_STUDENTS_HOUSE,
      title: 'Monthly Highlights',
      headers: ['House', 'Student', 'Points', 'Rank'],
      rowMapper: (row) => [
        String(getRowValue(row, ['house', 'house_name']) ?? ''),
        String(getRowValue(row, ['student_name', 'student', 'name']) ?? ''),
        Number(getRowValue(row, ['total_points', 'points']) ?? 0),
        Number(getRowValue(row, ['rank', 'house_rank']) ?? 0),
      ],
    },
    'leadership-summary': {
      view: VIEWS.GRADE_SECTION_TOTALS,
      title: 'Leadership Summary',
      headers: ['Grade', 'Section', 'Total Points'],
      rowMapper: (row) => [
        String(getRowValue(row, ['grade']) ?? ''),
        String(getRowValue(row, ['section']) ?? ''),
        Number(getRowValue(row, ['total_points', 'points']) ?? 0),
      ],
    },
    'staff-recognition': {
      view: VIEWS.STAFF_3R,
      title: 'Staff Recognition Report',
      headers: ['Staff Member', 'Points', 'Rank', 'Month Start'],
      rowMapper: (row) => [
        String(getRowValue(row, ['staff_name', 'staff']) ?? ''),
        Number(getRowValue(row, ['total_points', 'points']) ?? 0),
        Number(getRowValue(row, ['rank']) ?? 0),
        String(getRowValue(row, ['month_start']) ?? ''),
      ],
    },
  }

  const generateReport = async (template: ReportTemplate, format: 'CSV' | 'PDF') => {
    setIsGenerating(`${template.id}-${format}`)
    try {
      const config = reportConfigs[template.id]
      if (!config) return
      const rows = await fetchViewRows(config.view)
      const formattedRows = rows.map((row) => config.rowMapper(row as Record<string, unknown>))
      const filename = `report_${template.id}_${new Date().toISOString().split('T')[0]}.csv`
      const summary = `${template.title} • ${rangeBadgeLabel}`

      if (format === 'CSV') {
        exportCSV([config.headers, ...formattedRows], filename)
      } else {
        exportPDF(config.title, summary, formattedRows, config.headers)
      }
    } finally {
      setIsGenerating(null)
    }
  }

  const generateStudentReport = async (format: 'CSV' | 'PDF') => {
    if (!selectedStudent) return
    setIsGenerating(`student-${format}`)
    try {
      const rows = await fetchViewRows(VIEWS.STUDENT_POINTS)
      const match = rows.find((row) => {
        const name = String(getRowValue(row as Record<string, unknown>, ['student_name', 'name']) ?? '').toLowerCase()
        const grade = Number(getRowValue(row as Record<string, unknown>, ['grade']) ?? 0)
        const section = String(getRowValue(row as Record<string, unknown>, ['section']) ?? '').toLowerCase()
        return (
          name === selectedStudent.name.toLowerCase() &&
          grade === selectedStudent.grade &&
          section === selectedStudent.section.toLowerCase()
        )
      }) as Record<string, unknown> | undefined

      const detailRow: (string | number)[] = [
        selectedStudent.name,
        selectedStudent.grade,
        selectedStudent.section,
        selectedStudent.house || '',
        Number(getRowValue(match || {}, ['total_points', 'points']) ?? 0),
      ]
      const headers = ['Student Name', 'Grade', 'Section', 'House', 'Total Points']

      if (format === 'CSV') {
        exportCSV(
          [headers, detailRow],
          `report_student_${selectedStudent.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        )
      } else {
        exportPDF(
          `Student Report: ${selectedStudent.name}`,
          `Grade ${selectedStudent.grade}${selectedStudent.section} • ${selectedStudent.house || 'House'} • ${rangeBadgeLabel}`,
          [detailRow],
          headers,
          { variant: 'student' }
        )
      }
    } finally {
      setIsGenerating(null)
    }
  }

  const filteredStudents = students
    .filter((s) => studentSearch && s.name.toLowerCase().includes(studentSearch.toLowerCase()))
    .slice(0, 8)

  const houseOptions = [
    'House of Abū Bakr',
    'House of Khadījah',
    'House of ʿUmar',
    'House of ʿĀʾishah',
  ]
  const gradeOptions = [...new Set(students.map((s) => s.grade))].sort((a, b) => a - b)
  const sectionOptions = selectedGrade
    ? [...new Set(students.filter((s) => s.grade === Number(selectedGrade)).map((s) => s.section))].sort()
    : []

  const generateHouseReport = async (format: 'CSV' | 'PDF') => {
    if (!selectedHouse) return
    setIsGenerating(`house-${format}`)
    try {
      const rows = await fetchViewRows(VIEWS.STUDENT_POINTS)
      const houseRows = rows.filter((row) =>
        String(getRowValue(row as Record<string, unknown>, ['house', 'house_name']) ?? '').trim() === selectedHouse
      )
      const formattedRows = houseRows.map((row) => ([
        String(getRowValue(row as Record<string, unknown>, ['student_name', 'name']) ?? ''),
        Number(getRowValue(row as Record<string, unknown>, ['grade']) ?? 0),
        String(getRowValue(row as Record<string, unknown>, ['section']) ?? ''),
        Number(getRowValue(row as Record<string, unknown>, ['total_points', 'points']) ?? 0),
      ]))
      const headers = ['Student Name', 'Grade', 'Section', 'Total Points']

      if (format === 'CSV') {
        exportCSV(
          [headers, ...formattedRows],
          `report_house_${selectedHouse.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        )
      } else {
        exportPDF(
          `House Report: ${selectedHouse}`,
          `${rangeBadgeLabel}`,
          formattedRows,
          headers
        )
      }
    } finally {
      setIsGenerating(null)
    }
  }

  const generateGradeReport = async (format: 'CSV' | 'PDF') => {
    if (!selectedGrade) return
    setIsGenerating(`grade-${format}`)
    try {
      const rows = await fetchViewRows(VIEWS.STUDENT_POINTS)
      const gradeRows = rows.filter((row) =>
        String(getRowValue(row as Record<string, unknown>, ['grade']) ?? '') === selectedGrade
      )
      const formattedRows = gradeRows.map((row) => ([
        String(getRowValue(row as Record<string, unknown>, ['student_name', 'name']) ?? ''),
        String(getRowValue(row as Record<string, unknown>, ['section']) ?? ''),
        String(getRowValue(row as Record<string, unknown>, ['house', 'house_name']) ?? ''),
        Number(getRowValue(row as Record<string, unknown>, ['total_points', 'points']) ?? 0),
      ]))
      const headers = ['Student Name', 'Section', 'House', 'Total Points']

      if (format === 'CSV') {
        exportCSV(
          [headers, ...formattedRows],
          `report_grade_${selectedGrade}_${new Date().toISOString().split('T')[0]}.csv`
        )
      } else {
        exportPDF(
          `Grade Report: Grade ${selectedGrade}`,
          `${rangeBadgeLabel}`,
          formattedRows,
          headers
        )
      }
    } finally {
      setIsGenerating(null)
    }
  }

  const generateSectionReport = async (format: 'CSV' | 'PDF') => {
    if (!selectedGrade || !selectedSection) return
    setIsGenerating(`section-${format}`)
    try {
      const rows = await fetchViewRows(VIEWS.STUDENT_POINTS)
      const sectionRows = rows.filter((row) => {
        const grade = String(getRowValue(row as Record<string, unknown>, ['grade']) ?? '')
        const section = String(getRowValue(row as Record<string, unknown>, ['section']) ?? '').toLowerCase()
        return grade === selectedGrade && section === selectedSection.toLowerCase()
      })
      const formattedRows = sectionRows.map((row) => ([
        String(getRowValue(row as Record<string, unknown>, ['student_name', 'name']) ?? ''),
        String(getRowValue(row as Record<string, unknown>, ['house', 'house_name']) ?? ''),
        Number(getRowValue(row as Record<string, unknown>, ['total_points', 'points']) ?? 0),
      ]))
      const headers = ['Student Name', 'House', 'Total Points']

      if (format === 'CSV') {
        exportCSV(
          [headers, ...formattedRows],
          `report_grade_${selectedGrade}_section_${selectedSection}_${new Date().toISOString().split('T')[0]}.csv`
        )
      } else {
        exportPDF(
          `Grade/Section Report: Grade ${selectedGrade}${selectedSection}`,
          `${rangeBadgeLabel}`,
          formattedRows,
          headers
        )
      }
    } finally {
      setIsGenerating(null)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Reports
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">
            Generate exports and printable summaries
          </p>
        </div>
      </div>

      <div className="regal-card rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-[#1a1a2e] tracking-wider">
              Report Date Range
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
              {rangeBadgeLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-[#1a1a2e]/40 tracking-wider">
              Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="regal-input px-3 py-2 rounded-xl text-sm"
            />
            <label className="text-xs font-semibold text-[#1a1a2e]/40 tracking-wider">
              End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="regal-input px-3 py-2 rounded-xl text-sm"
            />
          </div>
        </div>
      </div>

      <div className="regal-card rounded-2xl p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Student Report
            </h3>
            <p className="text-xs text-[#1a1a2e]/50 mt-1">
              Generate a detailed report for a single student.
            </p>
          </div>
          <div className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
            PDF / CSV
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-1.5 tracking-wider">
              Student
            </label>
            <div className="relative">
              <input
                type="text"
                value={studentSearch}
                onChange={(event) => {
                  setStudentSearch(event.target.value)
                  setSelectedStudent(null)
                }}
                placeholder="Search by student name..."
                className="regal-input w-full px-3 py-2.5 rounded-xl text-sm"
              />
              {studentSearch && (
                <div className="absolute z-10 mt-2 w-full rounded-xl border border-[#c9a227]/20 bg-white shadow-lg overflow-hidden">
                  {filteredStudents.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[#1a1a2e]/40">No matches found</div>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={`${student.name}-${student.grade}-${student.section}`}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-[#f5f3ef] text-sm"
                        onClick={() => {
                          setSelectedStudent(student)
                          setStudentSearch(`${student.name} (Grade ${student.grade}${student.section})`)
                        }}
                      >
                        <span className="font-semibold text-[#1a1a2e]">{student.name}</span>
                        <span className="text-xs text-[#1a1a2e]/40"> • Grade {student.grade}{student.section} • {student.house}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => generateStudentReport('PDF')}
              disabled={!selectedStudent || isGenerating === 'student-PDF'}
              className="btn-gold px-4 py-2 text-sm rounded-xl disabled:opacity-60"
            >
              {isGenerating === 'student-PDF' ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={() => generateStudentReport('CSV')}
              disabled={!selectedStudent || isGenerating === 'student-CSV'}
              className="px-4 py-2 text-sm rounded-xl border border-[#c9a227]/30 text-[#1a1a2e] bg-white hover:border-[#c9a227]/60 transition disabled:opacity-60"
            >
              {isGenerating === 'student-CSV' ? 'Generating...' : 'CSV'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="regal-card rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                House Report
              </h3>
              <p className="text-xs text-[#1a1a2e]/50 mt-1">Totals and entries for a single house.</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
              PDF / CSV
            </span>
          </div>
          <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-1.5 tracking-wider">
            House
          </label>
          <select
            value={selectedHouse}
            onChange={(event) => setSelectedHouse(event.target.value)}
            className="regal-input w-full px-3 py-2.5 rounded-xl text-sm mb-4"
          >
            <option value="">Select house</option>
            {houseOptions.map((house) => (
              <option key={house} value={house}>{house}</option>
            ))}
          </select>
          {selectedHouse && houseLogos[selectedHouse] && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#c9a227]/15 bg-[#fbf8f1] px-3 py-2">
              <img
                src={houseLogos[selectedHouse]}
                alt={`${selectedHouse} logo`}
                className="h-10 w-10 object-contain"
              />
              <span className="text-sm font-medium text-[#1a1a2e]">{selectedHouse}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => generateHouseReport('PDF')}
              disabled={!selectedHouse || isGenerating === 'house-PDF'}
              className="btn-gold px-4 py-2 text-sm rounded-xl disabled:opacity-60"
            >
              {isGenerating === 'house-PDF' ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={() => generateHouseReport('CSV')}
              disabled={!selectedHouse || isGenerating === 'house-CSV'}
              className="px-4 py-2 text-sm rounded-xl border border-[#c9a227]/30 text-[#1a1a2e] bg-white hover:border-[#c9a227]/60 transition disabled:opacity-60"
            >
              {isGenerating === 'house-CSV' ? 'Generating...' : 'CSV'}
            </button>
          </div>
        </div>

        <div className="regal-card rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                Grade Report
              </h3>
              <p className="text-xs text-[#1a1a2e]/50 mt-1">Totals and entries for a grade.</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
              PDF / CSV
            </span>
          </div>
          <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-1.5 tracking-wider">
            Grade
          </label>
          <select
            value={selectedGrade}
            onChange={(event) => {
              setSelectedGrade(event.target.value)
              setSelectedSection('')
            }}
            className="regal-input w-full px-3 py-2.5 rounded-xl text-sm mb-4"
          >
            <option value="">Select grade</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => generateGradeReport('PDF')}
              disabled={!selectedGrade || isGenerating === 'grade-PDF'}
              className="btn-gold px-4 py-2 text-sm rounded-xl disabled:opacity-60"
            >
              {isGenerating === 'grade-PDF' ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={() => generateGradeReport('CSV')}
              disabled={!selectedGrade || isGenerating === 'grade-CSV'}
              className="px-4 py-2 text-sm rounded-xl border border-[#c9a227]/30 text-[#1a1a2e] bg-white hover:border-[#c9a227]/60 transition disabled:opacity-60"
            >
              {isGenerating === 'grade-CSV' ? 'Generating...' : 'CSV'}
            </button>
          </div>
        </div>

        <div className="regal-card rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                Grade/Section Report
              </h3>
              <p className="text-xs text-[#1a1a2e]/50 mt-1">Totals and entries for one section.</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
              PDF / CSV
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-1.5 tracking-wider">
                Grade
              </label>
              <select
                value={selectedGrade}
                onChange={(event) => {
                  setSelectedGrade(event.target.value)
                  setSelectedSection('')
                }}
                className="regal-input w-full px-3 py-2.5 rounded-xl text-sm"
              >
                <option value="">Grade</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-1.5 tracking-wider">
                Section
              </label>
              <select
                value={selectedSection}
                onChange={(event) => setSelectedSection(event.target.value)}
                className="regal-input w-full px-3 py-2.5 rounded-xl text-sm"
              >
                <option value="">Section</option>
                {sectionOptions.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => generateSectionReport('PDF')}
              disabled={!selectedGrade || !selectedSection || isGenerating === 'section-PDF'}
              className="btn-gold px-4 py-2 text-sm rounded-xl disabled:opacity-60"
            >
              {isGenerating === 'section-PDF' ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={() => generateSectionReport('CSV')}
              disabled={!selectedGrade || !selectedSection || isGenerating === 'section-CSV'}
              className="px-4 py-2 text-sm rounded-xl border border-[#c9a227]/30 text-[#1a1a2e] bg-white hover:border-[#c9a227]/60 transition disabled:opacity-60"
            >
              {isGenerating === 'section-CSV' ? 'Generating...' : 'CSV'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {templates.map((template) => (
          <div key={template.id} className="regal-card rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  {template.title}
                </h3>
                <p className="text-xs text-[#1a1a2e]/50 mt-1">{template.description}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
                {template.scope}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-[#1a1a2e]/40">{template.format}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => generateReport(template, 'PDF')}
                  disabled={isGenerating === `${template.id}-PDF`}
                  className="btn-gold px-4 py-2 text-sm rounded-xl disabled:opacity-60"
                >
                  {isGenerating === `${template.id}-PDF` ? 'Generating...' : 'PDF'}
                </button>
                <button
                  onClick={() => generateReport(template, 'CSV')}
                  disabled={isGenerating === `${template.id}-CSV`}
                  className="px-4 py-2 text-sm rounded-xl border border-[#c9a227]/30 text-[#1a1a2e] bg-white hover:border-[#c9a227]/60 transition disabled:opacity-60"
                >
                  {isGenerating === `${template.id}-CSV` ? 'Generating...' : 'CSV'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="regal-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Saved Report Templates
        </h3>
        <p className="text-xs text-[#1a1a2e]/50 mt-1">
          Coming next: save custom filters, schedule exports, and track history.
        </p>
      </div>
    </div>
  )
}
