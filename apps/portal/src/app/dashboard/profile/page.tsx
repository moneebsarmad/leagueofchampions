'use client'

import { useEffect, useState } from 'react'
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

interface MeritEntry {
  points: number
  r: string
  subcategory: string
  timestamp: string
  staffName: string
}

const houseColors: Record<string, string> = {
  'House of Abū Bakr': '#2f0a61',
  'House of Khadījah': '#055437',
  'House of ʿUmar': '#000068',
  'House of ʿĀʾishah': '#910000',
}

function canonicalHouse(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[''`]/g, "'")
    .toLowerCase()
    .trim()

  if (normalized.includes('bakr') || normalized.includes('abu')) return 'House of Abū Bakr'
  if (normalized.includes('khadijah') || normalized.includes('khad')) return 'House of Khadījah'
  if (normalized.includes('umar')) return 'House of ʿUmar'
  if (normalized.includes('aishah') || normalized.includes('aish')) return 'House of ʿĀʾishah'
  return value
}

function getHouseColor(house: string): string {
  const canonical = canonicalHouse(house)
  return houseColors[canonical] || '#1a1a2e'
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function MyPointsPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [merits, setMerits] = useState<MeritEntry[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [categoryTotals, setCategoryTotals] = useState<{ category: string; points: number; color: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      setLoading(true)
      const name = String(user.user_metadata?.student_name ?? user.user_metadata?.full_name ?? '').trim()
      const grade = Number(user.user_metadata?.grade ?? 0)
      const section = String(user.user_metadata?.section ?? '')
      const house = String(user.user_metadata?.house ?? '')

      if (!name) {
        setProfile(null)
        setMerits([])
        setTotalPoints(0)
        setCategoryTotals([])
        setLoading(false)
        return
      }

      setProfile({ name, grade, section, house })

      let pointsQuery = supabase
        .from(VIEWS.STUDENT_POINTS)
        .select('*')
        .eq('student_name', name)
      if (grade) pointsQuery = pointsQuery.eq('grade', grade)
      if (section) pointsQuery = pointsQuery.eq('section', section)
      const { data: pointsRows } = await pointsQuery
      const pointsRow = pointsRows?.[0]
      setTotalPoints(Number(pointsRow?.total_points ?? pointsRow?.points ?? 0))

      let categoryQuery = supabase
        .from(VIEWS.STUDENT_POINTS_BY_R)
        .select('*')
        .eq('student_name', name)
      if (grade) categoryQuery = categoryQuery.eq('grade', grade)
      if (section) categoryQuery = categoryQuery.eq('section', section)
      const { data: categoryRows } = await categoryQuery
      const totals = (categoryRows || []).map((row) => {
        const category = String(row.category ?? row.r ?? '')
        const points = Number(row.total_points ?? row.points ?? 0)
        const color = category === 'Respect'
          ? '#1f4e79'
          : category === 'Responsibility'
            ? '#8a6a1e'
            : '#6b2f8a'
        return { category, points, color }
      })
      setCategoryTotals(totals)
      setMerits([])
      setLoading(false)
    }

    loadProfile()
  }, [user])

  if (loading) {
    return (
      <CrestLoader label="Loading your points..." />
    )
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#c9a227]/10 text-center">
        <p className="text-[#1a1a2e]/70 font-medium">We couldn't find your student profile yet.</p>
        <p className="text-sm text-[#1a1a2e]/45 mt-2">Please contact the office to link your account.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          My Points
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Your merit summary and recent activity.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#c9a227]/10 overflow-hidden">
        <div className="p-6 border-b border-[#1a1a2e]/5">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{
                backgroundColor: `${getHouseColor(profile.house)}15`,
                color: getHouseColor(profile.house),
              }}
            >
              {getInitials(profile.name)}
            </div>
            <div>
              <p className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                {profile.name}
              </p>
              <p className="text-[#1a1a2e]/50">
                Grade {profile.grade}{profile.section}
                <span className="text-[#1a1a2e]/20"> • </span>
                {canonicalHouse(profile.house)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-[#1a1a2e]/5 text-center bg-gradient-to-br from-[#faf9f7] to-white">
          <p className="text-sm text-[#1a1a2e]/50 mb-1">Total Points</p>
          <p
            className="text-4xl font-bold"
            style={{
              color: getHouseColor(profile.house),
              fontFamily: 'var(--font-playfair), Georgia, serif',
            }}
          >
            {totalPoints}
          </p>
        </div>

        <div className="p-6 border-b border-[#1a1a2e]/5">
          <h3 className="text-xs font-semibold text-[#1a1a2e]/40 uppercase tracking-wider mb-3">Points by Category</h3>
          {categoryTotals.map((item) => (
            <div key={item.category} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-[#1a1a2e]/70">{item.category}</span>
              </div>
              <span className="font-semibold" style={{ color: item.color }}>{item.points}</span>
            </div>
          ))}
        </div>

        <div className="p-6">
          <h3 className="text-xs font-semibold text-[#1a1a2e]/40 uppercase tracking-wider mb-3">Recent Activity</h3>
          {merits.length === 0 ? (
            <p className="text-[#1a1a2e]/40 text-sm">No activity yet</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {merits.slice(0, 10).map((entry, index) => (
                <div key={index} className="flex items-center justify-between py-2.5 border-b border-[#1a1a2e]/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a2e]">
                      {entry.subcategory || entry.r?.split(' – ')[0]}
                    </p>
                    <p className="text-xs text-[#1a1a2e]/40">{entry.staffName}</p>
                  </div>
                  <span className="text-[#055437] font-semibold">+{entry.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
