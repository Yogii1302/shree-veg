import { createClient } from '@supabase/supabase-js';

/**
 * STRICTLY SERVER-ONLY Supabase Admin Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security (RLS).
 *
 * CRITICAL SECURITY RULE:
 * This file MUST NEVER be imported into a file with 'use client'.
 * It is solely for backend server routes (/api/*), atomic transactional procedures,
 * and admin background seed/reset jobs.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in server environment');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in server environment. This key is server-only.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
