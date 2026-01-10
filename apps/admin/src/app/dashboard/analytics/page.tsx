'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { VIEWS } from '@/lib/views'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import type { BarProps } from 'recharts'
import CrestLoader from '@/components/CrestLoader'
import { useSearchParams } from 'next/navigation'

interface MeritEntry {
  studentName: string
  grade: number
  section: string
  house: string
  points: number
  staffName: string
  category: string
  subcategory: string
  timestamp: string
}

interface Filters {
  house: string
  grade: string
  section: string
  staff: string
  category: string
  subcategory: string
  startDate: string
  endDate: string
}

const houseColors: Record<string, string> = {
  'House of Abū Bakr': 'var(--house-abu)',
  'House of Khadījah': 'var(--house-khad)',
  'House of ʿUmar': 'var(--house-umar)',
  'House of ʿĀʾishah': 'var(--house-aish)'}

const categoryColors = [
  'var(--house-abu)',
  'var(--house-khad)',
  'var(--house-umar)',
  'var(--house-aish)',
  'var(--accent)',
  'var(--accent-2)',
  'var(--success)',
  'var(--warning)',
]

export default function AnalyticsPage() {
  const [allEntries, setAllEntries] = useState<MeritEntry[]>([])
  const [houseStandings, setHouseStandings] = useState<{ name: string; points: number }[]>([])
  const [categoryTotals, setCategoryTotals] = useState<{ name: string; points: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()
  const paramsApplied = useRef(false)
  const [filters, setFilters] = useState<Filters>({
    house: '',
    grade: '',
    section: '',
    staff: '',
    category: '',
    subcategory: '',
    startDate: '',
    endDate: ''})
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters)

  const getThreeRCategory = (value: string) => {
    const raw = (value || '').toLowerCase()
    if (raw.includes('respect')) return 'Respect'
    if (raw.includes('responsibility')) return 'Responsibility'
    if (raw.includes('righteousness')) return 'Righteousness'
    return ''
  }

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

  // Extract unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const houses = [...new Set(allEntries.map(e => e.house).filter(Boolean))]
    const grades = [...new Set(allEntries.map(e => e.grade).filter(Boolean))].sort((a, b) => a - b)
    const sections = [...new Set(allEntries.map(e => e.section).filter(Boolean))].sort()
    const staff = [...new Set(allEntries.map(e => e.staffName).filter(Boolean))].sort()
    const categories = [...new Set(allEntries.map(e => e.category).filter(Boolean))].sort()
    const subcategories = [...new Set(allEntries.map(e => e.subcategory).filter(Boolean))].sort()
    return { houses, grades, sections, staff, categories, subcategories }
  }, [allEntries])

  // Apply filters to entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      if (appliedFilters.house && entry.house !== appliedFilters.house) return false
      if (appliedFilters.grade && entry.grade !== parseInt(appliedFilters.grade)) return false
      if (appliedFilters.section && entry.section !== appliedFilters.section) return false
      if (appliedFilters.staff && entry.staffName !== appliedFilters.staff) return false
      if (appliedFilters.category && entry.category !== appliedFilters.category) return false
      if (appliedFilters.subcategory && entry.subcategory !== appliedFilters.subcategory) return false
      if (appliedFilters.startDate) {
        const entryDate = new Date(entry.timestamp)
        const startDate = new Date(appliedFilters.startDate)
        if (entryDate < startDate) return false
      }
      if (appliedFilters.endDate) {
        const entryDate = new Date(entry.timestamp)
        const endDate = new Date(appliedFilters.endDate)
        endDate.setHours(23, 59, 59, 999)
        if (entryDate > endDate) return false
      }
      return true
    })
  }, [allEntries, appliedFilters])

  // Compute stats from filtered entries
  const computedStats = useMemo(() => {
    const totalPoints = filteredEntries.reduce((sum, e) => sum + (e.points || 0), 0)
    const totalRecords = filteredEntries.length

    // Unique students by name+grade+section
    const uniqueStudentKeys = new Set(
      filteredEntries.map(e => `${e.studentName.toLowerCase()}|${e.grade}|${e.section.toLowerCase()}`)
    )
    const uniqueStudents = uniqueStudentKeys.size

    // Unique staff
    const uniqueStaffNames = new Set(
      filteredEntries.map(e => e.staffName).filter(Boolean)
    )
    const activeStaff = uniqueStaffNames.size

    // Averages
    const avgPerStudent = uniqueStudents > 0
      ? (totalPoints / uniqueStudents).toFixed(1)
      : '0'
    const avgPerAward = totalRecords > 0
      ? (totalPoints / totalRecords).toFixed(1)
      : '0'

    return {
      totalPoints,
      totalRecords,
      uniqueStudents,
      activeStaff,
      avgPerStudent,
      avgPerAward}
  }, [filteredEntries])

  // Points by House chart data
  const houseChartData = useMemo(() => {
    return houseStandings.map((entry) => ({
      name: entry.name,
      points: entry.points,
      color: houseColors[entry.name] || 'var(--text-muted)'}))
  }, [houseStandings])

  // Points by Category chart data
  const categoryChartData = useMemo(() => {
    return categoryTotals.map((entry, index) => ({
      name: entry.name,
      points: entry.points,
      color: categoryColors[index % categoryColors.length]}))
  }, [categoryTotals])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [entriesRes, standingsRes] = await Promise.all([
        supabase.from(VIEWS.STUDENT_POINTS_BY_R).select('*'),
        supabase.from(VIEWS.HOUSE_STANDINGS).select('*'),
      ])

      if (entriesRes.error) {
        console.error('Supabase error:', entriesRes.error)
        setAllEntries([])
        setCategoryTotals([])
      } else {
        const entries: MeritEntry[] = (entriesRes.data || []).map((row) => ({
          studentName: String(getRowValue(row, ['student_name', 'student', 'name']) ?? ''),
          grade: Number(getRowValue(row, ['grade']) ?? 0),
          section: String(getRowValue(row, ['section']) ?? ''),
          house: String(getRowValue(row, ['house', 'house_name']) ?? ''),
          points: Number(getRowValue(row, ['points', 'total_points']) ?? 0),
          staffName: String(getRowValue(row, ['staff_name', 'staff']) ?? ''),
          category: String(
            getRowValue(row, ['category', 'r']) ?? getThreeRCategory(String(getRowValue(row, ['r']) ?? ''))
          ),
          subcategory: String(getRowValue(row, ['subcategory']) ?? ''),
          timestamp: String(getRowValue(row, ['timestamp', 'awarded_at', 'date']) ?? '')}))
        setAllEntries(entries)

        const categoryRows = (entriesRes.data || []).map((row) => ({
          name: String(getRowValue(row, ['category', 'r']) ?? '').trim(),
          points: Number(getRowValue(row, ['points', 'total_points']) ?? 0)}))
        setCategoryTotals(categoryRows.filter((row) => row.name))
      }

      if (standingsRes.error) {
        console.error('Supabase error:', standingsRes.error)
        setHouseStandings([])
      } else {
        const standings = (standingsRes.data || []).map((row) => ({
          name: String(getRowValue(row, ['house', 'house_name']) ?? ''),
          points: Number(getRowValue(row, ['total_points', 'points']) ?? 0)}))
        setHouseStandings(standings.filter((row) => row.name))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (paramsApplied.current) return
    const house = searchParams.get('house') || ''
    const staff = searchParams.get('staff') || ''
    const grade = searchParams.get('grade') || ''
    const section = searchParams.get('section') || ''
    const nextFilters: Filters = {
      ...filters,
      house,
      staff,
      grade,
      section}
    if (house || staff || grade || section) {
      setFilters(nextFilters)
      setAppliedFilters(nextFilters)
    }
    paramsApplied.current = true
  }, [filters, searchParams])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    setAppliedFilters(filters)
  }

  const clearFilters = () => {
    const emptyFilters: Filters = {
      house: '',
      grade: '',
      section: '',
      staff: '',
      category: '',
      subcategory: '',
      startDate: '',
      endDate: ''}
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }

  const exportCSV = () => {
    const headers = ['Student Name', 'Grade', 'Section', 'House', 'Points', 'Staff Name', 'Category', 'Subcategory', 'Date']
    const rows = filteredEntries.map(e => [
      e.studentName,
      e.grade,
      e.section,
      e.house,
      e.points,
      e.staffName,
      e.category,
      e.subcategory,
      new Date(e.timestamp).toLocaleDateString()
    ])

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `merit_analytics_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const exportPDF = () => {
    const title = `Merit Analytics Report (${new Date().toLocaleDateString()})`
    const rows = filteredEntries.map((e) => ([
      e.studentName,
      e.grade,
      e.section,
      e.house,
      e.points,
      e.staffName,
      e.category,
      e.subcategory,
      new Date(e.timestamp).toLocaleDateString(),
    ]))

    const tableRows = rows.map((row) => `
      <tr>
        ${row.map((cell) => `<td>${String(cell ?? '')}</td>`).join('')}
      </tr>
    `).join('')

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; color: #14161a; padding: 24px; background: #fbfaf7; }
            h1 { font-size: 20px; margin: 0 0 12px; }
            p { font-size: 12px; margin: 0 0 16px; color: #5a616b; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #e6e1d7; padding: 6px 8px; text-align: left; }
            th { background: #fbfaf7; color: #5a616b; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Records: ${filteredEntries.length} • Total Points: ${computedStats.totalPoints.toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Grade</th>
                <th>Section</th>
                <th>House</th>
                <th>Points</th>
                <th>Staff Name</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
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

  if (isLoading) {
    return <CrestLoader label="Loading analytics..." />
  }

  const ShieldBar = (props: BarProps) => {
    const x = typeof props.x === 'number' ? props.x : 0
    const y = typeof props.y === 'number' ? props.y : 0
    const width = typeof props.width === 'number' ? props.width : 0
    const height = typeof props.height === 'number' ? props.height : 0
    const fill = typeof props.fill === 'string' ? props.fill : 'var(--accent)'
    const radius = Math.min(10, width / 2)
    const taper = Math.max(6, Math.min(width * 0.22, 14))
    const bottomY = y + height
    const path = `
      M ${x} ${y + radius}
      Q ${x} ${y} ${x + radius} ${y}
      L ${x + width - radius} ${y}
      Q ${x + width} ${y} ${x + width} ${y + radius}
      L ${x + width} ${bottomY - radius}
      Q ${x + width} ${bottomY} ${x + width - radius} ${bottomY}
      L ${x + width - taper} ${bottomY}
      L ${x + width / 2} ${bottomY - Math.min(10, height * 0.15)}
      L ${x + taper} ${bottomY}
      L ${x + radius} ${bottomY}
      Q ${x} ${bottomY} ${x} ${bottomY - radius}
      Z
    `
    return (
      <g>
        <path d={path} fill={fill} />
        <path d={path} fill="rgba(255,255,255,0.12)" transform={`translate(0,${Math.min(8, height * 0.08)})`} />
      </g>
    )
  }

  const renderTopLabel = (props: any) => {
    const x = typeof props?.x === 'number' ? props.x : 0
    const y = typeof props?.y === 'number' ? props.y : 0
    const width = typeof props?.width === 'number' ? props.width : 0
    const value = typeof props?.value === 'number' ? props.value : 0
    return (
      <text x={x + width / 2} y={y - 8} textAnchor="middle" fill="var(--text-muted)" fontSize={11} fontWeight={600}>
        {value.toLocaleString()}
      </text>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Advanced Analytics
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-[var(--accent)] rounded-full"></div>
          <p className="text-[var(--text-muted)] text-sm font-medium">Comprehensive data insights and patterns</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-sm font-semibold text-[var(--text)] tracking-wider">Filter Data</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-5">
          {/* House Filter */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 tracking-wider">House</label>
            <select
              value={filters.house}
              onChange={(e) => handleFilterChange('house', e.target.value)}
              className="input w-full px-3 py-2.5 rounded-xl text-sm"
            >
              <option value="">All Houses</option>
              {filterOptions.houses.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 tracking-wider">Grade</label>
            <select
              value={filters.grade}
              onChange={(e) => handleFilterChange('grade', e.target.value)}
              className="input w-full px-3 py-2.5 rounded-xl text-sm"
            >
              <option value="">All Grades</option>
              {filterOptions.grades.map(g => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 tracking-wider">Section</label>
            <select
              value={filters.section}
              onChange={(e) => handleFilterChange('section', e.target.value)}
              className="input w-full px-3 py-2.5 rounded-xl text-sm"
            >
              <option value="">All Sections</option>
              {filterOptions.sections.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Staff Filter */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 tracking-wider">Staff</label>
            <select
              value={filters.staff}
              onChange={(e) => handleFilterChange('staff', e.target.value)}
              className="input w-full px-3 py-2.5 rounded-xl text-sm"
            >
              <option value="">All Staff</option>
              {filterOptions.staff.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 tracking-wider">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input w-full px-3 py-2.5 rounded-xl text-sm"
            >
              <option value="">All Categories</option>
              {filterOptions.categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 tracking-wider">Subcategory</label>
            <select
              value={filters.subcategory}
              onChange={(e) => handleFilterChange('subcategory', e.target.value)}
              className="input w-full px-3 py-2.5 rounded-xl text-sm"
            >
              <option value="">All Subcategories</option>
              {filterOptions.subcategories.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 tracking-wider">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="input w-full px-3 py-2.5 rounded-xl text-sm"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 tracking-wider">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="input w-full px-3 py-2.5 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
          <button
            onClick={clearFilters}
            className="px-5 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] font-medium rounded-xl hover:bg-[var(--bg-muted)] transition"
          >
            Clear All
          </button>
          <button
            onClick={applyFilters}
            className="btn-primary px-5 py-2.5 text-sm text-white font-medium rounded-xl"
          >
            Apply Filters
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="btn-primary px-5 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={exportPDF}
              className="px-5 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2 border border-[var(--border)] text-[var(--text)] bg-white hover:border-[var(--border)] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 11h10M7 15h6M5 3h8l4 4v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total Points', value: computedStats.totalPoints.toLocaleString(), icon: '⭐' },
          { label: 'Total Records', value: computedStats.totalRecords.toLocaleString(), icon: '📊' },
          { label: 'Unique Students', value: computedStats.uniqueStudents.toLocaleString(), icon: '👥' },
          { label: 'Active Staff', value: computedStats.activeStaff.toLocaleString(), icon: '👨‍🏫' },
          { label: 'Avg/Student', value: computedStats.avgPerStudent, icon: '📈' },
          { label: 'Avg/Award', value: computedStats.avgPerAward, icon: '🏆' },
        ].map((stat) => (
          <div key={stat.label} className="card rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[var(--text-muted)] tracking-wider">{stat.label}</p>
              <span className="text-lg">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text)]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <div className="card rounded-2xl p-12 text-center mb-8">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
            No data matches your filters
          </h3>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            Try adjusting your filter criteria or clearing some filters to see more results.
          </p>
          <button
            onClick={() => {
              setFilters({ house: '', grade: '', section: '', staff: '', category: '', subcategory: '', startDate: '', endDate: '' })
              setAppliedFilters({ house: '', grade: '', section: '', staff: '', category: '', subcategory: '', startDate: '', endDate: '' })
            }}
            className="mt-6 px-6 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-2)] transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Charts */}
      {filteredEntries.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Points by House */}
        <div className="card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-1">
            Points by House
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-6">Distribution across all houses</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={houseChartData} margin={{ left: 10, right: 10, top: 30, bottom: 30 }} barCategoryGap={18}>
                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tickFormatter={(value: string) => value.replace('House of ', '')}
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tickFormatter={(v) => v.toLocaleString()} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [
                    typeof value === 'number' ? value.toLocaleString() : `${value ?? 0}`,
                    'Points',
                  ]}
                />
                <Bar dataKey="points" shape={ShieldBar}>
                  {houseChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="points" content={renderTopLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Points by Category */}
        <div className="card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-1">
            Points by Category
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-6">Breakdown by merit categories</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ left: 10, right: 10, top: 30, bottom: 30 }} barCategoryGap={18}>
                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tickFormatter={(v) => v.toLocaleString()} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [
                    typeof value === 'number' ? value.toLocaleString() : `${value ?? 0}`,
                    'Points',
                  ]}
                />
                <Bar dataKey="points" shape={ShieldBar}>
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="points" content={renderTopLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
