import { scopedClient } from '../supabaseClient.js';

/**
 * Protects /api/admin/* routes.
 *
 * Expects `Authorization: Bearer <supabase access token>` (the token the
 * React admin app got back from supabase.auth.signInWithPassword). We ask
 * Supabase to validate it and, if it's good, build a request-scoped
 * supabase client that carries the same token — every DB call after this
 * point runs as that admin user, so Postgres RLS naturally does the
 * authorization for us.
 */
export async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const supabase = scopedClient(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = data.user;
  req.supabase = supabase;
  next();
}
