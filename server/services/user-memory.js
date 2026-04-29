import { getSupabaseAdmin } from "../supabase.js";
import { 
  getUserMemory as getDbUserMemory, 
  upsertUserMemory as upsertDbUserMemory,
  hasUserMemory as hasDbUserMemory
} from "../db-adapter.js";
import { DEFAULT_MEMORY } from "../config.js";
import { 
  normalizeStringArray, 
  normalizeResponseStyle, 
  normalizeLearningLevel 
} from "../utils/common.js";

function normalizeSupabaseUserId(value, fallbackSeed = "") {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw && !fallbackSeed) return "";
  const seed = raw || fallbackSeed;
  const safe = seed.replace(/\s+/g, " ").trim();
  return safe.slice(0, 160);
}

function normalizeMemoryPayload(payload = {}) {
  return {
    goals: normalizeStringArray(payload.goals),
    subjects: normalizeStringArray(payload.subjects),
    response_style: normalizeResponseStyle(payload.response_style),
    favorite_topics: normalizeStringArray(payload.favorite_topics),
    learning_level: normalizeLearningLevel(payload.learning_level),
  };
}

export async function fetchUserMemory(userId, email = "") {
  const supabase = getSupabaseAdmin();
  if (String(userId || "").startsWith("guest:")) return { ...DEFAULT_MEMORY };

  if (!supabase) {
    return getDbUserMemory(userId);
  }

  const normalizedId = normalizeSupabaseUserId(userId, email);
  if (!normalizedId) return getDbUserMemory(userId);

  try {
    const { data, error } = await supabase
      .from("users_memory")
      .select("goals,subjects,response_style,favorite_topics,learning_level")
      .eq("user_id", normalizedId)
      .maybeSingle();

    if (error || !data) return getDbUserMemory(userId);
    return {
      goals: normalizeStringArray(data.goals),
      subjects: normalizeStringArray(data.subjects),
      response_style: normalizeResponseStyle(data.response_style),
      favorite_topics: normalizeStringArray(data.favorite_topics),
      learning_level: normalizeLearningLevel(data.learning_level),
    };
  } catch {
    return getDbUserMemory(userId);
  }
}

export async function upsertUserMemory(userId, payload, email = "") {
  const supabase = getSupabaseAdmin();
  const normalizedId = normalizeSupabaseUserId(userId, email);
  if (!normalizedId) throw Object.assign(new Error("user_id is required."), { status: 400 });

  const normalizedPayload = normalizeMemoryPayload(payload);
  const fallbackSave = () => upsertDbUserMemory(userId, normalizedPayload);
  if (!supabase) return fallbackSave();

  const record = {
    user_id: normalizedId,
    ...normalizedPayload,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("users_memory")
      .upsert(record, { onConflict: "user_id" })
      .select("user_id, goals, subjects, response_style, favorite_topics, learning_level, updated_at")
      .single();

    if (error) {
      return fallbackSave();
    }

    return data;
  } catch {
    return fallbackSave();
  }
}

export async function hasUserMemory(userId, email = "") {
  const supabase = getSupabaseAdmin();
  const normalizedId = normalizeSupabaseUserId(userId, email);
  if (!normalizedId) return false;
  if (!supabase) return hasDbUserMemory(userId);

  try {
    const { data, error } = await supabase
      .from("users_memory")
      .select("id")
      .eq("user_id", normalizedId)
      .maybeSingle();

    if (error) return hasDbUserMemory(userId);
    return Boolean(data?.id);
  } catch {
    return hasDbUserMemory(userId);
  }
}
