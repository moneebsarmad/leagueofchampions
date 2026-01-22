import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const ADMIN_ROLES = ['admin', 'super_admin']

export interface AdminCheckResult {
  isAdmin: boolean
  userId: string | null
  userEmail: string | null
  error?: NextResponse
}

/**
 * Check if the current user has admin access
 * Returns user info if admin, or an error response if not
 */
export async function checkAdminAccess(): Promise<AdminCheckResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        isAdmin: false,
        userId: null,
        userEmail: null,
        error: NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        ),
      }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return {
        isAdmin: false,
        userId: user.id,
        userEmail: user.email ?? null,
        error: NextResponse.json(
          { success: false, error: 'Profile not found' },
          { status: 403 }
        ),
      }
    }

    const hasAdminAccess = ADMIN_ROLES.includes(profile.role)

    if (!hasAdminAccess) {
      return {
        isAdmin: false,
        userId: user.id,
        userEmail: user.email ?? null,
        error: NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        ),
      }
    }

    return {
      isAdmin: true,
      userId: user.id,
      userEmail: user.email ?? null,
    }
  } catch (err) {
    console.error('Error checking admin access:', err)
    return {
      isAdmin: false,
      userId: null,
      userEmail: null,
      error: NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 500 }
      ),
    }
  }
}
