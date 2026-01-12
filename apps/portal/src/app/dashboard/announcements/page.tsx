'use client'

import { useCallback, useEffect, useState } from 'react'
import CrestLoader from '@/components/CrestLoader'

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
  audience_houses?: string[] | null
  audience_grades?: number[] | null
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [publishAt, setPublishAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [roles, setRoles] = useState<string[]>(['admin'])
  const [houses, setHouses] = useState<string[]>([])
  const [grades, setGrades] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLive, setIsLive] = useState(false)

  const houseOptions = [
    'House of Abū Bakr',
    'House of Khadījah',
    'House of ʿUmar',
    'House of ʿĀʾishah',
  ]
  const gradeOptions = [6, 7, 8, 9, 10, 11, 12]

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true)
    try {
      setAnnouncements([])
    } catch (error) {
      console.error('Announcements error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
    setIsLive(false)
  }, [fetchAnnouncements])

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return
    setIsSubmitting(true)
    try {
      alert('This demo is read-only. Announcements cannot be created.')
    } catch (error) {
      console.error('Create announcement error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatus = (announcement: Announcement) => {
    const now = new Date()
    const publishAt = announcement.publish_at ? new Date(announcement.publish_at) : null
    const expiresAt = announcement.expires_at ? new Date(announcement.expires_at) : null
    if (expiresAt && expiresAt <= now) return { label: 'Expired', tone: 'text-rose-600 bg-rose-50 border-rose-200' }
    if (publishAt && publishAt > now) return { label: 'Scheduled', tone: 'text-amber-700 bg-amber-50 border-amber-200' }
    return { label: 'Active', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
  }

  const toggleRole = (role: string) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
  }

  const toggleHouse = (house: string) => {
    setHouses((prev) => (prev.includes(house) ? prev.filter((h) => h !== house) : [...prev, house]))
  }

  const toggleGrade = (grade: number) => {
    setGrades((prev) => (prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]))
  }

  if (isLoading) {
    return <CrestLoader label="Loading announcements..." />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Announcements
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-[var(--accent)] rounded-full"></div>
          <p className="text-[var(--text-muted)] text-sm font-medium">Share updates with staff and students</p>
          <div className={`ml-auto flex items-center gap-2 text-xs font-semibold tracking-widest px-3 py-1 rounded-full border ${
            isLive
              ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
              : 'text-amber-700 border-amber-200 bg-amber-50'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {isLive ? 'Live Updates' : 'Connecting'}
          </div>
        </div>
      </div>

      <div className="card rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-[var(--text)]">
          New Announcement
        </h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 tracking-wider">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="input w-full px-4 py-3 rounded-xl text-sm"
              placeholder="Weekly house champions, events, reminders..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 tracking-wider">
              Message
            </label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="input w-full px-4 py-3 rounded-xl text-sm h-32"
              placeholder="Write the announcement..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 tracking-wider">
                Publish At
              </label>
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(event) => setPublishAt(event.target.value)}
                className="input w-full px-4 py-3 rounded-xl text-sm"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty to publish immediately.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 tracking-wider">
                Expires At
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="input w-full px-4 py-3 rounded-xl text-sm"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">Optional. Leave empty for no expiry.</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 tracking-wider">
              Audience Roles
            </label>
            <div className="flex flex-wrap gap-2">
              {['admin', 'staff'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    roles.includes(role)
                      ? 'bg-[var(--accent)]/20 border-[var(--border)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border)]'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty to show to all roles.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 tracking-wider">
              Target Houses
            </label>
            <div className="flex flex-wrap gap-2">
              {houseOptions.map((house) => (
                <button
                  key={house}
                  type="button"
                  onClick={() => toggleHouse(house)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    houses.includes(house)
                      ? 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border)]'
                  }`}
                >
                  {house.replace('House of ', '')}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty to show to all houses.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 tracking-wider">
              Target Grades
            </label>
            <div className="flex flex-wrap gap-2">
              {gradeOptions.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => toggleGrade(grade)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    grades.includes(grade)
                      ? 'bg-[var(--house-khad)]/10 border-[var(--border)] text-[var(--house-khad)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border)]'
                  }`}
                >
                  Grade {grade}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty to show to all grades.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPinned((prev) => !prev)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                pinned
                  ? 'bg-[var(--accent)]/20 border-[var(--border)] text-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border)]'
              }`}
            >
              {pinned ? 'Pinned' : 'Pin announcement'}
            </button>
          </div>
          <button
            onClick={handleCreate}
            disabled={isSubmitting || !title.trim() || !body.trim()}
            className="btn-primary px-5 py-2.5 text-sm font-medium rounded-xl disabled:opacity-60"
          >
            {isSubmitting ? 'Posting...' : 'Post Announcement'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="card rounded-2xl p-6 text-[var(--text-muted)] text-sm">
            No announcements yet.
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="card rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text)]">
                    {announcement.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {announcement.created_by} • {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {announcement.pinned && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-semibold tracking-wider">
                      Pinned
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold tracking-wider ${getStatus(announcement).tone}`}>
                    {getStatus(announcement).label}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-[var(--text-muted)] whitespace-pre-wrap">
                {announcement.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                {announcement.publish_at && (
                  <span>Publishes: {new Date(announcement.publish_at).toLocaleString()}</span>
                )}
                {announcement.expires_at && (
                  <span>Expires: {new Date(announcement.expires_at).toLocaleString()}</span>
                )}
                {announcement.audience_roles && announcement.audience_roles.length > 0 && (
                  <span>Roles: {announcement.audience_roles.join(', ')}</span>
                )}
                {announcement.audience_houses && announcement.audience_houses.length > 0 && (
                  <span>Houses: {announcement.audience_houses.map((h) => h.replace('House of ', '')).join(', ')}</span>
                )}
                {announcement.audience_grades && announcement.audience_grades.length > 0 && (
                  <span>Grades: {announcement.audience_grades.map((g) => `Grade ${g}`).join(', ')}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
