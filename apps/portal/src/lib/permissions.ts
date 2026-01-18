'use client'

import { SupabaseClient } from '@supabase/supabase-js'

// Permission constants
export const PERMISSIONS = {
  POINTS_AWARD: 'points.award',
  POINTS_DEDUCT: 'points.deduct',
  POINTS_VIEW_ALL: 'points.view_all',
  ANALYTICS_VIEW_ALL: 'analytics.view_all',
  ANALYTICS_VIEW_HOUSE: 'analytics.view_house',
  STUDENTS_VIEW_ALL: 'students.view_all',
  STUDENTS_VIEW_HOUSE: 'students.view_house',
  REPORTS_EXPORT_ALL: 'reports.export_all',
  REPORTS_EXPORT_HOUSE: 'reports.export_house',
  STAFF_MANAGE: 'staff.manage',
  SYSTEM_CONFIGURE: 'system.configure',
  AUDIT_VIEW: 'audit.view',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// Role constants
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  PARENT: 'parent',
  STUDENT: 'student',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Profile with relations
export interface UserProfile {
  id: string
  role: Role | null
  linked_student_id?: string | null
  linked_staff_id?: string | null
}

async function fetchProfileRole(supabase: SupabaseClient): Promise<Role | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error getting user role:', error)
    return null
  }

  const role = data?.role ?? null

  if (role === ROLES.ADMIN || role === ROLES.STAFF || role === ROLES.PARENT || role === ROLES.STUDENT) {
    return role
  }

  // Map legacy RBAC roles into portal roles
  if (role === 'super_admin' || role === 'admin') return ROLES.ADMIN
  if (role === 'teacher' || role === 'support_staff' || role === 'house_mentor') return ROLES.STAFF

  return null
}

function roleHasPermission(role: Role | null, permission: Permission): boolean {
  if (!role) return false
  if (role === ROLES.ADMIN) return true
  if (role === ROLES.PARENT || role === ROLES.STUDENT) return false

  const staffPermissions = new Set<Permission>([
    PERMISSIONS.POINTS_AWARD,
    PERMISSIONS.POINTS_DEDUCT,
    PERMISSIONS.STUDENTS_VIEW_ALL,
  ])

  return staffPermissions.has(permission)
}

// Check if user has a specific permission
export async function hasPermission(
  supabase: SupabaseClient,
  permission: Permission
): Promise<boolean> {
  try {
    const role = await fetchProfileRole(supabase)
    return roleHasPermission(role, permission)
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

// Get user's role
export async function getUserRole(supabase: SupabaseClient): Promise<Role | null> {
  try {
    return await fetchProfileRole(supabase)
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

// Get user's assigned house (for house mentors)
export async function getUserHouse(supabase: SupabaseClient): Promise<string | null> {
  try {
    await supabase.auth.getUser()
    return null
  } catch (error) {
    console.error('Error getting user house:', error)
    return null
  }
}

// Get all permissions for a user
export async function getUserPermissions(
  supabase: SupabaseClient
): Promise<{ permission_name: string; description: string; category: string }[]> {
  try {
    const role = await fetchProfileRole(supabase)
    const permissions = Object.values(PERMISSIONS).filter((perm) => roleHasPermission(role, perm))
    return permissions.map((permission_name) => ({
      permission_name,
      description: '',
      category: permission_name.split('.')[0] || '',
    }))
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

// Get full user profile
export async function getUserProfile(supabase: SupabaseClient): Promise<UserProfile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data as UserProfile
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

// Check if role has elevated access (admin or above)
export function isElevatedRole(role: Role | null): boolean {
  if (!role) return false
  return role === ROLES.ADMIN
}

// Check if role is super admin
export function isSuperAdmin(role: Role | null): boolean {
  return role === ROLES.ADMIN
}

// Check if role can view all data (not house-restricted)
export function canViewAllData(role: Role | null): boolean {
  if (!role) return false
  return role === ROLES.ADMIN
}

// Check if role is house-restricted
export function isHouseRestricted(role: Role | null): boolean {
  return false
}
