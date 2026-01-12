'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: !isDemo,
    autoRefreshToken: !isDemo,
    detectSessionInUrl: !isDemo,
  },
})
