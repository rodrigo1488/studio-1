import { createClient } from '@supabase/supabase-js';

// This file should only be imported in server-side code (API routes, server components, etc.)
// Never import this in client components!

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // Only throw error if we're in a server context
  if (typeof window === 'undefined') {
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
  }
  // In client context, just return undefined to prevent errors
}

// Server-side client with service role key for admin operations
// This client bypasses RLS and doesn't require JWT tokens
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js-admin',
        },
      },
    })
  : null;

// Regular client for server-side operations (uses anon key)
export const supabaseServer = supabaseUrl && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

