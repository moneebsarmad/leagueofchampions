import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const ADMIN_ROLES = ['admin'] as const
const SUPER_ADMIN_ROLES = ['admin'] as const

export type AllowedRole = (typeof ADMIN_ROLES)[number] | (typeof SUPER_ADMIN_ROLES)[number]

export async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  return { supabase, user: authData.user }
}

export async function requireRole(roles: AllowedRole[]) {
  const auth = await requireAuthenticatedUser()
  if (auth.error || !auth.supabase || !auth.user) {
    return auth
  }

  const { data: profile, error: roleError } = await auth.supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (roleError) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const role = profile?.role ?? null
  if (!role || !roles.includes(role as AllowedRole)) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }

  return { supabase: auth.supabase, user: auth.user, role: role as AllowedRole }
}

export const RoleSets = {
  admin: ADMIN_ROLES,
  superAdmin: SUPER_ADMIN_ROLES,
}
