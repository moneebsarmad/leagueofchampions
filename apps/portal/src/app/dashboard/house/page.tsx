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

const houseConfig: Record<string, { color: string; logo: string }> = {
  'House of Abu Bakr': {
    color: 'var(--house-abu)',
    logo: '/House%20of%20Ab%C5%AB%20Bakr.png'},
  'House of Khadijah': {
    color: 'var(--house-khad)',
    logo: '/House%20of%20Khad%C4%ABjah.png'},
  'House of Umar': {
    color: 'var(--house-umar)',
    logo: '/House%20of%20%CA%BFUmar.png'},
  'House of Aishah': {
    color: 'var(--house-aish)',
    logo: '/House%20of%20%CA%BF%C4%80%CA%BEishah.png'}}

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
      percentage: Number(match?.percentage ?? 0)}
  }, [canonical, standings])

  if (loading) {
    return (
      <CrestLoader label="Loading your house..." />
    )
  }

  if (!profile || !houseInfo) {
    return (
      <div className="card rounded-2xl p-8 text-center">
        <p className="text-[var(--text)] font-medium">We couldn't find your house yet.</p>
        <p className="text-sm text-[var(--text-muted)] mt-2">Please contact the office to link your account.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          My House
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-[var(--accent)] rounded-full"></div>
          <p className="text-[var(--text-muted)] text-sm font-medium">House standing and contribution snapshot.</p>
        </div>
      </div>

      <div className="card rounded-2xl overflow-hidden" style={{ borderLeft: `4px solid ${houseInfo.color}` }}>
        <div className="p-6">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center border border-[var(--border)]">
                <img src={houseInfo.logo} alt={canonical} className="w-12 h-12 object-contain" />
              </div>
              <div>
                <p className="text-[var(--text-muted)] text-xs tracking-[0.2em]">My House</p>
                <h2 className="text-2xl font-bold text-[var(--text)]">
                  {canonical}
                </h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--text-muted)]">House Rank</p>
              <p className="text-3xl font-bold text-[var(--text)]">#{rankInfo.rank ?? '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="surface-muted rounded-xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">Total Points</p>
              <p className="text-2xl font-bold text-[var(--text)] mt-2">{rankInfo.totalPoints.toLocaleString()}</p>
            </div>
            <div className="surface-muted rounded-xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">Share of Points</p>
              <p className="text-2xl font-bold text-[var(--text)] mt-2">{rankInfo.percentage.toFixed(1)}%</p>
            </div>
            <div className="surface-muted rounded-xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">My Class</p>
              <p className="text-2xl font-bold text-[var(--text)] mt-2">{profile.grade}{profile.section}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
