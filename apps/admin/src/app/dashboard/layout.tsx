import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'
import AnnouncementsPopup from '@/components/AnnouncementsPopup'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData.user) {
    redirect('/')
  }

  const adminName = authData.user.email || 'Admin'

  return (
    <div className="min-h-screen app-shell">
      <Sidebar />
      <AnnouncementsPopup />

      {/* Main Content */}
      <div className="ml-72">
        <div className="ink-band ink-band--striped px-6 py-4 border-b" style={{ borderColor: 'var(--gold-ring)' }}>
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold display">Dashboard</div>
            <span className="champ-badge">
              <span className="champ-dot"></span>
              Season Live
            </span>
          </div>
        </div>
        {/* Header */}
        <DashboardHeader adminName={adminName} />

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
