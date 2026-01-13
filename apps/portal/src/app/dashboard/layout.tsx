'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import Sidebar, { UserRole } from '../../components/Sidebar'
import DashboardHeader from '../../components/DashboardHeader'
import CrestLoader from '../../components/CrestLoader'
import AnnouncementsPopup from '../../components/AnnouncementsPopup'

// All valid roles
const VALID_ROLES: UserRole[] = ['student', 'parent', 'staff', 'admin', 'super_admin', 'house_mentor', 'teacher', 'support_staff']

function mapRoleToPortalRole(dbRole: string | null | undefined): UserRole | null {
  if (!dbRole) return null
  // Normalize role: lowercase and trim
  const normalized = String(dbRole).toLowerCase().trim()

  // Direct match
  if (VALID_ROLES.includes(normalized as UserRole)) return normalized as UserRole

  // Handle variations
  if (normalized === 'superadmin' || normalized === 'super-admin') return 'super_admin'
  if (normalized === 'housementor' || normalized === 'house-mentor') return 'house_mentor'
  if (normalized === 'supportstaff' || normalized === 'support-staff') return 'support_staff'

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

function portalLabel(role: UserRole) {
  switch (role) {
    case 'student':
      return 'Student Portal'
    case 'parent':
      return 'Parent Portal'
    case 'admin':
    case 'super_admin':
      return 'Admin Portal'
    case 'staff':
    case 'teacher':
    case 'house_mentor':
    case 'support_staff':
      return 'Staff Portal'
    default:
      return 'Portal'
  }
}

function isAdminRole(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin'
}

export default function DashboardLayout({
  children}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [role, setRole] = useState<UserRole | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [staffName, setStaffName] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      console.log('[Dashboard] No user, redirecting to login...')
      window.location.href = '/'
    }
  }, [loading, user])

  useEffect(() => {
    if (!user) return

    setProfileLoading(true)
    const userRole = user.user_metadata?.role ?? null
    console.log('[Dashboard] User metadata:', user.user_metadata)
    console.log('[Dashboard] Role from metadata:', userRole)
    const mappedRole = mapRoleToPortalRole(userRole)
    console.log('[Dashboard] Mapped role:', mappedRole)
    setRole(mappedRole)
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
    return (
      <div className="min-h-screen app-shell">
        <CrestLoader label="Redirecting to login..." />
      </div>
    )
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen app-shell">
        <CrestLoader label="Loading profile..." />
      </div>
    )
  }

  if (!role) {
    const rawRole = user.user_metadata?.role
    return (
      <div className="min-h-screen app-shell flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--danger)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-[var(--text)] font-medium mb-2">Profile role not found</p>
          <p className="text-[var(--text-muted)] text-sm mb-4">Please contact an administrator.</p>
          <p className="text-[var(--text-muted)] text-xs">Debug: role="{rawRole ?? 'undefined'}"</p>
        </div>
      </div>
    )
  }

  const displayName = staffName || formatDisplayName(user.email ?? '')
  const showAdmin = isAdminRole(role)
  const isSuperAdmin = role === 'super_admin'

  return (
    <div className="min-h-screen app-shell">
      <Sidebar role={role} portalLabel={portalLabel(role)} isSuperAdmin={isSuperAdmin} />
      {showAdmin && <AnnouncementsPopup />}

      {/* Main Content */}
      <div className="ml-72">
        <div className="victory-arena px-6 py-4 border-b-2 border-[var(--victory-gold)]">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-white display">{showAdmin ? 'Dashboard' : 'Portal Dashboard'}</div>
            <span className="champ-badge">
              <span className="champ-dot"></span>
              Season Live
            </span>
          </div>
        </div>
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
