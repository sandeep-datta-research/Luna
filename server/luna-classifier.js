import { normalizeText } from "./luna-utils.js";

const CATEGORY_LABELS = {
  TECHNICAL: "Technical",
  PROGRAMMING: "Programming",
  EDUCATIONAL: "Educational",
  MOTIVATIONAL: "Motivational",
  CASUAL: "Casual conversation",
  COMMAND: "Command / Tool usage",
};

const KEYWORDS = {
  programming: [
    "code",
    "bug",
    "debug",
    "stack trace",
    "exception",
    "error",
    "function",
    "class",
    "api",
    "endpoint",
    "compile",
    "runtime",
    "typescript",
    "javascript",
    "python",
    "java",
    "c++",
    "sql",
    "react",
    "node",
    "express",
    "css",
  ],
  technical: [
    "server",
    "database",
    "network",
    "latency",
    "performance",
    "deployment",
    "docker",
    "kubernetes",
    "cloud",
    "infrastructure",
    "architecture",
    "security",
    "oauth",
    "cors",
    "auth",
  ],
  educational: [
    "explain",
    "what is",
    "why",
    "how does",
    "define",
    "tutorial",
    "learn",
    "lesson",
    "teach",
    "example",
  ],
  motivational: [
    "motivate",
    "inspire",
    "encourage",
    "confidence",
    "anxious",
    "stress",
    "sad",
    "burnout",
    "stuck",
    "help me focus",
    "support",
  ],
  casual: [
    "hello",
    "hi",
    "hey",
    "how are you",
    "good morning",
    "good evening",
    "thanks",
    "lol",
    "what's up",
    "how's it going",
  ],
  command: [
    "run",
    "execute",
    "open",
    "search",
    "create",
    "generate",
    "summarize",
    "translate",
    "fetch",
    "upload",
  ],
};

const CODE_PATTERNS = [
  /```[\s\S]*?```/m,
  /\b(function|class|const|let|var)\b/i,
  /\b(stack trace|exception|undefined|null reference)\b/i,
];

const COMMAND_PREFIX = /^\/[a-z]+/i;

function scoreMessage(text) {
  const scores = {
    [CATEGORY_LABELS.TECHNICAL]: 0,
    [CATEGORY_LABELS.PROGRAMMING]: 0,
    [CATEGORY_LABELS.EDUCATIONAL]: 0,
    [CATEGORY_LABELS.MOTIVATIONAL]: 0,
    [CATEGORY_LABELS.CASUAL]: 0,
    [CATEGORY_LABELS.COMMAND]: 0,
  };

  const normalized = normalizeText(text).toLowerCase();
  if (!normalized) {
    scores[CATEGORY_LABELS.CASUAL] = 1;
    return scores;
  }

  if (COMMAND_PREFIX.test(normalized)) {
    scores[CATEGORY_LABELS.COMMAND] += 3;
  }

  for (const pattern of CODE_PATTERNS) {
    if (pattern.test(text)) {
      scores[CATEGORY_LABELS.PROGRAMMING] += 3;
      scores[CATEGORY_LABELS.TECHNICAL] += 1;
    }
  }

  const applyKeywords = (list, label, weight = 1) => {
    for (const term of list) {
      if (normalized.includes(term)) {
        scores[label] += weight;
      }
    }
  };

  applyKeywords(KEYWORDS.programming, CATEGORY_LABELS.PROGRAMMING, 2);
  applyKeywords(KEYWORDS.technical, CATEGORY_LABELS.TECHNICAL, 2);
  applyKeywords(KEYWORDS.educational, CATEGORY_LABELS.EDUCATIONAL, 2);
  applyKeywords(KEYWORDS.motivational, CATEGORY_LABELS.MOTIVATIONAL, 2);
  applyKeywords(KEYWORDS.casual, CATEGORY_LABELS.CASUAL, 1);
  applyKeywords(KEYWORDS.command, CATEGORY_LABELS.COMMAND, 2);

  return scores;
}

function pickBestCategory(scores) {
  const priority = [
    CATEGORY_LABELS.COMMAND,
    CATEGORY_LABELS.PROGRAMMING,
    CATEGORY_LABELS.TECHNICAL,
    CATEGORY_LABELS.EDUCATIONAL,
    CATEGORY_LABELS.MOTIVATIONAL,
    CATEGORY_LABELS.CASUAL,
  ];

  let best = CATEGORY_LABELS.CASUAL;
  let bestScore = -1;

  for (const label of Object.keys(scores)) {
    if (scores[label] > bestScore) {
      best = label;
      bestScore = scores[label];
    } else if (scores[label] === bestScore && priority.indexOf(label) < priority.indexOf(best)) {
      best = label;
    }
  }

  return best;
}

export function classifyMessage(message) {
  const scores = scoreMessage(message || "");
  const label = pickBestCategory(scores);

  return {
    label,
    scores,
  };
}

export { CATEGORY_LABELS };
