'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '../app/providers'
import { UserRole } from './Sidebar'

type DashboardHeaderProps = {
  userName: string
  role: UserRole
}

function roleLabel(role: UserRole) {
  switch (role) {
    case 'student':
      return 'Student'
    case 'parent':
      return 'Parent'
    case 'admin':
      return 'Admin'
    case 'super_admin':
      return 'Super Admin'
    case 'teacher':
      return 'Teacher'
    case 'house_mentor':
      return 'House Mentor'
    case 'support_staff':
      return 'Support Staff'
    case 'staff':
      return 'Staff'
    default:
      return 'User'
  }
}

function initials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return ''
  const parts = trimmed.split(/\s+/).slice(0, 2)
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

export default function DashboardHeader({ userName, role }: DashboardHeaderProps) {
  const router = useRouter()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-10">
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)]"></div>
          <span className="text-sm text-[var(--text-muted)] font-medium">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'})}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--midnight-primary)] to-[var(--midnight-secondary)] border border-[var(--victory-gold)] flex items-center justify-center text-sm font-bold shadow-md">
              <span className="bg-gradient-to-b from-[var(--victory-gold-light)] to-[var(--victory-gold)] bg-clip-text text-transparent">{initials(userName)}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{userName}</p>
              <p className="text-xs text-[var(--victory-gold)]">{roleLabel(role)}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-[var(--border)]"></div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--victory-gold)] font-medium transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
