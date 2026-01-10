'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import Sidebar from '../../components/Sidebar'
import DashboardHeader from '../../components/DashboardHeader'
import CrestLoader from '../../components/CrestLoader'

type Role = 'student' | 'parent' | 'staff'

// RBAC roles that map to 'staff' portal access
const STAFF_ROLES = ['staff', 'super_admin', 'admin', 'house_mentor', 'teacher', 'support_staff']

function mapRoleToPortalRole(dbRole: string | null): Role | null {
  if (!dbRole) return null
  if (dbRole === 'student') return 'student'
  if (dbRole === 'parent') return 'parent'
  if (STAFF_ROLES.includes(dbRole)) return 'staff'
  return null
}

function formatDisplayName(email: string) {
  if (!email) return 'User'
  const localPart = email.split('@')[0] ?? ''
  const parts = localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return email
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function portalLabel(role: Role) {
  switch (role) {
    case 'student':
      return 'Student Portal'
    case 'parent':
      return 'Parent Portal'
    case 'staff':
      return 'Staff Portal'
    default:
      return 'Portal'
  }
}

export default function DashboardLayout({
  children}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [role, setRole] = useState<Role | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [staffName, setStaffName] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return

    setProfileLoading(true)
    setRole(mapRoleToPortalRole(user.user_metadata?.role ?? null))
    setProfileLoading(false)
  }, [user])

  useEffect(() => {
    if (!user?.email) return
    setStaffName(String(user.user_metadata?.staff_name ?? ''))
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen app-shell">
        <CrestLoader label="Loading session..." />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen app-shell">
        <CrestLoader label="Loading profile..." />
      </div>
    )
  }

  if (!role) {
    return (
      <div className="min-h-screen app-shell flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--danger)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-[var(--text)] font-medium mb-2">Profile role not found</p>
          <p className="text-[var(--text-muted)] text-sm">Please contact an administrator.</p>
        </div>
      </div>
    )
  }

  const displayName = staffName || formatDisplayName(user.email ?? '')

  return (
    <div className="min-h-screen app-shell">
      <Sidebar role={role} portalLabel={portalLabel(role)} />

      {/* Main Content */}
      <div className="ml-72">
        {/* Header */}
        <DashboardHeader userName={displayName} role={role} />

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
