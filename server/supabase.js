import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

let cachedClient = null;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  cachedClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedClient;
}
