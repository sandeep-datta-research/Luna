import axios from "axios";
import { normalizeText } from "./luna-utils.js";

const TOOL_NAMES = {
  CALCULATOR: "calculator",
  TEXT_ANALYZER: "text_analyzer",
  TEXT_SUMMARIZER: "text_summarizer",
  DATA_HELPER: "data_helper",
  API_FETCH: "api_fetch",
  KNOWLEDGE_LOOKUP: "knowledge_lookup",
  WEB_SEARCH: "web_search",
  NEWS: "news",
  CLOCK: "clock",
  TIMEZONE: "timezone",
};

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "if",
  "then",
  "so",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "it",
  "this",
  "that",
  "these",
  "those",
  "you",
  "i",
  "we",
  "they",
  "he",
  "she",
  "them",
  "as",
  "at",
  "by",
  "from",
  "your",
  "my",
  "our",
  "their",
  "me",
  "us",
  "about",
  "into",
  "over",
  "under",
  "can",
  "could",
  "should",
  "would",
  "do",
  "does",
  "did",
  "what",
  "who",
  "when",
  "where",
  "why",
  "how",
]);

const MAX_SNIPPET = 900;

function truncateText(value, max = MAX_SNIPPET) {
  const text = typeof value === "string" ? value : "";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function extractFirstUrl(message) {
  const text = normalizeText(message);
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : "";
}

function isPrivateHost(hostname) {
  const host = `${hostname || ""}`.trim().toLowerCase();
  if (!host) return true;

  if (host === "localhost" || host.endsWith(".local")) return true;
  if (host === "0.0.0.0" || host === "127.0.0.1" || host === "::1") return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("169.254.")) return true;

  const match = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (match) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  return false;
}

function extractQuotedText(message) {
  const match = `${message || ""}`.match(/"([\s\S]+?)"/);
  if (match && match[1]) return match[1].trim();
  return "";
}

function extractAfterColon(message) {
  const text = `${message || ""}`;
  const idx = text.indexOf(":");
  if (idx === -1) return "";
  return text.slice(idx + 1).trim();
}

function pickTextTarget(message) {
  return extractQuotedText(message) || extractAfterColon(message) || "";
}

function stripMarkdownFences(value) {
  const text = `${value || ""}`.trim();
  const fenced = text.match(/^```(?:json|csv|tsv|txt)?\n([\s\S]+?)\n```$/i);
  return fenced?.[1]?.trim() || text;
}

function shouldUseCalculator(message) {
  const text = normalizeText(message).toLowerCase();
  if (!text) return false;
  if (/(differentiat|derivative|integrat|limit|matrix|determinant|eigen|proof|solve equation|laplace|fourier|gradient|divergence|curl)/.test(text)) {
    return false;
  }
  if (/(calculate|compute|eval|evaluate|what is|solve)/.test(text)) return true;
  return /^[0-9+\-*/().^%\s]+$/.test(text);
}

function extractExpression(message) {
  const text = normalizeText(message);
  const direct = text.match(/(?:calculate|compute|eval(?:uate)?|what is|solve)\s+(.+)/i);
  if (direct && direct[1]) return direct[1].trim();
  if (/^[0-9+\-*/().^%\s]+$/.test(text)) return text;
  return "";
}

function transformExpression(expression) {
  let expr = `${expression || ""}`.toLowerCase().trim();
  if (!expr) return "";

  expr = expr.replace(/\bpi\b/g, "Math.PI");
  expr = expr.replace(/\be\b/g, "Math.E");
  expr = expr.replace(/\^/g, "**");
  expr = expr.replace(/\bsqrt\s*\(/g, "Math.sqrt(");
  expr = expr.replace(/\b(abs|round|floor|ceil|sin|cos|tan|log)\s*\(/g, "Math.$1(");
  expr = expr.replace(/\bln\s*\(/g, "Math.log(");

  const tokens = expr.match(/[A-Za-z_]+/g) || [];
  const allowed = new Set(["Math", "PI", "E", "sqrt", "abs", "round", "floor", "ceil", "sin", "cos", "tan", "log"]);

  for (const token of tokens) {
    if (token === "Math") continue;
    if (!allowed.has(token)) {
      return "";
    }
  }

  if (!/^[0-9+\-*/().,%\sA-Za-z_]+$/.test(expr)) return "";
  return expr;
}

function evaluateExpression(expression) {
  const safeExpr = transformExpression(expression);
  if (!safeExpr) return { ok: false, error: "Expression contains unsupported characters." };

  try {
    const result = Function(`"use strict"; return (${safeExpr});`)();
    if (typeof result !== "number" || Number.isNaN(result)) {
      return { ok: false, error: "Could not evaluate expression." };
    }
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: error.message || "Evaluation failed." };
  }
}

function shouldUseTextAnalyzer(message) {
  const text = normalizeText(message).toLowerCase();
  return /text analysis|analyze text|word count|character count|count words|analyze this/.test(text);
}

function analyzeText(payload) {
  const text = normalizeText(payload);
  if (!text) return null;

  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const wordCount = words.length;
  const charCount = text.length;
  const charCountNoSpaces = text.replace(/\s+/g, "").length;
  const avgWordLength = wordCount ? words.join("").length / wordCount : 0;

  const freq = new Map();
  for (const word of words) {
    const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normalized || STOPWORDS.has(normalized)) continue;
    freq.set(normalized, (freq.get(normalized) || 0) + 1);
  }

  const topWords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term, count]) => ({ term, count }));

  return {
    wordCount,
    charCount,
    charCountNoSpaces,
    sentenceCount: sentences.length,
    avgWordLength: Number(avgWordLength.toFixed(2)),
    topWords,
  };
}

function shouldUseTextSummarizer(message) {
  const text = normalizeText(message).toLowerCase();
  return /summari[sz]e|tl;dr|tldr|brief this|condense this/.test(text);
}

function summarizeText(payload) {
  const text = normalizeText(payload);
  if (!text) return null;

  const normalized = text.replace(/\s+/g, " ").trim();
  const sentences = normalized.match(/[^.!?]+[.!?]?/g)?.map((item) => item.trim()).filter(Boolean) || [];
  if (sentences.length === 0) return null;

  const words = normalized.toLowerCase().match(/[a-z0-9]+/g) || [];
  const freq = new Map();
  for (const word of words) {
    if (!word || STOPWORDS.has(word)) continue;
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  const ranked = sentences.map((sentence, index) => {
    const score = (sentence.toLowerCase().match(/[a-z0-9]+/g) || []).reduce(
      (sum, word) => sum + (freq.get(word) || 0),
      0,
    );
    return { sentence, index, score };
  });

  const summarySentences = ranked
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.min(3, sentences.length))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);

  const keyTerms = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);

  return {
    summary: summarySentences.join(" "),
    sentenceCount: sentences.length,
    keyTerms,
  };
}

function shouldUseDataHelper(message) {
  const text = normalizeText(message).toLowerCase();
  return /json|csv|tsv|comma-separated|parse this data|format this data|pretty print/.test(text);
}

function extractStructuredPayload(message) {
  return stripMarkdownFences(pickTextTarget(message));
}

function parseDelimitedRows(raw, delimiter) {
  const lines = `${raw || ""}`.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const rows = lines.map((line) => line.split(delimiter).map((item) => item.trim()));
  const headerWidth = rows[0].length;
  if (headerWidth < 2) return null;
  return rows.every((row) => row.length === headerWidth) ? rows : null;
}

function analyzeStructuredData(payload) {
  const raw = stripMarkdownFences(payload);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const type = Array.isArray(parsed) ? "array" : typeof parsed;
    const preview = JSON.stringify(parsed, null, 2);
    let shape = "";
    if (Array.isArray(parsed)) {
      const firstItem = parsed[0];
      shape = `Items: ${parsed.length}${firstItem && typeof firstItem === "object" ? `, fields: ${Object.keys(firstItem).slice(0, 8).join(", ")}` : ""}`;
    } else if (parsed && typeof parsed === "object") {
      shape = `Keys: ${Object.keys(parsed).slice(0, 12).join(", ")}`;
    }
    return {
      format: "json",
      type,
      shape,
      preview: truncateText(preview, 1400),
    };
  } catch {
    const csvRows = parseDelimitedRows(raw, ",");
    const tsvRows = csvRows ? null : parseDelimitedRows(raw, "\t");
    const rows = csvRows || tsvRows;
    if (!rows) return null;
    const headers = rows[0];
    const previewRows = rows.slice(1, 4).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
    return {
      format: csvRows ? "csv" : "tsv",
      rowCount: Math.max(0, rows.length - 1),
      columnCount: headers.length,
      headers,
      preview: truncateText(JSON.stringify(previewRows, null, 2), 1400),
    };
  }
}

function shouldUseApiFetch(message) {
  const text = normalizeText(message).toLowerCase();
  return (text.includes("fetch") || text.includes("api") || text.includes("request")) && /https?:\/\//i.test(text);
}

function shouldUseWebSearch(message) {
  const text = normalizeText(message).toLowerCase();
  return text.includes("search the web") || text.includes("web search") || text.startsWith("search ") || text.includes("google ");
}

function shouldUseNews(message) {
  const text = normalizeText(message).toLowerCase();
  return text.includes("news") || text.includes("headlines") || text.includes("latest updates");
}

function shouldUseClock(message) {
  const text = normalizeText(message).toLowerCase();
  return (
    text.includes("time") ||
    text.includes("date today") ||
    text.includes("today's date") ||
    text.includes("current date") ||
    text.includes("what day is it") ||
    text.includes("clock")
  );
}

function shouldUseTimezone(message) {
  const text = normalizeText(message).toLowerCase();
  return /time in|timezone|convert time|what time.* in|current time in/.test(text);
}

const TIMEZONE_ALIASES = {
  ist: "Asia/Kolkata",
  india: "Asia/Kolkata",
  delhi: "Asia/Kolkata",
  mumbai: "Asia/Kolkata",
  est: "America/New_York",
  edt: "America/New_York",
  newyork: "America/New_York",
  nyc: "America/New_York",
  pst: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  losangeles: "America/Los_Angeles",
  sf: "America/Los_Angeles",
  london: "Europe/London",
  uk: "Europe/London",
  gmt: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  cet: "Europe/Paris",
  tokyo: "Asia/Tokyo",
  jst: "Asia/Tokyo",
  singapore: "Asia/Singapore",
  sgt: "Asia/Singapore",
  sydney: "Australia/Sydney",
  aedt: "Australia/Sydney",
  utc: "UTC",
};

function normalizeTimezoneKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z/_]+/g, "");
}

function resolveTimezone(value) {
  const raw = normalizeText(value);
  if (!raw) return "";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return raw;
  } catch {
    const alias = TIMEZONE_ALIASES[normalizeTimezoneKey(raw)];
    if (!alias) return "";
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: alias });
      return alias;
    } catch {
      return "";
    }
  }
}

function extractTimezoneTarget(message) {
  const direct = normalizeText(message).match(/(?:time(?:zone)?|clock)\s+(?:in|for)\s+([A-Za-z/_ ]+)/i);
  if (direct?.[1]) return direct[1].trim();
  const secondary = normalizeText(message).match(/what time.* in\s+([A-Za-z/_ ]+)/i);
  return secondary?.[1]?.trim() || "";
}

function getTimezoneSnapshot(timeZone) {
  const now = new Date();
  return {
    timeZone,
    local: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZone,
      timeZoneName: "short",
    }).format(now),
    iso: now.toISOString(),
  };
}

function shouldUseKnowledgeLookup(message) {
  const text = normalizeText(message).toLowerCase();
  return text.includes("wikipedia") || text.includes("wiki") || text.includes("lookup");
}

function extractQueryAfter(text, keywords) {
  const normalized = normalizeText(text);
  for (const keyword of keywords) {
    const idx = normalized.toLowerCase().indexOf(keyword);
    if (idx >= 0) {
      return normalized.slice(idx + keyword.length).trim();
    }
  }
  return "";
}

function getClockSnapshot() {
  const now = new Date();
  return {
    iso: now.toISOString(),
    utc: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(now),
    local: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    }).format(now),
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      process.env.TZ ||
      "UTC",
  };
}

function decodeXmlEntities(value) {
  return `${value || ""}`
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripXmlTags(value) {
  return decodeXmlEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseRssItems(xml, limit = 5) {
  const source = `${xml || ""}`;
  const items = [...source.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, limit);
  return items.map((match) => {
    const block = match[1] || "";
    const title = stripXmlTags(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "Untitled");
    const link = stripXmlTags(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "");
    const sourceName =
      stripXmlTags(block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || "") || "Google News";
    const snippet = stripXmlTags(block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || "");

    return {
      title,
      link,
      source: sourceName,
      snippet: truncateText(snippet, 220),
    };
  });
}

function formatToolResult(result) {
  if (!result) return "";
  if (!result.ok) {
    return `${result.tool}: ${result.error || "Tool failed"}`;
  }

  switch (result.tool) {
    case TOOL_NAMES.CALCULATOR:
      return `Calculator result: ${result.output?.expression} = ${result.output?.value}`;
    case TOOL_NAMES.TEXT_ANALYZER:
      return [
        "Text analysis:",
        `- Words: ${result.output.wordCount}`,
        `- Characters: ${result.output.charCount}`,
        `- Characters (no spaces): ${result.output.charCountNoSpaces}`,
        `- Sentences: ${result.output.sentenceCount}`,
        `- Avg word length: ${result.output.avgWordLength}`,
        result.output.topWords?.length
          ? `- Top words: ${result.output.topWords.map((w) => `${w.term} (${w.count})`).join(", ")}`
          : "- Top words: n/a",
      ].join("\n");
    case TOOL_NAMES.TEXT_SUMMARIZER:
      return [
        "Summary:",
        result.output.summary,
        result.output.keyTerms?.length ? `Key terms: ${result.output.keyTerms.join(", ")}` : "",
      ].filter(Boolean).join("\n");
    case TOOL_NAMES.DATA_HELPER:
      return [
        `Data helper (${result.output.format}):`,
        result.output.shape || "",
        result.output.rowCount !== undefined ? `Rows: ${result.output.rowCount}, Columns: ${result.output.columnCount}` : "",
        result.output.headers?.length ? `Headers: ${result.output.headers.join(", ")}` : "",
        `Preview:\n${result.output.preview}`,
      ].filter(Boolean).join("\n");
    case TOOL_NAMES.API_FETCH:
      return [
        `API fetch (${result.output.status}):`,
        truncateText(result.output.preview || "No content"),
      ].join("\n");
    case TOOL_NAMES.KNOWLEDGE_LOOKUP:
      return [
        `Knowledge lookup: ${result.output.title}`,
        truncateText(result.output.summary || "No summary"),
        result.output.url ? `Source: ${result.output.url}` : "",
      ].filter(Boolean).join("\n");
    case TOOL_NAMES.WEB_SEARCH:
      return [
        "Web search results:",
        ...result.output.results.map((item, index) => `${index + 1}. ${item.title} � ${item.link}`),
      ].join("\n");
    case TOOL_NAMES.NEWS:
      return [
        "News results:",
        ...result.output.results.map((item, index) => `${index + 1}. ${item.title} (${item.source}) - ${item.link}`),
      ].join("\n");
    case TOOL_NAMES.CLOCK:
      return [
        "Live clock:",
        `- Local: ${result.output.local}`,
        `- UTC: ${result.output.utc}`,
        `- ISO: ${result.output.iso}`,
        `- Time zone: ${result.output.timezone}`,
      ].join("\n");
    case TOOL_NAMES.TIMEZONE:
      return [
        `Time in ${result.output.timeZone}:`,
        `- Local: ${result.output.local}`,
        `- ISO: ${result.output.iso}`,
      ].join("\n");
    default:
      return truncateText(JSON.stringify(result.output || {}));
  }
}

export function planToolCalls(message, options = {}) {
  const calls = [];
  const raw = normalizeText(message);
  if (!raw) return calls;
  const researchMode = Boolean(options?.researchMode);

  if (shouldUseCalculator(raw)) {
    const expression = extractExpression(raw);
    if (expression) {
      calls.push({ tool: TOOL_NAMES.CALCULATOR, input: { expression } });
    }
  }

  if (shouldUseTextAnalyzer(raw)) {
    const textTarget = pickTextTarget(raw);
    if (textTarget) {
      calls.push({ tool: TOOL_NAMES.TEXT_ANALYZER, input: { text: textTarget } });
    }
  }

  if (shouldUseTextSummarizer(raw)) {
    const textTarget = pickTextTarget(raw);
    if (textTarget) {
      calls.push({ tool: TOOL_NAMES.TEXT_SUMMARIZER, input: { text: textTarget } });
    }
  }

  if (shouldUseDataHelper(raw)) {
    const payload = extractStructuredPayload(raw);
    if (payload) {
      calls.push({ tool: TOOL_NAMES.DATA_HELPER, input: { data: payload } });
    }
  }

  if (shouldUseApiFetch(raw)) {
    const url = extractFirstUrl(raw);
    if (url) {
      calls.push({ tool: TOOL_NAMES.API_FETCH, input: { url } });
    }
  }

  if (shouldUseWebSearch(raw)) {
    const query = extractQueryAfter(raw, ["search the web", "web search", "search", "google"]) || raw;
    if (query) {
      calls.push({ tool: TOOL_NAMES.WEB_SEARCH, input: { query } });
    }
  }

  if (shouldUseNews(raw)) {
    const query = extractQueryAfter(raw, ["news", "headlines", "latest"]) || "";
    calls.push({ tool: TOOL_NAMES.NEWS, input: { query } });
  }

  if (shouldUseClock(raw)) {
    calls.push({ tool: TOOL_NAMES.CLOCK, input: {} });
  }

  if (shouldUseTimezone(raw)) {
    const target = resolveTimezone(extractTimezoneTarget(raw));
    if (target) {
      calls.push({ tool: TOOL_NAMES.TIMEZONE, input: { timeZone: target } });
    }
  }

  if (shouldUseKnowledgeLookup(raw)) {
    const query = extractQueryAfter(raw, ["wikipedia", "wiki", "lookup"]) || "";
    if (query) {
      calls.push({ tool: TOOL_NAMES.KNOWLEDGE_LOOKUP, input: { query } });
    }
  }

  if (researchMode) {
    const query = raw;
    if (!calls.find((item) => item.tool === TOOL_NAMES.WEB_SEARCH)) {
      calls.push({ tool: TOOL_NAMES.WEB_SEARCH, input: { query } });
    }
    if (!calls.find((item) => item.tool === TOOL_NAMES.NEWS)) {
      calls.push({ tool: TOOL_NAMES.NEWS, input: { query } });
    }
  }

  return calls.slice(0, 3);
}

export async function executeToolCalls(toolCalls) {
  const results = [];

  for (const call of toolCalls) {
    if (!call || !call.tool) continue;

    try {
      switch (call.tool) {
        case TOOL_NAMES.CALCULATOR: {
          const expression = call.input?.expression || "";
          const evaluated = evaluateExpression(expression);
          results.push({
            tool: TOOL_NAMES.CALCULATOR,
            ok: evaluated.ok,
            input: call.input,
            output: evaluated.ok ? { expression, value: evaluated.result } : null,
            error: evaluated.ok ? null : evaluated.error,
          });
          break;
        }
        case TOOL_NAMES.TEXT_ANALYZER: {
          const analysis = analyzeText(call.input?.text || "");
          results.push({
            tool: TOOL_NAMES.TEXT_ANALYZER,
            ok: Boolean(analysis),
            input: call.input,
            output: analysis || null,
            error: analysis ? null : "No text provided for analysis.",
          });
          break;
        }
        case TOOL_NAMES.TEXT_SUMMARIZER: {
          const summary = summarizeText(call.input?.text || "");
          results.push({
            tool: TOOL_NAMES.TEXT_SUMMARIZER,
            ok: Boolean(summary),
            input: call.input,
            output: summary || null,
            error: summary ? null : "No text provided for summarization.",
          });
          break;
        }
        case TOOL_NAMES.DATA_HELPER: {
          const analysis = analyzeStructuredData(call.input?.data || "");
          results.push({
            tool: TOOL_NAMES.DATA_HELPER,
            ok: Boolean(analysis),
            input: call.input,
            output: analysis || null,
            error: analysis ? null : "Unsupported or empty JSON/CSV data.",
          });
          break;
        }
        case TOOL_NAMES.API_FETCH: {
          const url = call.input?.url || "";
          let parsed;
          try {
            parsed = new URL(url);
          } catch {
            results.push({ tool: TOOL_NAMES.API_FETCH, ok: false, input: call.input, output: null, error: "Invalid URL." });
            break;
          }
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            results.push({ tool: TOOL_NAMES.API_FETCH, ok: false, input: call.input, output: null, error: "Unsupported URL scheme." });
            break;
          }
          if (isPrivateHost(parsed.hostname)) {
            results.push({ tool: TOOL_NAMES.API_FETCH, ok: false, input: call.input, output: null, error: "Blocked host for security reasons." });
            break;
          }
          const response = await axios.get(url, {
            timeout: 10000,
            maxContentLength: 1_000_000,
            validateStatus: () => true,
          });
          let preview = "";
          if (typeof response.data === "string") {
            preview = response.data;
          } else {
            preview = JSON.stringify(response.data, null, 2);
          }
          results.push({
            tool: TOOL_NAMES.API_FETCH,
            ok: response.status >= 200 && response.status < 400,
            input: call.input,
            output: {
              status: response.status,
              contentType: response.headers?.["content-type"] || "",
              preview: truncateText(preview),
            },
            error: response.status >= 400 ? `Request failed (${response.status})` : null,
          });
          break;
        }
        case TOOL_NAMES.WEB_SEARCH: {
          const apiKey = (process.env.SERPER_API_KEY || "").trim();
          if (!apiKey) {
            results.push({ tool: TOOL_NAMES.WEB_SEARCH, ok: false, input: call.input, output: null, error: "SERPER_API_KEY is not configured." });
            break;
          }
          if (!call.input?.query) {
            results.push({ tool: TOOL_NAMES.WEB_SEARCH, ok: false, input: call.input, output: null, error: "Search query is empty." });
            break;
          }
          const response = await axios.post(
            "https://google.serper.dev/search",
            { q: call.input?.query || "" },
            {
              headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
              },
              timeout: 10000,
            },
          );
          const items = Array.isArray(response.data?.organic) ? response.data.organic.slice(0, 5) : [];
          results.push({
            tool: TOOL_NAMES.WEB_SEARCH,
            ok: true,
            input: call.input,
            output: {
              results: items.map((item) => ({
                title: item.title || "Untitled",
                link: item.link || "",
                snippet: item.snippet || "",
              })),
            },
            error: null,
          });
          break;
        }
        case TOOL_NAMES.NEWS: {
          const apiKey = (process.env.NEWS_API_KEY || "").trim();
          const query = `${call.input?.query || ""}`.trim();
          let articles = [];

          if (apiKey) {
            const encodedQuery = encodeURIComponent(query);
            const url = query
              ? `https://newsapi.org/v2/top-headlines?q=${encodedQuery}&pageSize=5&language=en&apiKey=${apiKey}`
              : `https://newsapi.org/v2/top-headlines?language=en&pageSize=5&apiKey=${apiKey}`;
            const response = await axios.get(url, { timeout: 10000 });
            articles = Array.isArray(response.data?.articles) ? response.data.articles.slice(0, 5) : [];
          } else {
            const rssUrl = query
              ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
              : "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en";
            const response = await axios.get(rssUrl, { timeout: 10000, responseType: "text" });
            articles = parseRssItems(response.data, 5);
          }

          results.push({
            tool: TOOL_NAMES.NEWS,
            ok: true,
            input: call.input,
            output: {
              results: articles.map((article) => ({
                title: article.title || "Untitled",
                link: article.url || article.link || "",
                source: article.source?.name || article.source || "News",
                snippet: article.description || article.snippet || "",
              })),
            },
            error: null,
          });
          break;
        }
        case TOOL_NAMES.CLOCK: {
          results.push({
            tool: TOOL_NAMES.CLOCK,
            ok: true,
            input: call.input,
            output: getClockSnapshot(),
            error: null,
          });
          break;
        }
        case TOOL_NAMES.TIMEZONE: {
          const timeZone = resolveTimezone(call.input?.timeZone || "");
          if (!timeZone) {
            results.push({ tool: TOOL_NAMES.TIMEZONE, ok: false, input: call.input, output: null, error: "Timezone could not be resolved." });
            break;
          }
          results.push({
            tool: TOOL_NAMES.TIMEZONE,
            ok: true,
            input: call.input,
            output: getTimezoneSnapshot(timeZone),
            error: null,
          });
          break;
        }
        case TOOL_NAMES.KNOWLEDGE_LOOKUP: {
          const query = call.input?.query || "";
          if (!query) {
            results.push({ tool: TOOL_NAMES.KNOWLEDGE_LOOKUP, ok: false, input: call.input, output: null, error: "Lookup query is empty." });
            break;
          }
          const encoded = encodeURIComponent(query);
          const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
          const response = await axios.get(url, { timeout: 10000, validateStatus: () => true });
          if (response.status >= 400) {
            results.push({ tool: TOOL_NAMES.KNOWLEDGE_LOOKUP, ok: false, input: call.input, output: null, error: `Lookup failed (${response.status})` });
            break;
          }
          results.push({
            tool: TOOL_NAMES.KNOWLEDGE_LOOKUP,
            ok: true,
            input: call.input,
            output: {
              title: response.data?.title || query,
              summary: response.data?.extract || "",
              url: response.data?.content_urls?.desktop?.page || "",
            },
            error: null,
          });
          break;
        }
        default:
          results.push({ tool: call.tool, ok: false, input: call.input, output: null, error: "Unknown tool." });
      }
    } catch (error) {
      results.push({
        tool: call.tool,
        ok: false,
        input: call.input,
        output: null,
        error: error?.message || "Tool failed.",
      });
    }
  }

  return results;
}

export function formatToolResults(results) {
  if (!Array.isArray(results) || results.length === 0) return "";
  const okResults = results.filter((item) => item && item.ok);
  if (okResults.length === 0) return "";
  const blocks = okResults.map(formatToolResult).filter(Boolean);
  return blocks.join("\n\n");
}

export function buildToolSystemPrompt(toolSummary) {
  if (!toolSummary) return "";
  return `Tool results are available. Use them to answer the user.\n\n${toolSummary}`;
}

export { TOOL_NAMES };
