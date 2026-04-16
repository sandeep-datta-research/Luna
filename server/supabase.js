import { createClient } from "@supabase/supabase-js";

let cachedClient = null;
let cachedConfigKey = "";

function readFirstEnv(...keys) {
  for (const key of keys) {
    const value = `${process.env[key] || ""}`.trim();
    if (value) return value;
  }
  return "";
}

function readSupabaseConfig() {
  const url = readFirstEnv(
    "SUPABASE_URL",
    "SUPABASE_PROJECT_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "VITE_SUPABASE_URL",
  );
  const key = readFirstEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
  );

  return { url, key };
}

export function getSupabaseAdmin() {
  const { url, key } = readSupabaseConfig();
  const configKey = `${url}::${key}`;
  if (!url || !key) return null;
  if (cachedClient && cachedConfigKey === configKey) return cachedClient;

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cachedConfigKey = configKey;

  return cachedClient;
}
