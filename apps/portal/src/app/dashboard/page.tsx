'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { VIEWS } from '../../lib/views'
import CrestLoader from '../../components/CrestLoader'
import { useAuth } from '../providers'

type LeaderboardEntry = {
  house: string
  totalPoints: number
  percentage: number
  overallTotal: number
}

interface HouseData {
  name: string
  points: number
  color: string
  gradient: string
  logo: string
  percentage: number
}

const houseConfig: Record<string, { color: string; gradient: string; logo: string }> = {
  'House of Abu Bakr': {
    color: 'var(--house-abu-bakr)',
    gradient: 'linear-gradient(135deg, #2d3748 0%, #1e2a3a 50%, #0f1720 100%)',
    logo: '/House%20of%20Ab%C5%AB%20Bakr.png',
  },
  'House of Khadijah': {
    color: 'var(--house-khadijah)',
    gradient: 'linear-gradient(135deg, #3d7a3d 0%, #2d5a27 50%, #1a3a16 100%)',
    logo: '/House%20of%20Khad%C4%ABjah.png',
  },
  'House of Umar': {
    color: 'var(--house-umar)',
    gradient: 'linear-gradient(135deg, #5a6778 0%, #4a5568 50%, #3a4550 100%)',
    logo: '/House%20of%20%CA%BFUmar.png',
  },
  'House of Aishah': {
    color: 'var(--house-aishah)',
    gradient: 'linear-gradient(135deg, #8a5a1a 0%, #744210 50%, #5a320a 100%)',
    logo: '/House%20of%20%CA%BF%C4%80%CA%BEishah.png',
  },
}

function canonicalHouse(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[''`]/g, "'")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')

  if (normalized.includes('bakr') || normalized.includes('abu')) return 'House of Abu Bakr'
  if (normalized.includes('khadijah') || normalized.includes('khad')) return 'House of Khadijah'
  if (normalized.includes('umar')) return 'House of Umar'
  if (normalized.includes('aishah') || normalized.includes('aish')) return 'House of Aishah'
  return value
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      setDataLoading(true)
      setDataError(null)

      const { data, error } = await supabase
        .from(VIEWS.HOUSE_STANDINGS)
        .select('*')

      if (error) {
        setDataError(error.message)
        setLeaderboard([])
      } else {
        const mapped = (data ?? []).map((row) => ({
          house: String(row.house ?? 'Unknown'),
          totalPoints: Number(row.total_points ?? 0),
          percentage: Number(row.percentage ?? row.percent ?? 0),
          overallTotal: Number(row.overall_total ?? row.total_all ?? 0),
        }))
        setLeaderboard(mapped)
      }
      setDataLoading(false)
    }

    loadData()
  }, [user])

  const houses: HouseData[] = useMemo(() => {
    return leaderboard.map((entry) => {
      const canonicalName = canonicalHouse(entry.house)
      const config = houseConfig[canonicalName] ?? {
        color: 'var(--navy)',
        gradient: 'linear-gradient(135deg, #2d3748 0%, #1e2a3a 100%)',
        logo: '/crest.png',
      }

      return {
        name: entry.house,
        points: entry.totalPoints,
        color: config.color,
        gradient: config.gradient,
        logo: config.logo,
        percentage: entry.percentage ?? 0,
      }
    })
  }, [leaderboard])

  const topHouse = houses[0]
  const otherHouses = houses.slice(1)

  if (dataLoading) {
    return (
      <CrestLoader label="Loading dashboard..." />
    )
  }

  if (dataError) {
    return (
      <div className="sanctuary-card rounded-2xl p-6">
        <div className="flex items-center gap-3 text-[var(--house-aishah)]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="font-medium">{dataError}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--navy)] mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
          House Standings
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[var(--brass)] to-[var(--brass-light)] rounded-full"></div>
          <p className="text-[var(--navy)]/50 text-sm font-medium">Current academic year rankings</p>
        </div>
      </div>

      {/* House Podium */}
      {houses.length === 0 ? (
        <div className="sanctuary-card rounded-2xl p-8 text-center">
          <p className="text-[var(--navy)]/50">No points logged yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {topHouse ? (
            <div
              className="rounded-3xl overflow-hidden shadow-xl relative"
              style={{ background: topHouse.gradient }}
            >
              <div className="absolute -top-6 right-6 text-[120px] font-black text-white/10">
                1
              </div>
              <div className="p-8 relative z-10">
                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm p-2 shadow-lg border border-white/10">
                      <img
                        src={topHouse.logo}
                        alt={topHouse.name}
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-white/70 bg-white/10 border border-white/15 px-3 py-1 rounded-full mb-3">
                        <span className="text-white/50">Top House</span>
                      </div>
                      <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                        {topHouse.name}
                      </h2>
                      <p className="text-white/60 text-sm font-medium">{topHouse.percentage.toFixed(1)}% of total points</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-5xl font-bold text-white leading-none" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                      {topHouse.points.toLocaleString()}
                    </p>
                    <p className="text-white/50 text-sm font-medium">Total Points</p>
                  </div>
                </div>
                <div className="mt-6 h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${topHouse.percentage}%`,
                      background: 'linear-gradient(90deg, var(--brass) 0%, var(--brass-light) 50%, var(--brass) 100%)',
                    }}
                  />
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-transparent via-[var(--brass)]/60 to-transparent"></div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {otherHouses.map((house, index) => (
              <div
                key={house.name}
                className="rounded-2xl overflow-hidden shadow-lg relative"
                style={{ background: house.gradient }}
              >
                <div className="absolute top-4 right-4 text-4xl font-black text-white/10">
                  {index + 2}
                </div>
                <div className="p-5 relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm p-1.5 shadow-lg border border-white/10">
                      <img
                        src={house.logo}
                        alt={house.name}
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                        {house.name}
                      </h3>
                      <p className="text-white/60 text-xs font-medium">{house.percentage.toFixed(1)}% of total points</p>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-3xl font-bold text-white leading-none" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                      {house.points.toLocaleString()}
                    </p>
                    <p className="text-white/50 text-xs font-medium">Points</p>
                  </div>
                  <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${house.percentage}%`,
                        background: 'linear-gradient(90deg, var(--brass) 0%, var(--brass-light) 50%, var(--brass) 100%)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-[var(--navy)] to-[var(--navy-light)] px-5 py-4 rounded-2xl">
            <div className="flex items-center justify-between text-white">
              <span className="text-sm font-medium text-white/60">Total Points Awarded</span>
              <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                {(leaderboard[0]?.overallTotal ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
