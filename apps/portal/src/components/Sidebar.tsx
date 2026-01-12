'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  id: string
  name: string
  href: string
  icon: string
}

type SidebarProps = {
  role: 'student' | 'parent' | 'staff'
  portalLabel: string
}

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

export default function Sidebar({ role, portalLabel }: SidebarProps) {
  const pathname = usePathname()

  const navItems = role === 'staff'
    ? staffNavItems
    : role === 'parent'
      ? parentNavItems
      : studentNavItems

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 ink-band ink-band--striped text-white border-r border-white/10 flex flex-col z-50">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-base font-semibold text-white">Dār al-Arqam</p>
            <p className="text-xs text-white/70">League of Champions</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 overflow-y-auto">
        <p className="text-xs font-semibold text-white/60 mb-4 px-4">Navigation</p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href))

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white/10 text-white border-l-[3px] border-[var(--gold)]'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'bg-white/5 text-white/60 group-hover:text-white'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                  </div>
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-white/10">
        <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-white/70 font-medium">
            Dār al-Arqam Islamic School
          </p>
          <p className="text-xs text-white/50 mt-1">
            League of Champions
          </p>
        </div>
      </div>
    </aside>
  )
}
