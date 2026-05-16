import axios from "axios";
import { 
  GEMINI_API_KEY, 
  GEMINI_MODEL, 
  GROQ_API_KEY, 
  GROQ_MODEL, 
  HUGGINGFACE_API_KEY, 
  HUGGINGFACE_MODEL, 
  LUNA_PROVIDER_TIMEOUT_MS, 
  LUNA_STREAM_TIMEOUT_MS, 
  MANUALLY_DISABLED_PROVIDERS, 
  NVIDIA_API_KEY, 
  NVIDIA_GLM_MODEL, 
  NVIDIA_QWEN_MODEL, 
  OPENROUTER_API_KEY, 
  OPENROUTER_GLM45_AIR_MODEL, 
  OPENROUTER_MODEL, 
  ZAI_API_KEY, 
  ZAI_API_URL, 
  ZAI_GLM_MODEL 
} from "../config.js";
import { 
  streamTextChunks, 
  toPlainPrompt 
} from "../utils/common.js";

function normalizeUsageValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function withUsage(reply, usage = null) {
  return {
    reply: typeof reply === "string" ? reply.trim() : "",
    usage: usage && typeof usage === "object" ? usage : null,
  };
}

function normalizeOpenAiCompatibleUsage(raw, provider) {
  if (!raw || typeof raw !== "object") return null;

  const promptTokens = normalizeUsageValue(raw.prompt_tokens);
  const completionTokens = normalizeUsageValue(raw.completion_tokens);
  const totalTokens = normalizeUsageValue(raw.total_tokens) || promptTokens + completionTokens;
  const reasoningTokens = normalizeUsageValue(
    raw.completion_tokens_details?.reasoning_tokens ?? raw.output_tokens_details?.reasoning_tokens,
  );
  const cachedPromptTokens = normalizeUsageValue(raw.prompt_tokens_details?.cached_tokens);

  if (!promptTokens && !completionTokens && !totalTokens && !reasoningTokens && !cachedPromptTokens) {
    return null;
  }

  return {
    provider,
    promptTokens,
    completionTokens,
    totalTokens,
    reasoningTokens,
    cachedPromptTokens,
  };
}

function normalizeGeminiUsage(raw) {
  if (!raw || typeof raw !== "object") return null;

  const promptTokens = normalizeUsageValue(raw.promptTokenCount);
  const completionTokens = normalizeUsageValue(raw.candidatesTokenCount);
  const totalTokens = normalizeUsageValue(raw.totalTokenCount) || promptTokens + completionTokens;
  const reasoningTokens = normalizeUsageValue(raw.thoughtsTokenCount);

  if (!promptTokens && !completionTokens && !totalTokens && !reasoningTokens) {
    return null;
  }

  return {
    provider: "gemini",
    promptTokens,
    completionTokens,
    totalTokens,
    reasoningTokens,
    cachedPromptTokens: 0,
  };
}

async function requestGroq(messages, detailedMode) {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      max_completion_tokens: detailedMode ? 900 : 600,
      top_p: 1,
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: LUNA_PROVIDER_TIMEOUT_MS,
    },
  );

  return withUsage(
    response.data?.choices?.[0]?.message?.content?.trim() || "",
    normalizeOpenAiCompatibleUsage(response.data?.usage, "gpt"),
  );
}

async function requestOpenRouter(messages, detailedMode, model = OPENROUTER_MODEL) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      max_tokens: detailedMode ? 900 : 600,
      top_p: 1,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: LUNA_PROVIDER_TIMEOUT_MS,
    },
  );

  return withUsage(
    response.data?.choices?.[0]?.message?.content?.trim() || "",
    normalizeOpenAiCompatibleUsage(response.data?.usage, model),
  );
}

async function requestNvidiaModel(messages, detailedMode, model) {
  const response = await axios.post(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      model,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      top_p: 1,
      max_tokens: detailedMode ? 1800 : 1024,
      stream: false,
    },
    {
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: LUNA_PROVIDER_TIMEOUT_MS,
    },
  );

  return withUsage(
    response.data?.choices?.[0]?.message?.content?.trim() || "",
    normalizeOpenAiCompatibleUsage(response.data?.usage, model),
  );
}

async function requestNvidiaGlm(messages, detailedMode) {
  return requestNvidiaModel(messages, detailedMode, NVIDIA_GLM_MODEL);
}

function toGeminiContents(messages) {
  return (messages || [])
    .filter((m) => m?.role !== "system" && typeof m?.content === "string")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

async function requestGemini(messages, detailedMode) {
  const systemText = (messages || [])
    .filter((m) => m?.role === "system" && typeof m?.content === "string")
    .map((m) => m.content)
    .join("\n\n");

  const body = {
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature: detailedMode ? 0.75 : 0.45,
      topP: 1,
      maxOutputTokens: detailedMode ? 900 : 600,
    },
  };

  if (systemText) {
    body.systemInstruction = { role: "system", parts: [{ text: systemText }] };
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(GEMINI_MODEL) +
    ":generateContent?key=" +
    GEMINI_API_KEY;

  const response = await axios.post(url, body, {
    headers: { "Content-Type": "application/json" },
    timeout: LUNA_PROVIDER_TIMEOUT_MS,
  });

  const parts = response.data?.candidates?.[0]?.content?.parts;
  const reply = Array.isArray(parts)
    ? parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim()
    : "";

  return withUsage(reply, normalizeGeminiUsage(response.data?.usageMetadata));
}

async function requestZai(messages, detailedMode, model = ZAI_GLM_MODEL) {
  const apiKey = ZAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("Z.AI API key is not configured"), { status: 503 });
  }

  const response = await axios.post(
    ZAI_API_URL,
    {
      model,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      max_tokens: detailedMode ? 900 : 600,
      top_p: 1,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: LUNA_PROVIDER_TIMEOUT_MS,
    },
  );

  return withUsage(
    response.data?.choices?.[0]?.message?.content?.trim() || "",
    normalizeOpenAiCompatibleUsage(response.data?.usage, model),
  );
}

async function requestHuggingFace(messages, detailedMode) {
  const apiKey = HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("HuggingFace API key is not configured"), { status: 503 });
  }

  const prompt = toPlainPrompt(messages);
  const response = await axios.post(
    `https://api-inference.huggingface.co/models/${encodeURIComponent(HUGGINGFACE_MODEL)}`,
    {
      inputs: prompt,
      parameters: {
        max_new_tokens: detailedMode ? 900 : 260,
        temperature: detailedMode ? 0.75 : 0.45,
        top_p: 1,
        return_full_text: false,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: LUNA_STREAM_TIMEOUT_MS,
    },
  );

  if (Array.isArray(response.data)) {
    return withUsage(response.data?.[0]?.generated_text?.trim() || "", null);
  }

  return withUsage(response.data?.generated_text?.trim() || "", null);
}

async function streamOpenAICompatible({ url, headers, body, onToken, signal }) {
  const response = await axios.post(
    url,
    { ...body, stream: true, stream_options: { include_usage: true } },
    {
      headers,
      responseType: "stream",
      timeout: LUNA_STREAM_TIMEOUT_MS,
      signal,
    },
  );

  return new Promise((resolve, reject) => {
    let reply = "";
    let buffer = "";
    let done = false;
    let usage = null;

    const finish = () => {
      if (done) return;
      done = true;
      resolve(withUsage(reply, usage));
    };

    const fail = (error) => {
      if (done) return;
      done = true;
      reject(error);
    };

    response.data.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";

      for (const part of parts) {
        const cleaned = part.replace(/\r/g, "").trim();
        if (!cleaned) continue;

        const lines = cleaned.split("\n");
        const dataLines = [];
        for (const line of lines) {
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const payload = dataLines.join("");
        if (!payload) continue;

        if (payload === "[DONE]") {
          finish();
          return;
        }

        let parsed = null;
        try {
          parsed = JSON.parse(payload);
        } catch {
          parsed = null;
        }

        if (parsed?.error) {
          const error = new Error(parsed.error?.message || "Stream error");
          error.status = parsed.error?.code || 500;
          error.responseData = parsed;
          fail(error);
          return;
        }

        const usagePayload = normalizeOpenAiCompatibleUsage(parsed?.usage, body.model);
        if (usagePayload) {
          usage = usagePayload;
        }

        const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content;
        if (delta) {
          reply += delta;
          if (typeof onToken === "function") {
            onToken(delta);
          }
        }
      }
    });

    response.data.on("end", () => finish());
    response.data.on("error", (error) => fail(error));
  });
}

async function streamGroq(messages, detailedMode, onToken, signal) {
  return streamOpenAICompatible({
    url: "https://api.groq.com/openai/v1/chat/completions",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: {
      model: GROQ_MODEL,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      max_completion_tokens: detailedMode ? 900 : 600,
      top_p: 1,
    },
    onToken,
    signal,
  });
}

async function streamOpenRouter(messages, detailedMode, model, onToken, signal) {
  return streamOpenAICompatible({
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: {
      model,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      max_tokens: detailedMode ? 900 : 600,
      top_p: 1,
    },
    onToken,
    signal,
  });
}

async function streamGemini(messages, detailedMode, onToken, signal) {
  const systemText = (messages || [])
    .filter((m) => m?.role === "system" && typeof m?.content === "string")
    .map((m) => m.content)
    .join("\n\n");

  const body = {
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature: detailedMode ? 0.75 : 0.45,
      topP: 1,
      maxOutputTokens: detailedMode ? 900 : 600,
    },
  };

  if (systemText) {
    body.systemInstruction = { role: "system", parts: [{ text: systemText }] };
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(GEMINI_MODEL) +
    ":streamGenerateContent?key=" +
    GEMINI_API_KEY;

  const response = await axios.post(url, body, {
    headers: { "Content-Type": "application/json" },
    responseType: "stream",
    timeout: LUNA_STREAM_TIMEOUT_MS,
    signal,
  });

  return new Promise((resolve, reject) => {
    let reply = "";
    let buffer = "";
    let done = false;
    let usage = null;

    const finish = () => {
      if (done) return;
      done = true;
      resolve(withUsage(reply, usage));
    };

    const fail = (error) => {
      if (done) return;
      done = true;
      reject(error);
    };

    response.data.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";

      for (const part of parts) {
        const cleaned = part.replace(/\r/g, "").trim();
        if (!cleaned) continue;

        const lines = cleaned.split("\n");
        const dataLines = [];
        for (const line of lines) {
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const payload = dataLines.join("");
        if (!payload) continue;
        if (payload === "[DONE]") {
          finish();
          return;
        }

        let parsed = null;
        try {
          parsed = JSON.parse(payload);
        } catch {
          parsed = null;
        }

        const usagePayload = normalizeGeminiUsage(parsed?.usageMetadata);
        if (usagePayload) {
          usage = usagePayload;
        }

        const partsText = parsed?.candidates?.[0]?.content?.parts;
        const textChunk = Array.isArray(partsText)
          ? partsText.map((p) => (typeof p?.text === "string" ? p.text : "")).join("")
          : "";

        if (textChunk) {
          reply += textChunk;
          if (typeof onToken === "function") {
            onToken(textChunk);
          }
        }
      }
    });

    response.data.on("end", () => finish());
    response.data.on("error", (error) => fail(error));
  });
}

async function streamHuggingFace(messages, detailedMode, onToken) {
  const result = await requestHuggingFace(messages, detailedMode);
  if (result.reply) {
    streamTextChunks(result.reply, onToken);
  }
  return result;
}

async function streamViaFallback(run, onToken) {
  const result = await run();
  if (result.reply) {
    streamTextChunks(result.reply, onToken);
  }
  return result;
}

export function buildProviders(messages, detailedMode, streamSignal) {
  return [
    {
      llm: "gemini",
      enabled: Boolean(GEMINI_API_KEY) && !MANUALLY_DISABLED_PROVIDERS.has("gemini"),
      run: () => requestGemini(messages, detailedMode),
      stream: (onToken) => streamGemini(messages, detailedMode, onToken, streamSignal),
    },
    {
      llm: "gpt",
      enabled: Boolean(GROQ_API_KEY) && !MANUALLY_DISABLED_PROVIDERS.has("gpt"),
      run: () => requestGroq(messages, detailedMode),
      stream: (onToken) => streamGroq(messages, detailedMode, onToken, streamSignal),
    },
    {
      llm: "glm43",
      enabled: Boolean(NVIDIA_API_KEY) && !MANUALLY_DISABLED_PROVIDERS.has("glm43"),
      run: () => requestNvidiaGlm(messages, detailedMode),
      stream: (onToken) => streamViaFallback(() => requestNvidiaGlm(messages, detailedMode), onToken),
    },
    {
      llm: "nvidia-qwen",
      enabled: Boolean(NVIDIA_API_KEY) && !MANUALLY_DISABLED_PROVIDERS.has("nvidia-qwen"),
      run: () => requestNvidiaModel(messages, detailedMode, NVIDIA_QWEN_MODEL),
      stream: (onToken) => streamViaFallback(() => requestNvidiaModel(messages, detailedMode, NVIDIA_QWEN_MODEL), onToken),
    },
    {
      llm: "zai-glm47",
      enabled: Boolean(ZAI_API_KEY) && !MANUALLY_DISABLED_PROVIDERS.has("zai-glm47"),
      run: () => requestZai(messages, detailedMode, ZAI_GLM_MODEL),
      stream: (onToken) => streamViaFallback(() => requestZai(messages, detailedMode, ZAI_GLM_MODEL), onToken),
    },
    {
      llm: "glm45air",
      enabled: Boolean(OPENROUTER_API_KEY) && !MANUALLY_DISABLED_PROVIDERS.has("glm45air"),
      run: () => requestOpenRouter(messages, detailedMode, OPENROUTER_GLM45_AIR_MODEL),
      stream: (onToken) => streamOpenRouter(messages, detailedMode, OPENROUTER_GLM45_AIR_MODEL, onToken, streamSignal),
    },
    {
      llm: "nvidia",
      enabled: Boolean(OPENROUTER_API_KEY) && !MANUALLY_DISABLED_PROVIDERS.has("nvidia"),
      run: () => requestOpenRouter(messages, detailedMode, OPENROUTER_MODEL),
      stream: (onToken) => streamOpenRouter(messages, detailedMode, OPENROUTER_MODEL, onToken, streamSignal),
    },
    {
      llm: "hf",
      enabled: Boolean(HUGGINGFACE_API_KEY) && !MANUALLY_DISABLED_PROVIDERS.has("hf"),
      run: () => requestHuggingFace(messages, detailedMode),
      stream: (onToken) => streamHuggingFace(messages, detailedMode, onToken),
    },
  ];
}

export function buildProviderRunners(messages, detailedMode, streamSignal) {
  const providers = buildProviders(messages, detailedMode, streamSignal);
  return providers.reduce((acc, provider) => {
    acc[provider.llm] = provider;
    return acc;
  }, {});
}

const MODEL_ALIAS_MAP = {
  "luna-2.5": ["gpt", "gemini", "glm45air"],
  "luna-2.1": ["gemini", "gpt", "glm43"],
  "luna-reasoning": ["gpt", "glm45air", "glm43"],
};

export function resolveRequestedModel(requestedModel, providerRunners) {
  const key = typeof requestedModel === "string" ? requestedModel.trim().toLowerCase() : "";
  if (!key) return "";
  if (providerRunners?.[key]?.enabled) return key;

  const aliases = MODEL_ALIAS_MAP[key];
  if (Array.isArray(aliases)) {
    for (const candidate of aliases) {
      if (providerRunners?.[candidate]?.enabled) return candidate;
    }
  }

  return "";
}
