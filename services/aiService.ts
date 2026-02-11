import { InterviewConfig, Question, EvaluationResult } from "../types";

const API_ENDPOINTS = {
  questions: "/api/interview/questions",
  evaluate: "/api/interview/evaluate",
  chat: "/api/interview/chat",
};
const QUESTION_COUNT = 5;

const MAX_RETRIES = 2;
const INITIAL_BACKOFF = 1000;

type Category = Question["category"];

const COMPANY_CONTEXTS: Record<string, { interviewStyle: string; domains: string[]; priorities: string[] }> = {
  tcs: {
    interviewStyle: "process-oriented and delivery-focused",
    domains: ["enterprise modernization", "legacy integration", "banking systems"],
    priorities: ["client communication", "stability", "maintainability"]
  },
  infosys: {
    interviewStyle: "structured and framework-driven",
    domains: ["digital transformation", "cloud migration", "consulting delivery"],
    priorities: ["problem decomposition", "documentation", "stakeholder alignment"]
  },
  wipro: {
    interviewStyle: "execution-focused with quality emphasis",
    domains: ["IT services", "automation", "support transformation"],
    priorities: ["quality", "process compliance", "incident response"]
  },
  accenture: {
    interviewStyle: "consulting-led and outcome-driven",
    domains: ["enterprise platforms", "cloud-native programs", "cross-functional transformation"],
    priorities: ["business impact", "communication", "decision-making"]
  },
  cognizant: {
    interviewStyle: "client-facing and delivery-focused",
    domains: ["healthcare and finance engineering", "platform delivery", "data-enabled products"],
    priorities: ["customer focus", "ownership", "reliability"]
  },
  deloitte: {
    interviewStyle: "case-oriented and analytical",
    domains: ["advisory technology", "risk systems", "enterprise modernization"],
    priorities: ["structured thinking", "risk awareness", "clarity"]
  },
  capgemini: {
    interviewStyle: "balanced between technical depth and collaboration",
    domains: ["cloud services", "application modernization", "managed services"],
    priorities: ["scalability", "team collaboration", "code quality"]
  },
  amazon: {
    interviewStyle: "high bar with ownership and trade-off focus",
    domains: ["distributed systems", "large-scale services", "customer-facing products"],
    priorities: ["ownership", "customer obsession", "metrics"]
  },
  microsoft: {
    interviewStyle: "design-heavy and engineering-rigor oriented",
    domains: ["platform engineering", "developer tools", "cloud systems"],
    priorities: ["design clarity", "testing", "collaboration"]
  },
  google: {
    interviewStyle: "problem-solving and system-design intensive",
    domains: ["search-scale systems", "data-intensive services", "reliability engineering"],
    priorities: ["analytical depth", "scalability", "simplicity"]
  }
};

const DEFAULT_COMPANY_CONTEXT = {
  interviewStyle: "practical and scenario-focused",
  domains: ["product engineering"],
  priorities: ["problem solving", "clarity", "execution"]
};

const ROLE_COMPETENCIES: Record<string, string[]> = {
  "software engineer": ["data structures", "debugging", "API design", "code quality", "testing"],
  "frontend developer": ["react architecture", "state management", "performance optimization", "accessibility", "responsive design"],
  "backend developer": ["API design", "database modeling", "caching", "security", "scalability"],
  "full stack developer": ["end-to-end architecture", "API contracts", "frontend-backend integration", "deployment", "debugging"],
  "data scientist": ["feature engineering", "model validation", "experiment design", "data storytelling", "business alignment"],
  "ai/ml engineer": ["model serving", "ML pipelines", "evaluation metrics", "prompt design", "inference optimization"],
  "devops engineer": ["CI/CD", "observability", "incident response", "infrastructure as code", "reliability"],
  "quality assurance": ["test strategy", "automation", "defect triage", "regression planning", "risk-based testing"],
  "systems architect": ["system design", "trade-off analysis", "scalability planning", "resilience", "governance"]
};

const GENERIC_PATTERNS = [
  /what are your strengths/i,
  /what are your weaknesses/i,
  /where do you see yourself/i,
  /why should we hire you/i,
  /what is your salary expectation/i
];

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function canonicalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function nextSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cleanQuestionText(raw: string): string {
  return raw
    .replace(/^\d+[\).\-\s]*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericQuestion(text: string): boolean {
  return GENERIC_PATTERNS.some((pattern) => pattern.test(text));
}

function getCompanyContext(company: string) {
  const key = normalizeKey(company);
  return COMPANY_CONTEXTS[key] || DEFAULT_COMPANY_CONTEXT;
}

function getRoleCompetencies(role: string): string[] {
  const key = normalizeKey(role);
  if (ROLE_COMPETENCIES[key]) return ROLE_COMPETENCIES[key];
  if (key.includes("frontend")) return ROLE_COMPETENCIES["frontend developer"];
  if (key.includes("backend")) return ROLE_COMPETENCIES["backend developer"];
  if (key.includes("full stack")) return ROLE_COMPETENCIES["full stack developer"];
  if (key.includes("devops")) return ROLE_COMPETENCIES["devops engineer"];
  if (key.includes("architect")) return ROLE_COMPETENCIES["systems architect"];
  if (key.includes("data scientist")) return ROLE_COMPETENCIES["data scientist"];
  if (key.includes("ai") || key.includes("ml")) return ROLE_COMPETENCIES["ai/ml engineer"];
  return ROLE_COMPETENCIES["software engineer"];
}

function getCategoryPlan(type: InterviewConfig["type"]): Category[] {
  const normalizedType = normalizeKey(String(type));
  if (normalizedType === "hr") return ["HR", "HR", "HR", "HR", "HR"];
  if (normalizedType === "technical") return ["Technical", "Technical", "Technical", "Technical", "Technical"];
  return ["HR", "Technical", "HR", "Technical", "HR"];
}

function pickUniqueFromPool(pool: string[], used: Set<string>, seedRef: { value: number }): string | null {
  if (pool.length === 0) return null;
  let attempts = 0;
  while (attempts < pool.length * 2) {
    seedRef.value = nextSeed(seedRef.value);
    const candidate = pool[seedRef.value % pool.length];
    const key = canonicalize(candidate);
    if (!used.has(key)) {
      used.add(key);
      return candidate;
    }
    attempts += 1;
  }
  return null;
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = INITIAL_BACKOFF): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = Number(error?.status || 0);
    const message = String(error?.message || "");
    const retriable = status === 429 || status >= 500 || /rate|timeout|temporar|overloaded/i.test(message);

    if (retriable && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, Math.round(delay * 1.6));
    }

    throw error;
  }
}

async function postApi<T>(url: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    const error: any = new Error(data?.error || data?.message || `API request failed with status ${res.status}`);
    error.status = res.status;
    throw error;
  }

  return data as T;
}

function fallbackQuestions(config: InterviewConfig): Question[] {
  const plan = getCategoryPlan(config.type);
  const companyCtx = getCompanyContext(config.company);
  const roleAreas = getRoleCompetencies(config.role);
  const expHint =
    normalizeKey(config.experience) === "fresher"
      ? "Use internship, academic, or project examples where relevant."
      : "Use production ownership and real incident examples.";
  const difficultyHint =
    normalizeKey(config.difficulty) === "advanced"
      ? "Include trade-offs, scale, and failure handling."
      : normalizeKey(config.difficulty) === "beginner"
        ? "Keep focus on fundamentals and clear execution."
        : "Balance fundamentals with practical implementation choices.";

  const hrPool = [
    `Why are you targeting ${config.company} for a ${config.role} role, and what impact do you want to create in your first 6 months?`,
    `Describe a time you handled unclear requirements while coordinating with teammates. How would you adapt that approach in a ${companyCtx.interviewStyle} environment?`,
    `Tell me about a conflict in a project team and how you resolved it while still delivering on time.`,
    `Share one professional mistake you made and the specific process change you introduced afterward.`,
    `How do you prioritize tasks when deadlines shift suddenly and stakeholders have conflicting expectations?`,
    `Describe how you communicate technical updates to non-technical stakeholders in a concise way.`,
    `What kind of feedback helps you improve fastest, and how have you applied it recently?`,
    `In a high-pressure release week, how would you protect quality while still meeting commitments?`
  ];

  const technicalPool = [
    `At ${config.company}, design an approach for ${roleAreas[0]} in a ${companyCtx.domains[0]} scenario. What trade-offs would you make at ${config.difficulty} difficulty?`,
    `You notice production issues after a deployment related to ${roleAreas[1]}. Walk me through your debugging workflow step by step.`,
    `How would you design testing and monitoring for ${roleAreas[2]} so that failures are detected early in real usage?`,
    `Given limited time, how would you prioritize improvements across ${roleAreas[0]}, ${roleAreas[3]}, and ${roleAreas[4]}? Explain your decision criteria.`,
    `Describe a realistic architecture for ${roleAreas[0]} and ${roleAreas[2]} that would work for ${config.company}. Where could it fail, and how would you mitigate that?`,
    `If performance drops under peak traffic, what metrics would you inspect first and what immediate actions would you take?`,
    `Explain how you would review a teammate's implementation for ${roleAreas[1]} to catch reliability and maintainability risks early.`,
    `How would you break down a new feature with incomplete requirements into deliverable milestones without compromising quality?`
  ];

  const seedRef = {
    value: hashString(
      `${config.company}|${config.role}|${config.experience}|${config.difficulty}|${config.type}|${Date.now()}`
    )
  };
  const used = new Set<string>();
  const questions: Question[] = [];

  for (let i = 0; i < QUESTION_COUNT; i++) {
    const category = plan[i];
    let text: string;

    if (i === 0 && category === "HR") {
      text = "Tell me about yourself.";
      used.add(canonicalize(text));
    } else {
      const pool = category === "HR" ? hrPool : technicalPool;
      text =
        pickUniqueFromPool(pool, used, seedRef) ||
        (category === "HR"
          ? `Describe a real situation where you demonstrated ownership and clear communication. ${expHint}`
          : `Walk through how you would solve a ${config.role} problem at ${config.company}. ${difficultyHint}`);
    }

    questions.push({ id: i + 1, text, category });
  }

  return questions;
}

function fallbackEvaluation(answer: string, config: InterviewConfig, reason?: string): EvaluationResult {
  const lengthScore = Math.min(10, Math.max(4, Math.floor(answer.trim().length / 40)));
  const technical = /system|design|api|database|algorithm|testing|debug|performance/i.test(answer)
    ? Math.min(10, lengthScore + 1)
    : Math.max(4, lengthScore - 1);

  return {
    relevance: lengthScore,
    clarity: Math.max(4, lengthScore - 1),
    confidence: Math.max(4, lengthScore - 1),
    technical_depth: technical,
    sentiment: "neutral",
    overall_score: Math.round(((lengthScore + Math.max(4, lengthScore - 1) + Math.max(4, lengthScore - 1) + technical) / 40) * 100),
    feedback: reason
      ? `Local fallback mode is active (${reason}). Add concrete examples and measurable outcomes.`
      : "Local fallback mode is active because GROQ_API_KEY is unavailable. Add concrete examples and measurable outcomes.",
    improvement_tips: [
      "Use STAR format (Situation, Task, Action, Result).",
      `Tie your answer to ${config.role} responsibilities.`,
      "Add one metric (latency, revenue, bug reduction, etc.)."
    ]
  };
}

function clamp1to10(value: unknown, fallback = 6): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(10, Math.max(1, Math.round(n)));
}

function clamp1to100(value: unknown, fallback = 65): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(1, Math.round(n)));
}

export const audioUtils = {
  decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  },

  async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
};

export const aiService = {
  async generateQuestions(config: InterviewConfig): Promise<Question[]> {
    const plan = getCategoryPlan(config.type);
    const fallback = fallbackQuestions(config);

    try {
      return await withRetry(async () => {
        const data = await postApi<{ questions?: Array<{ text?: string; category?: string }>; error?: string }>(
          API_ENDPOINTS.questions,
          { config }
        );
        const incoming = Array.isArray(data?.questions) ? data.questions.slice(0, QUESTION_COUNT) : [];

        if (incoming.length < QUESTION_COUNT) {
          return fallback;
        }

        const used = new Set<string>();
        const normalized: Question[] = [];
        for (let i = 0; i < QUESTION_COUNT; i++) {
          const category = plan[i];
          const rawText = typeof incoming[i]?.text === "string" ? cleanQuestionText(incoming[i].text) : "";
          let text = rawText;

          if (!text || used.has(canonicalize(text)) || isGenericQuestion(text)) {
            text = fallback[i].text;
          }

          if (i === 0 && category === "HR") {
            text = "Tell me about yourself.";
          }

          used.add(canonicalize(text));
          normalized.push({
            id: i + 1,
            text,
            category
          });
        }

        return normalized;
      });
    } catch (error: any) {
      console.error("Question generation failed:", error?.message || error);
      return fallback;
    }
  },

  async evaluateAnswer(question: string, answer: string, config: InterviewConfig): Promise<EvaluationResult> {
    try {
      return await withRetry(async () => {
        const data = await postApi<{ evaluation?: EvaluationResult; error?: string }>(
          API_ENDPOINTS.evaluate,
          { question, answer, config }
        );
        const parsed = data?.evaluation || {};

        return {
          relevance: clamp1to10(parsed?.relevance),
          clarity: clamp1to10(parsed?.clarity),
          confidence: clamp1to10(parsed?.confidence),
          technical_depth: clamp1to10(parsed?.technical_depth),
          sentiment: typeof parsed?.sentiment === "string" && parsed.sentiment.trim() ? parsed.sentiment.trim() : "neutral",
          overall_score: clamp1to100(parsed?.overall_score),
          feedback:
            typeof parsed?.feedback === "string" && parsed.feedback.trim()
              ? parsed.feedback.trim()
              : "Good start. Add measurable outcomes and clearer technical depth.",
          improvement_tips: Array.isArray(parsed?.improvement_tips)
            ? parsed.improvement_tips.filter((t: unknown) => typeof t === "string" && t.trim()).slice(0, 3)
            : [
                "Use STAR format for structure.",
                "Add one concrete metric.",
                "Explain your technical decision trade-offs."
              ]
        };
      });
    } catch (error: any) {
      console.error("Answer evaluation failed:", error?.message || error);
      return fallbackEvaluation(answer, config, error?.message || "Backend evaluation request failed");
    }
  },

  async generateSpeech(_text: string): Promise<string | undefined> {
    // Browser SpeechSynthesis in SessionPage is used as fallback voice when cloud TTS is unavailable.
    return undefined;
  },

  async chatWithAI(message: string, history: any[]): Promise<string> {
    try {
      return await withRetry(async () => {
        const data = await postApi<{ response?: string; error?: string }>(
          API_ENDPOINTS.chat,
          { message, history }
        );
        if (typeof data?.response === "string" && data.response.trim()) {
          return data.response;
        }
        return "I could not get a coach response right now. Please try again.";
      });
    } catch (error: any) {
      console.error("Coach chat failed:", error?.message || error);
      return "I could not reach the Groq model right now. Please try again in a moment.";
    }
  }
};
