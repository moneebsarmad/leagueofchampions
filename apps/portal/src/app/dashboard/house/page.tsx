'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase } from '../../../lib/supabaseClient'
import { VIEWS } from '../../../lib/views'
import CrestLoader from '../../../components/CrestLoader'

interface StudentProfile {
  name: string
  grade: number
  section: string
  house: string
}

interface HouseStanding {
  house: string
  total_points: number
  rank?: number | null
  percentage?: number | null
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

  if (normalized.includes('bakr') || normalized.includes('abu')) return 'House of Abu Bakr'
  if (normalized.includes('khadijah') || normalized.includes('khad')) return 'House of Khadijah'
  if (normalized.includes('umar')) return 'House of Umar'
  if (normalized.includes('aishah') || normalized.includes('aish')) return 'House of Aishah'
  return value
}

export default function MyHousePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [standings, setStandings] = useState<HouseStanding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      setLoading(true)
      const name = String(user.user_metadata?.student_name ?? user.user_metadata?.full_name ?? '').trim()
      const grade = Number(user.user_metadata?.grade ?? 0)
      const section = String(user.user_metadata?.section ?? '')
      const house = String(user.user_metadata?.house ?? '')

      if (!name || !house) {
        setProfile(null)
      } else {
        setProfile({ name, grade, section, house })
      }

      const { data: standingsData } = await supabase
        .from(VIEWS.HOUSE_STANDINGS)
        .select('*')

      setStandings((standingsData || []) as HouseStanding[])
      setLoading(false)
    }

    loadData()
  }, [user])

  const canonical = profile ? canonicalHouse(profile.house) : ''
  const houseInfo = houseConfig[canonical]

  const rankInfo = useMemo(() => {
    if (!canonical) return { rank: null, totalPoints: 0, percentage: 0 }
    const match = standings.find((item) => canonicalHouse(String(item.house ?? '')) === canonical)
    return {
      rank: match?.rank ?? null,
      totalPoints: Number(match?.total_points ?? 0),
      percentage: Number(match?.percentage ?? 0),
    }
  }, [canonical, standings])

  if (loading) {
    return (
      <CrestLoader label="Loading your house..." />
    )
  }

  if (!profile || !houseInfo) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-[var(--stone-alt)] text-center">
        <p className="text-[var(--navy)]/70 font-medium">We couldn't find your house yet.</p>
        <p className="text-sm text-[var(--navy)]/45 mt-2">Please contact the office to link your account.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--navy)] mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
          My House
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[var(--brass)] to-[var(--brass-light)] rounded-full"></div>
          <p className="text-[var(--navy)]/50 text-sm font-medium">House standing and contribution snapshot.</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-lg relative" style={{ background: houseInfo.gradient }}>
        <div className="absolute top-8 right-10 w-40 h-40 opacity-[0.06]">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path fill="white" d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
          </svg>
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
                <img src={houseInfo.logo} alt={canonical} className="w-12 h-12 object-contain" />
              </div>
              <div>
                <p className="text-white/70 text-xs uppercase tracking-[0.2em]">My House</p>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                  {canonical}
                </h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/70">House Rank</p>
              <p className="text-3xl font-bold text-white">#{rankInfo.rank ?? '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4 border border-white/15">
              <p className="text-xs uppercase tracking-wider text-white/60">Total Points</p>
              <p className="text-2xl font-bold text-white mt-2">{rankInfo.totalPoints.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/15">
              <p className="text-xs uppercase tracking-wider text-white/60">Share of Points</p>
              <p className="text-2xl font-bold text-white mt-2">{rankInfo.percentage.toFixed(1)}%</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/15">
              <p className="text-xs uppercase tracking-wider text-white/60">My Class</p>
              <p className="text-2xl font-bold text-white mt-2">{profile.grade}{profile.section}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
