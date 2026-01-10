'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { VIEWS } from '@/lib/views'
import CrestLoader from '@/components/CrestLoader'

interface HouseData {
  name: string
  points: number
  color: string
  logo: string
  percentage: number
  topStudents: { name: string; points: number }[]
}

const houseConfig: Record<string, { color: string; logo: string }> = {
  'House of Abu Bakr': {
    color: 'var(--house-abu)',
    logo: '/houses/abu-bakr.png'},
  'House of Khadijah': {
    color: 'var(--house-khad)',
    logo: '/houses/khadijah.png'},
  'House of Umar': {
    color: 'var(--house-umar)',
    logo: '/houses/umar.png'},
  'House of Aishah': {
    color: 'var(--house-aish)',
    logo: '/houses/aishah.png'}}

export default function DashboardPage() {
  const [houses, setHouses] = useState<HouseData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const getRowValue = (row: Record<string, unknown>, keys: string[]) => {
        for (const key of keys) {
          if (key in row) {
            return row[key]
          }
        }
        const normalizedKeys = Object.keys(row).reduce<Record<string, string>>((acc, key) => {
          acc[key.toLowerCase()] = key
          return acc
        }, {})
        for (const key of keys) {
          const normalized = normalizedKeys[key.toLowerCase()]
          if (normalized) {
            return row[normalized]
          }
        }
        return undefined
      }

      const normalizeHouse = (value: string) =>
        value
          .normalize('NFKD')
          .replace(/\p{Diacritic}/gu, '')
          .replace(/[''`ʿʾ]/g, "'")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ')
      const houseKeys = Object.keys(houseConfig)
      const houseKeyMap = new Map(
        houseKeys.map((key) => [normalizeHouse(key), key])
      )
      const canonicalHouse = (value: string) => {
        const normalized = normalizeHouse(value)
        const direct = houseKeyMap.get(normalized)
        if (direct) return direct
        if (normalized.includes('bakr')) return 'House of Abu Bakr'
        if (normalized.includes('khadijah')) return 'House of Khadijah'
        if (normalized.includes('umar')) return 'House of Umar'
        if (normalized.includes('aishah')) return 'House of Aishah'
        return ''
      }

      const { data: standingsData, error: standingsError } = await supabase
        .from(VIEWS.HOUSE_STANDINGS)
        .select('*')
      if (standingsError) {
        console.error('Supabase error:', standingsError)
        setHouses([])
        return
      }

      const { data: topStudentsData, error: topStudentsError } = await supabase
        .from(VIEWS.TOP_STUDENTS_HOUSE)
        .select('*')
      if (topStudentsError) {
        console.error('Supabase error:', topStudentsError)
      }

      const standingsMap = new Map<string, { points: number; percentage: number }>()
      ;(standingsData || []).forEach((row: Record<string, unknown>) => {
        const houseRaw = getRowValue(row, ['house', 'house_name'])
        const pointsRaw = getRowValue(row, ['total_points', 'points'])
        const percentRaw = getRowValue(row, ['percentage', 'percent', 'pct'])
        const house = houseRaw ? canonicalHouse(String(houseRaw)) : ''
        if (!house) return
        standingsMap.set(house, {
          points: Number(pointsRaw) || 0,
          percentage: Number(percentRaw) || 0})
      })

      const houseStudents: Record<string, { name: string; points: number }[]> = {}
      ;(topStudentsData || []).forEach((row: Record<string, unknown>) => {
        const houseRaw = getRowValue(row, ['house', 'house_name'])
        const studentRaw = getRowValue(row, ['student_name', 'student', 'name'])
        const pointsRaw = getRowValue(row, ['total_points', 'points'])
        const house = houseRaw ? canonicalHouse(String(houseRaw)) : ''
        if (!house) return
        const studentName = String(studentRaw ?? '').trim() || 'Unnamed Student'
        const points = Number(pointsRaw) || 0
        if (!houseStudents[house]) {
          houseStudents[house] = []
        }
        houseStudents[house].push({
          name: studentName,
          points})
      })

      const houseData: HouseData[] = Object.keys(houseConfig).map((name) => {
        const standings = standingsMap.get(name)
        return {
          name,
          points: standings?.points ?? 0,
          color: houseConfig[name].color,
          logo: houseConfig[name].logo,
          percentage: standings?.percentage ?? 0,
          topStudents: (houseStudents[name] || []).slice(0, 5)}
      })

      setHouses(houseData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true})
  }

  if (isLoading) {
    return <CrestLoader label="Loading dashboard..." />
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
              House Standings
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-1 w-16 bg-[var(--accent)] rounded-full"></div>
              <p className="text-[var(--text-muted)] text-sm font-medium">Current academic year rankings</p>
            </div>
          </div>
          {lastUpdated && (
            <div className="text-right">
              <p className="text-xs text-[var(--text-muted)] font-medium">Last updated</p>
              <p className="text-sm text-[var(--text)] font-semibold">{formatLastUpdated(lastUpdated)}</p>
            </div>
          )}
        </div>
      </div>

      {/* House Cards */}
      <div className="space-y-6">
        {houses.map((house, index) => (
          <div
            key={house.name}
            className="card overflow-hidden relative"
            style={{ borderLeft: `4px solid ${house.color}` }}
          >
            <div className="p-6">
              {/* House Header */}
              <div className="flex items-start justify-between gap-6 mb-5">
                <div>
                  <div className="chip mb-4">
                    <span>Rank</span>
                    <span className="text-[var(--text)] font-semibold">{index + 1}</span>
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-14 h-14 rounded-xl bg-[var(--surface-2)] p-1.5 border border-[var(--border)]">
                      <img
                        src={house.logo}
                        alt={house.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text)]">
                      {house.name}
                    </h2>
                  </div>
                  {/* Progress bar */}
                  <div className="w-64 h-2.5 bg-[var(--surface-2)] rounded-full overflow-hidden mb-2 border border-[var(--border)]">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${house.percentage}%`,
                        background: house.color}}
                    />
                  </div>
                  <p className="text-[var(--text-muted)] text-base font-medium">{house.percentage.toFixed(1)}% of total points</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2 min-w-[150px] pt-4">
                  <p className="text-4xl font-bold text-[var(--text)] leading-none">
                    {house.points.toLocaleString()}
                  </p>
                  <p className="text-[var(--text-muted)] text-lg font-medium">Total Points</p>
                </div>
              </div>

              {/* Top Students */}
              <div className="mt-6">
                <p className="text-[var(--text-muted)] text-base font-semibold mb-4">Top Performers</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {house.topStudents.map((student, i) => (
                    <div
                      key={student.name}
                      className={`surface-muted rounded-xl px-4 py-3 min-w-[150px] border border-[var(--border)] hover:bg-[var(--surface)] transition-colors ${i === 0 ? 'bg-[var(--champ-soft)] border-l-[3px] border-[var(--champ)]' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          i === 0 ? 'bg-[var(--champ)] text-white' :
                          i === 1 ? 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]' :
                          'bg-[var(--surface-2)] text-[var(--text-muted)]'
                        }`}>
                          {i + 1}
                        </span>
                        <p className="text-[var(--text)] font-semibold text-base truncate flex-1">{student.name}</p>
                      </div>
                      <p className="text-[var(--text)] text-lg font-bold">{student.points} <span className="text-sm text-[var(--text-muted)] font-normal">pts</span></p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
