'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

type NavItem = {
  id: string
  name: string
  href: string
  icon: string
}

// Extended role type to include admin roles
export type UserRole = 'student' | 'parent' | 'staff' | 'admin' | 'super_admin' | 'house_mentor' | 'teacher' | 'support_staff'

type SidebarProps = {
  role: UserRole
  portalLabel: string
  isSuperAdmin?: boolean
}

// Navigation items for different role groups
const studentNavItems: NavItem[] = [
  { id: 'leaderboard', name: 'Leaderboard', href: '/dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'profile', name: 'My Points', href: '/dashboard/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'house', name: 'My House', href: '/dashboard/house', icon: 'M3 10l9-6 9 6v9a2 2 0 01-2 2h-4a2 2 0 01-2-2v-5H9v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z' },
  { id: 'settings', name: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

const parentNavItems: NavItem[] = [
  { id: 'leaderboard', name: 'Leaderboard', href: '/dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'child', name: 'Child Profile', href: '/dashboard/child', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'settings', name: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

const staffNavItems: NavItem[] = [
  { id: 'leaderboard', name: 'Leaderboard', href: '/dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'students', name: 'Students', href: '/dashboard/students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'add-points', name: 'Add Points', href: '/dashboard/add-points', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
  { id: 'settings', name: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

// Admin nav items - full admin dashboard
const adminPrimaryItems: NavItem[] = [
  { id: 'overview', name: 'Overview', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'rewards', name: 'Rewards', href: '/dashboard/rewards', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { id: 'analytics', name: 'Analytics', href: '/dashboard/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'students', name: 'Students', href: '/dashboard/students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'add-points', name: 'Add Points', href: '/dashboard/add-points', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
]

const adminSecondaryItems: NavItem[] = [
  { id: 'staff', name: 'Staff', href: '/dashboard/staff', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'search', name: 'Search', href: '/dashboard/search', icon: 'M21 21l-4.35-4.35m1.6-4.15a7 7 0 11-14 0 7 7 0 0114 0z' },
  { id: 'reports', name: 'Reports', href: '/dashboard/reports', icon: 'M9 12h6m-6 4h6M7 8h10M5 20h14a2 2 0 002-2V7.414a2 2 0 00-.586-1.414l-3.414-3.414A2 2 0 0015.586 2H5a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'settings', name: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

// Super admin only items
const superAdminItems: NavItem[] = [
  { id: 'announcements', name: 'Announcements', href: '/dashboard/announcements', icon: 'M7 8h10M7 12h10M7 16h6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'data-quality', name: 'Data Quality', href: '/dashboard/data-quality', icon: 'M9 12h6m2 9H7a2 2 0 01-2-2V5a2 2 0 012-2h6l4 4v12a2 2 0 01-2 2zM14 3v5h5' },
  { id: 'behaviour', name: 'Behaviour Insights', href: '/dashboard/behaviour', icon: 'M12 3l7 4v6c0 5-3.5 9.5-7 11-3.5-1.5-7-6-7-11V7l7-4zM9 12l2 2 4-4' },
]

// Check if role has admin access
function isAdminRole(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin'
}

export default function Sidebar({ role, portalLabel, isSuperAdmin = false }: SidebarProps) {
  const pathname = usePathname()

  const navItems = useMemo(() => {
    // For admin/super_admin, show full admin nav
    if (isAdminRole(role)) {
      const items = [...adminPrimaryItems, ...adminSecondaryItems]
      if (isSuperAdmin || role === 'super_admin') {
        // Insert super admin items before settings
        const settingsIndex = items.findIndex(item => item.id === 'settings')
        items.splice(settingsIndex, 0, ...superAdminItems)
      }
      return { primary: adminPrimaryItems, secondary: adminSecondaryItems, superAdmin: isSuperAdmin || role === 'super_admin' ? superAdminItems : [] }
    }

    // For other roles, return flat list
    if (role === 'parent') return { primary: parentNavItems, secondary: [], superAdmin: [] }
    if (role === 'staff' || role === 'teacher' || role === 'house_mentor' || role === 'support_staff') {
      return { primary: staffNavItems, secondary: [], superAdmin: [] }
    }
    return { primary: studentNavItems, secondary: [], superAdmin: [] }
  }, [role, isSuperAdmin])

  const isAdmin = isAdminRole(role)

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-gradient-to-b from-[var(--charcoal)] to-[var(--charcoal-light)] text-white flex flex-col z-50">
      {/* Gold Top Border */}
      <div className="h-1 bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-dark)]"></div>

      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] flex items-center justify-center shadow-lg shadow-[var(--gold)]/20">
            <span className="text-[var(--charcoal)] font-bold text-sm" style={{ fontFamily: 'var(--font-playfair), serif' }}>DA</span>
          </div>
          <div>
            <p className="text-base font-semibold text-white" style={{ fontFamily: 'var(--font-playfair), serif' }}>Dar al-Arqam</p>
            <p className="text-xs text-[var(--gold-light)] font-medium tracking-wide">{portalLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {isAdmin ? (
          <>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3 px-3">Primary</p>
            <ul className="space-y-1 mb-6">
              {navItems.primary.map((item) => (
                <NavItemRow key={item.id} item={item} pathname={pathname} />
              ))}
            </ul>

            {navItems.superAdmin.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-[var(--victory-gold)] uppercase tracking-wider mb-3 px-3">Super Admin</p>
                <ul className="space-y-1 mb-6">
                  {navItems.superAdmin.map((item) => (
                    <NavItemRow key={item.id} item={item} pathname={pathname} />
                  ))}
                </ul>
              </>
            )}

            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3 px-3">Admin</p>
            <ul className="space-y-1">
              {navItems.secondary.map((item) => (
                <NavItemRow key={item.id} item={item} pathname={pathname} />
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3 px-3">Navigation</p>
            <ul className="space-y-1">
              {navItems.primary.map((item) => (
                <NavItemRow key={item.id} item={item} pathname={pathname} />
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="px-4 py-3 rounded-lg bg-[var(--midnight-secondary)] border border-white/5">
          <p className="text-xs text-white/80 font-semibold">
            League of Champions
          </p>
          <p className="text-[11px] text-white/50 mt-0.5">
            Where Champions Are Made
          </p>
        </div>
      </div>
    </aside>
  )
}

function NavItemRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href ||
    (item.href !== '/dashboard' && pathname?.startsWith(item.href))

  return (
    <li>
      <Link
        href={item.href}
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-[var(--gold)]/15 text-[var(--gold)]'
            : 'text-white/70 hover:text-white hover:bg-white/5'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--gold)] rounded-r shadow-[0_0_8px_var(--gold)]"></div>
        )}
        <div className={`p-1.5 rounded-md transition-all ${
          isActive
            ? 'bg-[var(--gold)]/20'
            : 'bg-white/5 group-hover:bg-white/10'
        }`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
          </svg>
        </div>
        <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`} style={{ fontFamily: 'var(--font-cormorant), serif' }}>{item.name}</span>
      </Link>
    </li>
  )
}
