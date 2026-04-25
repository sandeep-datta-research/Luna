const MAX_ROUTE_ENTRIES = 200;
const MAX_AUTH_FAILURES = 40;

const state = {
  startedAt: Date.now(),
  routeStats: new Map(),
  authFailureCounts: new Map(),
  recentAuthFailures: [],
  providerStats: new Map(),
  toolStats: new Map(),
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getRouteKey(req) {
  const method = normalizeText(req?.method || "GET").toUpperCase() || "GET";
  const path = normalizeText(req?.path || req?.originalUrl || "/") || "/";
  return `${method} ${path}`;
}

function trimRecentEntries(list, max) {
  while (list.length > max) {
    list.shift();
  }
}

export function trackRequest(req, res) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const key = getRouteKey(req);
    const existing = state.routeStats.get(key) || {
      count: 0,
      lastStatus: 0,
      lastSeenAt: "",
      avgMs: 0,
    };

    const durationMs = Math.max(0, Date.now() - startedAt);
    const nextCount = existing.count + 1;
    const avgMs = existing.avgMs > 0
      ? Number((((existing.avgMs * existing.count) + durationMs) / nextCount).toFixed(2))
      : durationMs;

    state.routeStats.set(key, {
      count: nextCount,
      lastStatus: Number(res.statusCode || 0),
      lastSeenAt: nowIso(),
      avgMs,
    });

    if (state.routeStats.size > MAX_ROUTE_ENTRIES) {
      const sorted = [...state.routeStats.entries()].sort((a, b) => {
        const aTime = Date.parse(a[1].lastSeenAt || 0) || 0;
        const bTime = Date.parse(b[1].lastSeenAt || 0) || 0;
        return bTime - aTime;
      });
      state.routeStats.clear();
      for (const [routeKey, value] of sorted.slice(0, MAX_ROUTE_ENTRIES)) {
        state.routeStats.set(routeKey, value);
      }
    }
  });
}

export function recordAuthFailure(type, req, details = "") {
  const key = normalizeText(type || "unknown") || "unknown";
  state.authFailureCounts.set(key, (state.authFailureCounts.get(key) || 0) + 1);
  state.recentAuthFailures.push({
    type: key,
    route: getRouteKey(req),
    details: normalizeText(details),
    at: nowIso(),
  });
  trimRecentEntries(state.recentAuthFailures, MAX_AUTH_FAILURES);
}

export function recordProviderAttempts(attempts = [], finalLlm = "", mode = "chat") {
  const seen = new Set();

  for (const attempt of Array.isArray(attempts) ? attempts : []) {
    const llm = normalizeText(attempt?.llm);
    if (!llm) continue;

    const existing = state.providerStats.get(llm) || {
      llm,
      modeCounts: {},
      successCount: 0,
      errorCount: 0,
      lastSuccessAt: "",
      lastErrorAt: "",
      lastError: "",
      lastStatus: 0,
    };

    existing.modeCounts[mode] = (existing.modeCounts[mode] || 0) + 1;
    const isSuccess = llm === finalLlm;
    if (isSuccess) {
      existing.successCount += 1;
      existing.lastSuccessAt = nowIso();
    } else {
      existing.errorCount += 1;
      existing.lastErrorAt = nowIso();
      existing.lastError = normalizeText(attempt?.error);
      existing.lastStatus = Number(attempt?.status || 0);
    }

    state.providerStats.set(llm, existing);
    seen.add(llm);
  }

  if (finalLlm && !seen.has(finalLlm)) {
    const existing = state.providerStats.get(finalLlm) || {
      llm: finalLlm,
      modeCounts: {},
      successCount: 0,
      errorCount: 0,
      lastSuccessAt: "",
      lastErrorAt: "",
      lastError: "",
      lastStatus: 0,
    };
    existing.modeCounts[mode] = (existing.modeCounts[mode] || 0) + 1;
    existing.successCount += 1;
    existing.lastSuccessAt = nowIso();
    state.providerStats.set(finalLlm, existing);
  }
}

export function recordToolResults(results = []) {
  for (const result of Array.isArray(results) ? results : []) {
    const key = normalizeText(result?.tool);
    if (!key) continue;
    const existing = state.toolStats.get(key) || {
      tool: key,
      count: 0,
      successCount: 0,
      failureCount: 0,
      lastRunAt: "",
      lastError: "",
    };
    existing.count += 1;
    if (result.ok) {
      existing.successCount += 1;
    } else {
      existing.failureCount += 1;
      existing.lastError = normalizeText(result.error);
    }
    existing.lastRunAt = nowIso();
    state.toolStats.set(key, existing);
  }
}

export function getDiagnosticsSnapshot({ db, providerStatus = [] } = {}) {
  const routeStats = [...state.routeStats.entries()]
    .map(([route, value]) => ({ route, ...value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const authFailures = [...state.authFailureCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const providerStats = [...state.providerStats.values()]
    .map((item) => ({
      ...item,
      configured: Array.isArray(providerStatus)
        ? Boolean(providerStatus.find((provider) => provider.llm === item.llm)?.configured)
        : null,
    }))
    .sort((a, b) => (b.successCount + b.errorCount) - (a.successCount + a.errorCount));

  const toolStats = [...state.toolStats.values()]
    .sort((a, b) => b.count - a.count);

  return {
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)),
    db,
    routes: routeStats,
    authFailures,
    recentAuthFailures: [...state.recentAuthFailures].reverse(),
    providerStats,
    toolStats,
  };
}
