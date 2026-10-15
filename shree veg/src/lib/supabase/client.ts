import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-safe Supabase client.
 * Uses NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Safe to call from client components ('use client').
 * Governed strictly by PostgreSQL Row Level Security (RLS) policies.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
