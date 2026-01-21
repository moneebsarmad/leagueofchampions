import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  getUserNotifications,
  markNotificationRead,
  sendDailyReminders,
} from '@/backend/services/notificationService'

/**
 * GET /api/notifications
 * Get notifications for the current user
 *
 * Query params:
 * - unread_only: 'true' to only get unread notifications
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'

    const notifications = await getUserNotifications(user.id, unreadOnly)

    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read
 *
 * Body:
 * - notification_id: string - mark single notification as read
 * - mark_all_read: boolean - mark all notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    if (body.notification_id) {
      await markNotificationRead(body.notification_id)
      return NextResponse.json({ success: true })
    }

    if (body.mark_all_read) {
      // Mark all as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Trigger notification sending (for cron or admin use)
 *
 * Body:
 * - action: 'send_daily_reminders'
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or admin role
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Check if user is admin
      const supabase = await createServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()

    if (body.action === 'send_daily_reminders') {
      const result = await sendDailyReminders()
      return NextResponse.json({
        success: true,
        data: result,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing notification action:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
