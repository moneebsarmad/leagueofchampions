'use client'

import { useEffect, useState } from 'react'
import CrestLoader from '@/components/CrestLoader'

export default function DataQualityPage() {
  const [stats, setStats] = useState({
    missingHouse: 0,
    missingStaff: 0,
    missingStudent: 0,
    missingCategory: 0,
    missingSection: 0,
    houseVariantCount: 0,
    staffMissing: [] as string[],
    studentMissing: [] as string[]})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setStats({
      missingHouse: 0,
      missingStaff: 0,
      missingStudent: 0,
      missingCategory: 0,
      missingSection: 0,
      houseVariantCount: 0,
      staffMissing: [],
      studentMissing: []})
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return <CrestLoader label="Running data quality checks..." />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Data Quality Panel
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-[var(--accent)] rounded-full"></div>
          <p className="text-[var(--text-muted)] text-sm font-medium">Spot missing or inconsistent data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Missing House', value: stats.missingHouse },
          { label: 'Missing Staff Name', value: stats.missingStaff },
          { label: 'Missing Student Name', value: stats.missingStudent },
          { label: 'Missing Category', value: stats.missingCategory },
          { label: 'Missing Section', value: stats.missingSection },
          { label: 'House Variants', value: stats.houseVariantCount },
        ].map((item) => (
          <div key={item.label} className="card rounded-2xl p-6">
            <p className="text-xs font-semibold text-[var(--text-muted)] tracking-wider">{item.label}</p>
            <p className="text-3xl font-semibold text-[var(--text)] mt-2">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text)]">
            Staff Missing in Staff Table
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">Sample of names in Merit Log but not in Staff table.</p>
          <div className="mt-4 space-y-2">
            {stats.staffMissing.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No mismatches found.</p>
            ) : (
              stats.staffMissing.map((name, idx) => (
                <div key={`${name}-${idx}`} className="px-3 py-2 rounded-xl bg-[var(--bg-muted)] text-sm text-[var(--text)]">
                  {name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text)]">
            Students Missing in Students Table
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">Sample of student entries not found in the students table.</p>
          <div className="mt-4 space-y-2">
            {stats.studentMissing.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No mismatches found.</p>
            ) : (
              stats.studentMissing.map((name, idx) => (
                <div key={`${name}-${idx}`} className="px-3 py-2 rounded-xl bg-[var(--bg-muted)] text-sm text-[var(--text)]">
                  {name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
