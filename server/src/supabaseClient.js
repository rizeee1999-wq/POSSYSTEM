import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY. Copy server/.env.example to server/.env and fill it in.'
  );
}

/**
 * Client scoped to the anon (public) role. Row Level Security means this
 * can only ever read categories and *published* products — see schema.sql.
 * Safe to use for the public catalog endpoints.
 */
export const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

/**
 * Client scoped to whichever admin is making the request, by forwarding
 * their Supabase access token. Postgres RLS then evaluates the request as
 * that authenticated user, so admins see/change everything while we never
 * need a service-role key on the server at all.
 */
export function scopedClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
