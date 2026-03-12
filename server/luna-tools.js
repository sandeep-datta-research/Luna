import axios from "axios";
import { normalizeText } from "./luna-utils.js";

const TOOL_NAMES = {
  CALCULATOR: "calculator",
  TEXT_ANALYZER: "text_analyzer",
  API_FETCH: "api_fetch",
  KNOWLEDGE_LOOKUP: "knowledge_lookup",
  WEB_SEARCH: "web_search",
  NEWS: "news",
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
        ...result.output.results.map((item, index) => `${index + 1}. ${item.title} (${item.source}) � ${item.link}`),
      ].join("\n");
    default:
      return truncateText(JSON.stringify(result.output || {}));
  }
}

export function planToolCalls(message) {
  const calls = [];
  const raw = normalizeText(message);
  if (!raw) return calls;

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

  if (shouldUseKnowledgeLookup(raw)) {
    const query = extractQueryAfter(raw, ["wikipedia", "wiki", "lookup"]) || "";
    if (query) {
      calls.push({ tool: TOOL_NAMES.KNOWLEDGE_LOOKUP, input: { query } });
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
          if (!apiKey) {
            results.push({ tool: TOOL_NAMES.NEWS, ok: false, input: call.input, output: null, error: "NEWS_API_KEY is not configured." });
            break;
          }
          const query = encodeURIComponent(call.input?.query || "");
          const url = `https://newsapi.org/v2/top-headlines?q=${query}&pageSize=5&language=en&apiKey=${apiKey}`;
          const response = await axios.get(url, { timeout: 10000 });
          const articles = Array.isArray(response.data?.articles) ? response.data.articles.slice(0, 5) : [];
          results.push({
            tool: TOOL_NAMES.NEWS,
            ok: true,
            input: call.input,
            output: {
              results: articles.map((article) => ({
                title: article.title || "Untitled",
                link: article.url || "",
                source: article.source?.name || "News",
              })),
            },
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
