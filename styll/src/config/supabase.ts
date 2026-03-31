import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createMockSupabase } from '../lib/mock/client'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

const isDemo = !supabaseUrl
  || supabaseUrl === 'https://your-project-id.supabase.co'
  || supabaseUrl.includes('placeholder')

export const supabase: SupabaseClient = isDemo
  ? (createMockSupabase() as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })

export default supabase
