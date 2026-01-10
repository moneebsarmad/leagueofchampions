'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { VIEWS } from '@/lib/views'
import CrestLoader from '@/components/CrestLoader'

interface HouseData {
  name: string
  points: number
  color: string
  gradient: string
  accentGradient: string
  logo: string
  percentage: number
  topStudents: { name: string; points: number }[]
}

const houseConfig: Record<string, { color: string; gradient: string; accentGradient: string; logo: string }> = {
  'House of Abu Bakr': {
    color: 'var(--house-abu-bakr)',
    gradient: 'linear-gradient(135deg, #2d3748 0%, #1e2a3a 50%, #0f1720 100%)',
    accentGradient: 'linear-gradient(135deg, #3d4758 0%, #2d3748 100%)',
    logo: '/houses/abu-bakr.png',
  },
  'House of Khadijah': {
    color: 'var(--house-khadijah)',
    gradient: 'linear-gradient(135deg, #3d7a3d 0%, #2d5a27 50%, #1a3a16 100%)',
    accentGradient: 'linear-gradient(135deg, #4d8a4d 0%, #3d7a3d 100%)',
    logo: '/houses/khadijah.png',
  },
  'House of Umar': {
    color: 'var(--house-umar)',
    gradient: 'linear-gradient(135deg, #5a6778 0%, #4a5568 50%, #3a4550 100%)',
    accentGradient: 'linear-gradient(135deg, #6a7788 0%, #5a6778 100%)',
    logo: '/houses/umar.png',
  },
  'House of Aishah': {
    color: 'var(--house-aishah)',
    gradient: 'linear-gradient(135deg, #8a5a1a 0%, #744210 50%, #5a320a 100%)',
    accentGradient: 'linear-gradient(135deg, #9a6a2a 0%, #8a5a1a 100%)',
    logo: '/houses/aishah.png',
  },
}

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
          percentage: Number(percentRaw) || 0,
        })
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
          points,
        })
      })

      const houseData: HouseData[] = Object.keys(houseConfig).map((name) => {
        const standings = standingsMap.get(name)
        return {
          name,
          points: standings?.points ?? 0,
          color: houseConfig[name].color,
          gradient: houseConfig[name].gradient,
          accentGradient: houseConfig[name].accentGradient,
          logo: houseConfig[name].logo,
          percentage: standings?.percentage ?? 0,
          topStudents: (houseStudents[name] || []).slice(0, 5),
        }
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
      hour12: true,
    })
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
            <h1 className="text-3xl font-bold text-[var(--navy)] mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
              House Standings
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-1 w-16 bg-gradient-to-r from-[var(--brass)] to-[var(--brass-light)] rounded-full"></div>
              <p className="text-[var(--navy)]/50 text-sm font-medium">Current academic year rankings</p>
            </div>
          </div>
          {lastUpdated && (
            <div className="text-right">
              <p className="text-xs text-[var(--navy)]/40 font-medium">Last updated</p>
              <p className="text-sm text-[var(--navy)]/70 font-semibold">{formatLastUpdated(lastUpdated)}</p>
            </div>
          )}
        </div>
      </div>

      {/* House Cards */}
      <div className="space-y-6">
        {houses.map((house, index) => (
          <div
            key={house.name}
            className="rounded-2xl overflow-hidden shadow-lg relative"
            style={{ background: house.gradient }}
          >
            {/* Decorative elements */}
            <div className="absolute top-8 right-10 w-40 h-40 opacity-[0.06]">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <path fill="white" d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
              </svg>
            </div>

            <div className="p-6 relative z-10">
              {/* House Header */}
              <div className="flex items-start justify-between gap-6 mb-5">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm tracking-[0.15em] font-semibold text-white/70 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full mb-4">
                    <span className="text-white/50">Rank</span>
                    <span className="text-white">{index + 1}</span>
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm p-1.5 shadow-lg border border-white/10">
                      <img
                        src={house.logo}
                        alt={house.name}
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                      {house.name}
                    </h2>
                  </div>
                  {/* Progress bar */}
                  <div className="w-64 h-2.5 bg-white/20 rounded-full overflow-hidden mb-2 backdrop-blur-sm">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${house.percentage}%`,
                        background: 'linear-gradient(90deg, var(--brass) 0%, var(--brass-light) 50%, var(--brass) 100%)',
                      }}
                    />
                  </div>
                  <p className="text-white/60 text-base font-medium">{house.percentage.toFixed(1)}% of total points</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2 min-w-[150px] pt-4">
                  <p className="text-4xl font-bold text-white leading-none" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                    {house.points.toLocaleString()}
                  </p>
                  <p className="text-white/50 text-lg font-medium">Total Points</p>
                </div>
              </div>

              {/* Top Students */}
              <div className="mt-6">
                <p className="text-white/50 text-base font-semibold tracking-wide mb-4">Top Performers</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {house.topStudents.map((student, i) => (
                    <div
                      key={student.name}
                      className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 min-w-[150px] border border-white/10 hover:bg-white/15 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          i === 0 ? 'bg-[var(--brass)] text-white' :
                          i === 1 ? 'bg-white/30 text-white' :
                          'bg-white/20 text-white/80'
                        }`}>
                          {i + 1}
                        </span>
                        <p className="text-white font-semibold text-base truncate flex-1">{student.name}</p>
                      </div>
                      <p className="text-[var(--brass-light)] text-lg font-bold">{student.points} <span className="text-sm text-white/50 font-normal">pts</span></p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="h-1 bg-gradient-to-r from-transparent via-[var(--brass)]/50 to-transparent"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
