'use client'

import { useEffect, useState, useCallback } from 'react'
import CrestLoader from '@/components/CrestLoader'

type Status = 'green' | 'yellow' | 'red'

interface Metric {
  value: number
  status: Status
  eligible?: number
  active?: number
  total?: number
  compliant?: number
  unknown?: number
  missingHouse?: number
  missingGrade?: number
}

interface Outcome {
  name: string
  status: Status
}

interface MetricsResponse {
  metrics: {
    participationRate: Metric
    avgActiveDays: Metric
    huddlesCount: Metric
    coverageGap: Metric
    otherNotesCompliance: Metric
    rosterIssues: Metric
    decisionsLogged: Metric
    overdueActions: Metric
  }
  outcomes: {
    A: Outcome
    B: Outcome
    C: Outcome
    D: Outcome
  }
  recommendedActions: string[]
  dateRange: { startDate: string; endDate: string }
  cycleEndDates: string[]
}

interface RosterDetails {
  unknownStaff: { staff_name: string }[]
  missingHouse: { staff_name: string; email: string }[]
  missingGrade: { staff_name: string; email: string }[]
  totalIssues: number
}

interface OtherNotesDetails {
  entries: {
    id: string
    staff_name: string
    student_name: string
    r: string
    subcategory: string
    notes: string
    date_of_event: string
  }[]
  totalMissing: number
  totalOther: number
}

interface ActionMenuItem {
  id: number
  title: string
  category?: string
}

const PRESETS = [
  { id: 'this-cycle', label: 'This Cycle', days: 14 },
  { id: 'last-14', label: 'Last 14 Days', days: 14 },
  { id: 'last-30', label: 'Last 30 Days', days: 30 },
]

const statusColors: Record<Status, { bg: string; text: string; border: string; dot: string }> = {
  green: {
    bg: 'bg-[var(--house-khad)]/10',
    text: 'text-[var(--house-khad)]',
    border: 'border-[var(--house-khad)]',
    dot: 'var(--house-khad)',
  },
  yellow: {
    bg: 'bg-[var(--warning)]/10',
    text: 'text-[var(--warning)]',
    border: 'border-[var(--warning)]',
    dot: 'var(--warning)',
  },
  red: {
    bg: 'bg-[var(--danger)]/10',
    text: 'text-[var(--danger)]',
    border: 'border-[var(--danger)]',
    dot: 'var(--danger)',
  },
}

function StatusChip({ status, label }: { status: Status; label?: string }) {
  const colors = statusColors[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
      {label || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const percentage = Math.min((value / max) * 100, 100)
  return (
    <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  )
}

function DotStrip({ value, max = 4 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-all ${
            i < value ? 'bg-[var(--victory-gold)]' : 'bg-[var(--border)]'
          }`}
        />
      ))}
    </div>
  )
}

export default function ImplementationHealthPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState('this-cycle')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal states
  const [showRosterModal, setShowRosterModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showHuddleModal, setShowHuddleModal] = useState(false)
  const [showDecisionModal, setShowDecisionModal] = useState(false)
  const [rosterDetails, setRosterDetails] = useState<RosterDetails | null>(null)
  const [otherDetails, setOtherDetails] = useState<OtherNotesDetails | null>(null)
  const [actionMenu, setActionMenu] = useState<ActionMenuItem[]>([])

  // Form states
  const [huddleForm, setHuddleForm] = useState({ cycle_end_date: '', notes: '' })
  const [decisionForm, setDecisionForm] = useState({
    owner: '',
    due_date: '',
    action_type: '',
    cycle_end_date: '',
    title: '',
    outcome_tag: '',
    notes: '',
    selected_actions: [] as string[],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate date range based on preset
  useEffect(() => {
    const now = new Date()
    const presetConfig = PRESETS.find(p => p.id === preset)
    if (!presetConfig) return

    const end = new Date(now)
    const start = new Date(now)
    start.setDate(start.getDate() - presetConfig.days)

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }, [preset])

  const fetchMetrics = useCallback(async () => {
    if (!startDate || !endDate) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ startDate, endDate })
      const response = await fetch(`/api/implementation-health?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch metrics')
      }

      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const fetchRosterDetails = async () => {
    try {
      const params = new URLSearchParams({ detail: 'roster', startDate, endDate })
      const response = await fetch(`/api/implementation-health?${params}`)
      const data = await response.json()
      setRosterDetails(data)
      setShowRosterModal(true)
    } catch (err) {
      console.error('Failed to fetch roster details:', err)
    }
  }

  const fetchOtherDetails = async () => {
    try {
      const params = new URLSearchParams({ detail: 'other-missing-notes', startDate, endDate })
      const response = await fetch(`/api/implementation-health?${params}`)
      const data = await response.json()
      setOtherDetails(data)
      setShowNotesModal(true)
    } catch (err) {
      console.error('Failed to fetch other notes details:', err)
    }
  }

  const fetchActionMenu = async () => {
    try {
      const response = await fetch('/api/implementation-health?actionMenu=1')
      const data = await response.json()
      setActionMenu(data.items || [])
    } catch (err) {
      console.error('Failed to fetch action menu:', err)
    }
  }

  const handleHuddleSubmit = async () => {
    if (!huddleForm.cycle_end_date) return
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/implementation-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'huddle', ...huddleForm }),
      })

      if (response.ok) {
        setShowHuddleModal(false)
        setHuddleForm({ cycle_end_date: '', notes: '' })
        fetchMetrics()
      }
    } catch (err) {
      console.error('Failed to log huddle:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDecisionSubmit = async () => {
    if (!decisionForm.cycle_end_date || !decisionForm.title) return
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/implementation-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'decision', ...decisionForm }),
      })

      if (response.ok) {
        setShowDecisionModal(false)
        setDecisionForm({
          owner: '',
          due_date: '',
          action_type: '',
          cycle_end_date: '',
          title: '',
          outcome_tag: '',
          notes: '',
          selected_actions: [],
        })
        fetchMetrics()
      }
    } catch (err) {
      console.error('Failed to log decision:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const exportCSV = () => {
    if (!metrics) return

    const rows = [
      ['Metric', 'Value', 'Status', 'Start Date', 'End Date', 'Generated'],
      ['Participation Rate', `${metrics.metrics.participationRate.value}%`, metrics.metrics.participationRate.status, startDate, endDate, new Date().toISOString()],
      ['Avg Active Days', metrics.metrics.avgActiveDays.value.toString(), metrics.metrics.avgActiveDays.status, startDate, endDate, ''],
      ['Huddles (Last 4)', metrics.metrics.huddlesCount.value.toString(), metrics.metrics.huddlesCount.status, startDate, endDate, ''],
      ['Coverage Gap', `${metrics.metrics.coverageGap.value}%`, metrics.metrics.coverageGap.status, startDate, endDate, ''],
      ['Other Notes Compliance', `${metrics.metrics.otherNotesCompliance.value}%`, metrics.metrics.otherNotesCompliance.status, startDate, endDate, ''],
      ['Roster Issues', metrics.metrics.rosterIssues.value.toString(), metrics.metrics.rosterIssues.status, startDate, endDate, ''],
      ['Decisions Logged', metrics.metrics.decisionsLogged.value.toString(), metrics.metrics.decisionsLogged.status, startDate, endDate, ''],
      ['Overdue Actions', metrics.metrics.overdueActions.value.toString(), metrics.metrics.overdueActions.status, startDate, endDate, ''],
    ]

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `implementation_health_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (isLoading) {
    return <CrestLoader label="Loading implementation health..." />
  }

  if (error) {
    return (
      <div className="card rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-[var(--text)] mb-2">Error Loading Data</h3>
        <p className="text-[var(--text-muted)]">{error}</p>
        <button onClick={fetchMetrics} className="btn-primary mt-4">
          Retry
        </button>
      </div>
    )
  }

  if (!metrics) return null

  const { metrics: m, outcomes, recommendedActions } = metrics

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Implementation Health
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[var(--victory-gold-dark)] to-[var(--victory-gold)] rounded-full" />
          <p className="text-[var(--text-muted)] text-sm font-medium">System adoption and compliance monitoring</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--text-muted)] tracking-wider">PERIOD</span>
            <div className="flex gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    preset === p.id
                      ? 'bg-[var(--midnight-primary)] text-white'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button onClick={fetchMetrics} className="btn-primary">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Outcome Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Outcome A: Adoption */}
        <div className="card rounded-2xl overflow-hidden">
          <div className="bg-[var(--midnight-primary)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <h3 className="text-white font-semibold">Outcome A</h3>
                <p className="text-white/70 text-sm">Adoption</p>
              </div>
            </div>
            <StatusChip status={outcomes.A.status} />
          </div>
          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Participation Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--text)]">{m.participationRate.value}%</span>
                  <StatusChip status={m.participationRate.status} />
                </div>
              </div>
              <ProgressBar value={m.participationRate.value} color={statusColors[m.participationRate.status].dot} />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {m.participationRate.active} of {m.participationRate.eligible} staff active
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Avg Active Days</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--text)]">{m.avgActiveDays.value}</span>
                  <StatusChip status={m.avgActiveDays.status} />
                </div>
              </div>
              <DotStrip value={Math.round(m.avgActiveDays.value)} max={5} />
            </div>
          </div>
        </div>

        {/* Outcome B: Consistency */}
        <div className="card rounded-2xl overflow-hidden">
          <div className="bg-[var(--midnight-primary)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="text-white font-semibold">Outcome B</h3>
                <p className="text-white/70 text-sm">Consistency</p>
              </div>
            </div>
            <StatusChip status={outcomes.B.status} />
          </div>
          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Huddles (Last 4 Cycles)</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--text)]">{m.huddlesCount.value}</span>
                  <StatusChip status={m.huddlesCount.status} />
                </div>
              </div>
              <DotStrip value={m.huddlesCount.value} max={4} />
              <button
                onClick={() => {
                  fetchActionMenu()
                  setShowHuddleModal(true)
                }}
                className="text-xs text-[var(--victory-gold)] hover:underline mt-2"
              >
                + Log a Huddle
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Coverage Gap</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--text)]">{m.coverageGap.value}%</span>
                  <StatusChip status={m.coverageGap.status} />
                </div>
              </div>
              <ProgressBar value={100 - m.coverageGap.value} color={statusColors[m.coverageGap.status].dot} />
            </div>
          </div>
        </div>

        {/* Outcome C: Governance */}
        <div className="card rounded-2xl overflow-hidden">
          <div className="bg-[var(--midnight-primary)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="text-white font-semibold">Outcome C</h3>
                <p className="text-white/70 text-sm">Governance</p>
              </div>
            </div>
            <StatusChip status={outcomes.C.status} />
          </div>
          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Other Notes Compliance</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--text)]">{m.otherNotesCompliance.value}%</span>
                  <StatusChip status={m.otherNotesCompliance.status} />
                </div>
              </div>
              <ProgressBar value={m.otherNotesCompliance.value} color={statusColors[m.otherNotesCompliance.status].dot} />
              <button
                onClick={fetchOtherDetails}
                className="text-xs text-[var(--victory-gold)] hover:underline mt-2"
              >
                View Missing Notes →
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Roster Issues</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--text)]">{m.rosterIssues.value}</span>
                  <StatusChip status={m.rosterIssues.status} />
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {m.rosterIssues.unknown} unknown • {m.rosterIssues.missingHouse} missing house • {m.rosterIssues.missingGrade} missing grade
              </p>
              <button
                onClick={fetchRosterDetails}
                className="text-xs text-[var(--victory-gold)] hover:underline mt-2"
              >
                Go Fix →
              </button>
            </div>
          </div>
        </div>

        {/* Outcome D: Insight & Action */}
        <div className="card rounded-2xl overflow-hidden">
          <div className="bg-[var(--midnight-primary)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="text-white font-semibold">Outcome D</h3>
                <p className="text-white/70 text-sm">Insight & Action</p>
              </div>
            </div>
            <StatusChip status={outcomes.D.status} />
          </div>
          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Decisions Logged (Last 4)</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--text)]">{m.decisionsLogged.value}</span>
                  <StatusChip status={m.decisionsLogged.status} />
                </div>
              </div>
              <DotStrip value={m.decisionsLogged.value} max={4} />
              <button
                onClick={() => {
                  fetchActionMenu()
                  setShowDecisionModal(true)
                }}
                className="text-xs text-[var(--victory-gold)] hover:underline mt-2"
              >
                + Log a Decision
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Overdue Actions</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--text)]">{m.overdueActions.value}</span>
                  <StatusChip status={m.overdueActions.status} />
                </div>
              </div>
              {m.overdueActions.value > 0 && (
                <p className="text-xs text-[var(--danger)]">
                  {m.overdueActions.value} action(s) past due date
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Actions */}
      {recommendedActions.length > 0 && (
        <div className="card rounded-2xl p-6 mb-6 border-l-4 border-[var(--warning)]">
          <h3 className="font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <span>⚠️</span> Recommended Actions
          </h3>
          <ul className="space-y-2">
            {recommendedActions.map((action, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Roster Issues Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-[var(--midnight-primary)] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-semibold">Roster Issues</h3>
              <button onClick={() => setShowRosterModal(false)} className="text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {rosterDetails ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-[var(--text)] mb-2">Unknown Staff ({rosterDetails.unknownStaff.length})</h4>
                    {rosterDetails.unknownStaff.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">No unknown staff found</p>
                    ) : (
                      <ul className="space-y-1">
                        {rosterDetails.unknownStaff.map((s, i) => (
                          <li key={i} className="text-sm text-[var(--text-muted)] py-1 border-b border-[var(--border)]">
                            {s.staff_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text)] mb-2">Missing House ({rosterDetails.missingHouse.length})</h4>
                    {rosterDetails.missingHouse.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">All staff have house assigned</p>
                    ) : (
                      <ul className="space-y-1">
                        {rosterDetails.missingHouse.map((s, i) => (
                          <li key={i} className="text-sm text-[var(--text-muted)] py-1 border-b border-[var(--border)]">
                            {s.staff_name} ({s.email})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text)] mb-2">Missing Grade ({rosterDetails.missingGrade.length})</h4>
                    {rosterDetails.missingGrade.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">All staff have grade/subject assigned</p>
                    ) : (
                      <ul className="space-y-1">
                        {rosterDetails.missingGrade.map((s, i) => (
                          <li key={i} className="text-sm text-[var(--text-muted)] py-1 border-b border-[var(--border)]">
                            {s.staff_name} ({s.email})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <CrestLoader label="Loading..." />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Missing Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-[var(--midnight-primary)] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-semibold">Missing Other Notes</h3>
              <button onClick={() => setShowNotesModal(false)} className="text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {otherDetails ? (
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    {otherDetails.totalMissing} of {otherDetails.totalOther} &quot;Other&quot; entries have insufficient notes (&lt;10 chars)
                  </p>
                  {otherDetails.entries.length === 0 ? (
                    <p className="text-sm text-[var(--house-khad)]">All entries have sufficient notes!</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-[var(--border)]">
                          <th className="pb-2 text-[var(--text-muted)]">Staff</th>
                          <th className="pb-2 text-[var(--text-muted)]">Student</th>
                          <th className="pb-2 text-[var(--text-muted)]">Category</th>
                          <th className="pb-2 text-[var(--text-muted)]">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherDetails.entries.map((entry, i) => (
                          <tr key={i} className="border-b border-[var(--border)]">
                            <td className="py-2 text-[var(--text)]">{entry.staff_name}</td>
                            <td className="py-2 text-[var(--text)]">{entry.student_name}</td>
                            <td className="py-2 text-[var(--text-muted)]">{entry.r}/{entry.subcategory}</td>
                            <td className="py-2 text-[var(--text-muted)]">{entry.date_of_event}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <CrestLoader label="Loading..." />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Huddle Modal */}
      {showHuddleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl max-w-md w-full">
            <div className="bg-[var(--midnight-primary)] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-semibold">Log Huddle</h3>
              <button onClick={() => setShowHuddleModal(false)} className="text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Cycle End Date *</label>
                <input
                  type="date"
                  value={huddleForm.cycle_end_date}
                  onChange={(e) => setHuddleForm({ ...huddleForm, cycle_end_date: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Notes</label>
                <textarea
                  value={huddleForm.notes}
                  onChange={(e) => setHuddleForm({ ...huddleForm, notes: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder="Huddle summary..."
                />
              </div>
              <button
                onClick={handleHuddleSubmit}
                disabled={!huddleForm.cycle_end_date || isSubmitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isSubmitting ? 'Logging...' : 'Log Huddle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="bg-[var(--midnight-primary)] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-semibold">Log Decision</h3>
              <button onClick={() => setShowDecisionModal(false)} className="text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Cycle End Date *</label>
                  <input
                    type="date"
                    value={decisionForm.cycle_end_date}
                    onChange={(e) => setDecisionForm({ ...decisionForm, cycle_end_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={decisionForm.due_date}
                    onChange={(e) => setDecisionForm({ ...decisionForm, due_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Title *</label>
                <input
                  type="text"
                  value={decisionForm.title}
                  onChange={(e) => setDecisionForm({ ...decisionForm, title: e.target.value })}
                  className="input w-full"
                  placeholder="Decision title..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Owner</label>
                  <input
                    type="text"
                    value={decisionForm.owner}
                    onChange={(e) => setDecisionForm({ ...decisionForm, owner: e.target.value })}
                    className="input w-full"
                    placeholder="Who is responsible?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Outcome Tag</label>
                  <select
                    value={decisionForm.outcome_tag}
                    onChange={(e) => setDecisionForm({ ...decisionForm, outcome_tag: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Select...</option>
                    <option value="Adoption">Adoption</option>
                    <option value="Consistency">Consistency</option>
                    <option value="Governance">Governance</option>
                    <option value="Insight">Insight & Action</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Action Type</label>
                <select
                  value={decisionForm.action_type}
                  onChange={(e) => setDecisionForm({ ...decisionForm, action_type: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Select...</option>
                  <option value="Reset">Reset</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Training">Training</option>
                  <option value="Review">Review</option>
                </select>
              </div>
              {actionMenu.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Quick Actions</label>
                  <div className="flex flex-wrap gap-2">
                    {actionMenu.map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          const actions = decisionForm.selected_actions.includes(item.title)
                            ? decisionForm.selected_actions.filter(a => a !== item.title)
                            : [...decisionForm.selected_actions, item.title]
                          setDecisionForm({ ...decisionForm, selected_actions: actions })
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          decisionForm.selected_actions.includes(item.title)
                            ? 'bg-[var(--victory-gold)] text-[var(--midnight-primary)]'
                            : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--border)]'
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Notes</label>
                <textarea
                  value={decisionForm.notes}
                  onChange={(e) => setDecisionForm({ ...decisionForm, notes: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder="Additional details..."
                />
              </div>
              <button
                onClick={handleDecisionSubmit}
                disabled={!decisionForm.cycle_end_date || !decisionForm.title || isSubmitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isSubmitting ? 'Logging...' : 'Log Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
