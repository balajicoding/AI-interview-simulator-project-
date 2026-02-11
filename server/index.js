import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.API_PORT || 8787);
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = (process.env.VITE_GROQ_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();

const QUESTION_COUNT = 5;
const GENERIC_PATTERNS = [
  /what are your strengths/i,
  /what are your weaknesses/i,
  /where do you see yourself/i,
  /why should we hire you/i,
  /salary expectation/i,
];

const COMPANY_CONTEXTS = {
  tcs: {
    interviewStyle: 'process-oriented and delivery-focused',
    domains: ['enterprise modernization', 'legacy integration', 'banking systems'],
    priorities: ['client communication', 'stability', 'maintainability'],
  },
  infosys: {
    interviewStyle: 'structured and framework-driven',
    domains: ['digital transformation', 'cloud migration', 'consulting delivery'],
    priorities: ['problem decomposition', 'documentation', 'stakeholder alignment'],
  },
  wipro: {
    interviewStyle: 'execution-focused with quality emphasis',
    domains: ['IT services', 'automation', 'support transformation'],
    priorities: ['quality', 'process compliance', 'incident response'],
  },
  accenture: {
    interviewStyle: 'consulting-led and outcome-driven',
    domains: ['enterprise platforms', 'cloud-native programs', 'cross-functional transformation'],
    priorities: ['business impact', 'communication', 'decision-making'],
  },
  cognizant: {
    interviewStyle: 'client-facing and delivery-focused',
    domains: ['healthcare and finance engineering', 'platform delivery', 'data-enabled products'],
    priorities: ['customer focus', 'ownership', 'reliability'],
  },
  deloitte: {
    interviewStyle: 'case-oriented and analytical',
    domains: ['advisory technology', 'risk systems', 'enterprise modernization'],
    priorities: ['structured thinking', 'risk awareness', 'clarity'],
  },
  capgemini: {
    interviewStyle: 'balanced between technical depth and collaboration',
    domains: ['cloud services', 'application modernization', 'managed services'],
    priorities: ['scalability', 'team collaboration', 'code quality'],
  },
  amazon: {
    interviewStyle: 'high bar with ownership and trade-off focus',
    domains: ['distributed systems', 'large-scale services', 'customer-facing products'],
    priorities: ['ownership', 'customer obsession', 'metrics'],
  },
  microsoft: {
    interviewStyle: 'design-heavy and engineering-rigor oriented',
    domains: ['platform engineering', 'developer tools', 'cloud systems'],
    priorities: ['design clarity', 'testing', 'collaboration'],
  },
  google: {
    interviewStyle: 'problem-solving and system-design intensive',
    domains: ['search-scale systems', 'data-intensive services', 'reliability engineering'],
    priorities: ['analytical depth', 'scalability', 'simplicity'],
  },
};

const DEFAULT_COMPANY_CONTEXT = {
  interviewStyle: 'practical and scenario-focused',
  domains: ['product engineering'],
  priorities: ['problem solving', 'clarity', 'execution'],
};

const ROLE_COMPETENCIES = {
  'software engineer': ['data structures', 'debugging', 'API design', 'code quality', 'testing'],
  'frontend developer': ['react architecture', 'state management', 'performance optimization', 'accessibility', 'responsive design'],
  'backend developer': ['API design', 'database modeling', 'caching', 'security', 'scalability'],
  'full stack developer': ['end-to-end architecture', 'API contracts', 'frontend-backend integration', 'deployment', 'debugging'],
  'data scientist': ['feature engineering', 'model validation', 'experiment design', 'data storytelling', 'business alignment'],
  'ai/ml engineer': ['model serving', 'ML pipelines', 'evaluation metrics', 'prompt design', 'inference optimization'],
  'devops engineer': ['CI/CD', 'observability', 'incident response', 'infrastructure as code', 'reliability'],
  'quality assurance': ['test strategy', 'automation', 'defect triage', 'regression planning', 'risk-based testing'],
  'systems architect': ['system design', 'trade-off analysis', 'scalability planning', 'resilience', 'governance'],
};

function normalizeKey(value = '') {
  return String(value).trim().toLowerCase();
}

function cleanQuestionText(raw = '') {
  return String(raw)
    .replace(/^\d+[\).\-\s]*/, '')
    .replace(/^[-*]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalize(text = '') {
  return String(text).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractJsonObject(text = '') {
  const trimmed = String(text).trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      return JSON.parse(candidate);
    }
    throw new Error('Model did not return JSON.');
  }
}

function getCategoryPlan(type) {
  const normalizedType = normalizeKey(type);
  if (normalizedType === 'hr') return ['HR', 'HR', 'HR', 'HR', 'HR'];
  if (normalizedType === 'technical') return ['Technical', 'Technical', 'Technical', 'Technical', 'Technical'];
  return ['HR', 'Technical', 'HR', 'Technical', 'HR'];
}

function getCompanyContext(company) {
  return COMPANY_CONTEXTS[normalizeKey(company)] || DEFAULT_COMPANY_CONTEXT;
}

function getRoleCompetencies(role) {
  const key = normalizeKey(role);
  if (ROLE_COMPETENCIES[key]) return ROLE_COMPETENCIES[key];
  if (key.includes('frontend')) return ROLE_COMPETENCIES['frontend developer'];
  if (key.includes('backend')) return ROLE_COMPETENCIES['backend developer'];
  if (key.includes('full stack')) return ROLE_COMPETENCIES['full stack developer'];
  if (key.includes('devops')) return ROLE_COMPETENCIES['devops engineer'];
  if (key.includes('architect')) return ROLE_COMPETENCIES['systems architect'];
  if (key.includes('data scientist')) return ROLE_COMPETENCIES['data scientist'];
  if (key.includes('ai') || key.includes('ml')) return ROLE_COMPETENCIES['ai/ml engineer'];
  return ROLE_COMPETENCIES['software engineer'];
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function buildQuestionPrompt(config) {
  const plan = getCategoryPlan(config.type);
  const companyCtx = getCompanyContext(config.company);
  const roleAreas = getRoleCompetencies(config.role);
  const difficultyDirection =
    normalizeKey(config.difficulty) === 'advanced'
      ? 'Set difficult scenario-heavy questions with trade-offs, scale, risk, and failure handling.'
      : normalizeKey(config.difficulty) === 'beginner'
        ? 'Set foundational but realistic questions that test core understanding and explanation quality.'
        : 'Set moderate scenario-driven questions combining fundamentals and practical implementation.';
  const experienceDirection =
    normalizeKey(config.experience) === 'fresher'
      ? 'Expect internship/academic project context and potential, not long production ownership.'
      : 'Expect production ownership, decision-making, and measurable outcomes.';
  const categoryPlanText = plan.map((cat, idx) => `Q${idx + 1}:${cat}`).join(', ');
  const shouldForceIntro = plan[0] === 'HR';

  const system = 'You are a senior interviewer panel generating realistic India hiring interview questions. Return only valid JSON.';
  const user = `
Generate exactly ${QUESTION_COUNT} unique interview questions with high realism.

Interview configuration:
- Company: ${config.company}
- Role: ${config.role}
- Experience: ${config.experience}
- Difficulty: ${config.difficulty}
- Type: ${config.type}
- Mandatory category order: ${categoryPlanText}

Company context:
- Interview style: ${companyCtx.interviewStyle}
- Domain focus: ${companyCtx.domains.join(', ')}
- Hiring priorities: ${companyCtx.priorities.join(', ')}

Role competencies to target:
- ${roleAreas.join(', ')}

Constraints:
- ${difficultyDirection}
- ${experienceDirection}
- Questions must be scenario-based and practical, like real panel interviews.
- No repetition or near-duplicate wording.
- Avoid generic textbook prompts.
- Do NOT use these generic questions: "What are your strengths?", "What are your weaknesses?", "Where do you see yourself in 5 years?"
- ${shouldForceIntro ? 'Q1 text must be exactly "Tell me about yourself."' : 'Do not force a generic HR opener.'}
- Return JSON only in this exact schema:
{"questions":[{"text":"string","category":"HR|Technical"}]}
`.trim();

  return { system, user, plan };
}

function fallbackQuestions(config) {
  const plan = getCategoryPlan(config.type);
  const roleAreas = getRoleCompetencies(config.role);
  const companyCtx = getCompanyContext(config.company);
  const hrPool = [
    `Why are you targeting ${config.company} for a ${config.role} role, and what impact do you want in your first 6 months?`,
    `Describe a time you handled unclear requirements while coordinating with teammates in a ${companyCtx.interviewStyle} setup.`,
    'Tell me about a conflict in a project team and how you resolved it while still delivering on time.',
    'Share one professional mistake you made and the process change you introduced afterward.',
    'How do you prioritize when deadlines shift suddenly and stakeholders have conflicting expectations?',
  ];
  const technicalPool = [
    `At ${config.company}, design an approach for ${roleAreas[0]} with ${config.difficulty} constraints. What trade-offs would you make?`,
    `You notice production issues after a deployment related to ${roleAreas[1]}. Walk me through your debugging workflow.`,
    `How would you design testing and monitoring for ${roleAreas[2]} so failures are detected early?`,
    `Given limited time, how would you prioritize improvements across ${roleAreas[0]}, ${roleAreas[3]}, and ${roleAreas[4]}?`,
    `If performance drops under peak traffic, which metrics would you inspect first and why?`,
  ];

  const used = new Set();
  const result = [];
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const category = plan[i];
    let text;
    if (i === 0 && category === 'HR') {
      text = 'Tell me about yourself.';
    } else {
      const pool = category === 'HR' ? hrPool : technicalPool;
      text = pool[i % pool.length];
      if (used.has(canonicalize(text))) {
        text = category === 'HR'
          ? 'Describe a situation where you demonstrated ownership and clear communication.'
          : `Walk through how you would solve a ${config.role} challenge at ${config.company}.`;
      }
    }
    used.add(canonicalize(text));
    result.push({ id: i + 1, text, category });
  }
  return result;
}

function normalizeQuestions(rawQuestions, config, plan) {
  const fallback = fallbackQuestions(config);
  if (!Array.isArray(rawQuestions) || rawQuestions.length < QUESTION_COUNT) {
    return fallback;
  }

  const used = new Set();
  const normalized = [];
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const category = plan[i];
    const rawText = cleanQuestionText(rawQuestions[i]?.text || '');
    let text = rawText;
    if (!text || GENERIC_PATTERNS.some((p) => p.test(text)) || used.has(canonicalize(text))) {
      text = fallback[i].text;
    }
    if (i === 0 && category === 'HR') text = 'Tell me about yourself.';
    used.add(canonicalize(text));
    normalized.push({ id: i + 1, text, category });
  }
  return normalized;
}

function fallbackEvaluation(answer, config, reason = 'Groq API request failed') {
  const rawAnswer = String(answer || '').trim();
  const answerWords = rawAnswer.toLowerCase().split(/\W+/).filter(Boolean);
  const technicalMatches = answerWords.filter((w) =>
    ['api', 'db', 'database', 'cache', 'latency', 'test', 'pipeline', 'deploy', 'monitor', 'design', 'scalability'].includes(w)
  ).length;
  const profanity = /\bfuck|shit|bitch|bastard|asshole|f\*+k|s\*+t\b/i.test(rawAnswer);
  const relevance = clamp(2 + Math.min(6, answerWords.length / 12), 1, 10, 4);
  const clarity = clamp(rawAnswer.length > 40 ? 6 : 3, 1, 10, 4);
  const confidence = clamp(/\b(i will|i would|i can|i did)\b/i.test(rawAnswer) ? 7 : 5, 1, 10, 5);
  const technicalDepth = clamp(2 + technicalMatches, 1, 10, 4);
  const penalty = profanity ? 25 : 0;
  const base = Math.round(((relevance + clarity + confidence + technicalDepth) / 40) * 100);
  const overall = clamp(base - penalty, 1, 100, 45);

  return {
    relevance,
    clarity,
    confidence,
    technical_depth: technicalDepth,
    sentiment: profanity ? 'negative' : 'neutral',
    overall_score: overall,
    feedback: `Evaluation fallback active (${reason}). Improve relevance with role-specific examples and measurable outcomes.`,
    improvement_tips: [
      'Use STAR structure: Situation, Task, Action, Result.',
      `Link your points directly to ${config.role} responsibilities.`,
      'Add one measurable result (latency drop, defect reduction, delivery speed).',
    ],
  };
}

function normalizeEvaluation(raw) {
  const tips = Array.isArray(raw?.improvement_tips)
    ? raw.improvement_tips.filter((t) => typeof t === 'string' && t.trim()).slice(0, 3)
    : [];
  while (tips.length < 3) {
    tips.push(
      ['Use STAR structure for better clarity.', 'Add one concrete metric in your answer.', 'Explain your technical trade-offs clearly.'][tips.length]
    );
  }

  return {
    relevance: clamp(raw?.relevance, 1, 10, 6),
    clarity: clamp(raw?.clarity, 1, 10, 6),
    confidence: clamp(raw?.confidence, 1, 10, 6),
    technical_depth: clamp(raw?.technical_depth, 1, 10, 6),
    sentiment: typeof raw?.sentiment === 'string' && raw.sentiment.trim() ? raw.sentiment.trim() : 'neutral',
    overall_score: clamp(raw?.overall_score, 1, 100, 65),
    feedback:
      typeof raw?.feedback === 'string' && raw.feedback.trim()
        ? raw.feedback.trim()
        : 'Good start. Improve technical specificity and measurable outcomes.',
    improvement_tips: tips,
  };
}

function getGroqApiKey() {
  return (process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || '').trim();
}

async function callGroq(messages, options = {}) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on backend.');
  }

  const body = {
    model: GROQ_MODEL,
    messages,
    temperature: options.temperature ?? 0.3,
  };
  if (options.json) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Groq ${response.status}: ${text}`);
  }

  const data = JSON.parse(text);
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Groq returned empty content.');
  }
  return content;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-interview-backend' });
});

app.post('/api/interview/questions', async (req, res) => {
  const config = req.body?.config || {};
  if (!config.role || !config.company || !config.type || !config.experience || !config.difficulty) {
    res.status(400).json({ error: 'Missing required interview config.' });
    return;
  }

  const { system, user, plan } = buildQuestionPrompt(config);
  try {
    const raw = await callGroq(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { json: true, temperature: 0.65 }
    );
    const parsed = extractJsonObject(raw);
    const questions = normalizeQuestions(parsed?.questions, config, plan);
    res.json({ questions, source: 'groq' });
  } catch (error) {
    const questions = fallbackQuestions(config);
    res.json({ questions, source: 'fallback', error: error?.message || 'Question generation failed.' });
  }
});

app.post('/api/interview/evaluate', async (req, res) => {
  const { question, answer, config } = req.body || {};
  if (!question || typeof question !== 'string' || !config || typeof config !== 'object') {
    res.status(400).json({ error: 'Missing required payload for evaluation.' });
    return;
  }

  const system = 'You are an interview evaluator. Return only valid JSON.';
  const user = `Evaluate this answer for a ${config.role} interview at ${config.company}.
Question: "${question}"
Answer: "${String(answer || '')}"
Return JSON with:
relevance(1-10), clarity(1-10), confidence(1-10), technical_depth(1-10), sentiment(string), overall_score(1-100), feedback(string), improvement_tips(array of exactly 3 short strings).`;

  try {
    const raw = await callGroq(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { json: true, temperature: 0.2 }
    );
    const parsed = extractJsonObject(raw);
    const evaluation = normalizeEvaluation(parsed);
    res.json({ evaluation, source: 'groq' });
  } catch (error) {
    const evaluation = fallbackEvaluation(answer, config, error?.message || 'Groq API request failed');
    res.json({ evaluation, source: 'fallback', error: error?.message || 'Evaluation failed' });
  }
});

app.post('/api/interview/chat', async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message is required.' });
    return;
  }

  const prior = Array.isArray(history)
    ? history
        .map((h) => {
          const role = h?.role === 'model' || h?.role === 'assistant' ? 'assistant' : 'user';
          const content = h?.parts?.[0]?.text;
          if (typeof content !== 'string' || !content.trim()) return null;
          return { role, content };
        })
        .filter(Boolean)
    : [];

  try {
    const responseText = await callGroq(
      [
        { role: 'system', content: 'You are an AI Interview Coach. Give concise, practical advice.' },
        ...prior,
        { role: 'user', content: message },
      ],
      { temperature: 0.5 }
    );
    res.json({ response: responseText, source: 'groq' });
  } catch (error) {
    res.json({
      response: 'I could not reach the coaching model right now. Please try again in a moment.',
      source: 'fallback',
      error: error?.message || 'Chat request failed',
    });
  }
});

app.listen(PORT, () => {
  console.log(`[api] listening on http://127.0.0.1:${PORT}`);
});
