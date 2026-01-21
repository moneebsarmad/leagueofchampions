import { NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/auth/adminCheck'
import { getBehavioralDomains } from '@/backend/services/levelAService'

/**
 * GET /api/interventions/domains
 * Returns all active behavioral domains with their repair menus
 * Admin only
 */
export async function GET() {
  try {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) {
      return adminCheck.error
    }

    const domains = await getBehavioralDomains()

    return NextResponse.json({
      success: true,
      data: domains,
    })
  } catch (error) {
    console.error('Error fetching domains:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch behavioral domains' },
      { status: 500 }
    )
  }
}
