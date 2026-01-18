import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: !isDemo,
    autoRefreshToken: !isDemo,
    detectSessionInUrl: !isDemo,
  },
});
