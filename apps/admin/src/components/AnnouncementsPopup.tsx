'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Announcement = {
  id: string
  title: string
  body: string
  created_at: string
  created_by: string
  pinned?: boolean | null
  publish_at?: string | null
  expires_at?: string | null
  audience_roles?: string[] | null
}

const seenKey = (userId: string) => `los_announcements_seen_${userId}`

export default function AnnouncementsPopup() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const loadAnnouncements = useCallback(async (currentUserId: string) => {
    setAnnouncements([])
    const seenRaw = localStorage.getItem(seenKey(currentUserId))
    const seenIds = seenRaw ? (JSON.parse(seenRaw) as string[]) : []
    setIsOpen(seenIds.length > 0)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return
      setUserId(authData.user.id)

      await loadAnnouncements(authData.user.id)
    }

    init()
  }, [loadAnnouncements])

  const unseenAnnouncements = useMemo(() => {
    if (!userId) return announcements
    const seenRaw = localStorage.getItem(seenKey(userId))
    const seenIds = seenRaw ? JSON.parse(seenRaw) as string[] : []
    return announcements.filter((item) => !seenIds.includes(item.id))
  }, [announcements, userId])

  const handleDismiss = () => {
    if (!userId) return
    const seenRaw = localStorage.getItem(seenKey(userId))
    const seenIds = seenRaw ? JSON.parse(seenRaw) as string[] : []
    const nextSeen = Array.from(new Set([...seenIds, ...unseenAnnouncements.map((item) => item.id)]))
    localStorage.setItem(seenKey(userId), JSON.stringify(nextSeen))
    setIsOpen(false)
  }

  if (!isOpen || unseenAnnouncements.length === 0) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-2xl rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">
            Latest Announcements
          </h3>
          <button
            onClick={handleDismiss}
            className="text-xs font-semibold tracking-wider text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Dismiss
          </button>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {unseenAnnouncements.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--border)] bg-white/90 px-4 py-3">
              <div className="flex items-center gap-2">
                {item.pinned && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent-2)] font-semibold tracking-wider">Pinned</span>}
                <h4 className="text-sm font-semibold text-[var(--text)]">{item.title}</h4>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {item.created_by} • {new Date(item.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-2 whitespace-pre-wrap">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link href="/dashboard/announcements" className="text-sm font-semibold text-[var(--accent-2)] hover:text-[var(--accent)]">
            View all announcements →
          </Link>
          <button
            onClick={handleDismiss}
            className="btn-primary px-4 py-2 text-sm font-medium rounded-xl"
          >
            Mark as Read
          </button>
        </div>
      </div>
    </div>
  )
}
