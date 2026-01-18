import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Check which tables exist
    const tables = ['decision_log', 'huddle_log', 'action_menu']
    const status: Record<string, { exists: boolean; count?: number; error?: string }> = {}

    for (const table of tables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error && error.code === 'PGRST204') {
        // Table exists but is empty
        status[table] = { exists: true, count: 0 }
      } else if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
        status[table] = { exists: false, error: 'Table does not exist' }
      } else if (error) {
        status[table] = { exists: false, error: error.message }
      } else {
        status[table] = { exists: true, count: data?.length || 0 }
      }
    }

    return NextResponse.json({ success: true, tables: status })
  } catch (error) {
    console.error('Setup check error:', error)
    return NextResponse.json(
      { error: 'Failed to check database status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'create_tables') {
      // Create decision_log table
      const { error: decisionError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS decision_log (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            cycle_end_date date NOT NULL,
            due_date date,
            status text DEFAULT 'Pending',
            owner text,
            action_type text,
            title text,
            outcome_tag text,
            notes text,
            selected_actions jsonb,
            created_by uuid,
            created_at timestamp with time zone DEFAULT now()
          );
        `
      })

      if (decisionError && !decisionError.message.includes('already exists')) {
        // Try direct insert to check if table exists
        const { error: checkError } = await supabaseAdmin
          .from('decision_log')
          .select('id')
          .limit(1)

        if (checkError && checkError.code !== 'PGRST116') {
          return NextResponse.json({
            success: false,
            error: 'Cannot create tables via API. Please run the SQL migration manually in Supabase SQL Editor.',
            sqlFile: 'supabase/migrations/001_implementation_health_tables.sql'
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Tables checked/created successfully'
      })
    }

    if (action === 'seed_action_menu') {
      // Seed default action menu items
      const defaultActions = [
        { title: 'Parent Contact', category: 'Communication' },
        { title: 'Student Conference', category: 'Communication' },
        { title: 'Behavior Contract', category: 'Intervention' },
        { title: 'Mentorship Assignment', category: 'Support' },
        { title: 'Schedule Adjustment', category: 'Academic' },
        { title: 'Counselor Referral', category: 'Support' },
        { title: 'Recognition Award', category: 'Recognition' },
        { title: 'Leadership Opportunity', category: 'Recognition' },
      ]

      const { error } = await supabaseAdmin
        .from('action_menu')
        .upsert(defaultActions, { onConflict: 'title' })

      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Action menu seeded successfully'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Failed to execute setup action' },
      { status: 500 }
    )
  }
}
