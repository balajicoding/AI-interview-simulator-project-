
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { InterviewConfig, Question, EvaluationResult } from "../types";

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const COMPONENT_MODEL = "gemini-3-flash-preview";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

const MAX_RETRIES = 2;
const INITIAL_BACKOFF = 1000;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = INITIAL_BACKOFF): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
    if (isQuotaError && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
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
    numChannels: number = 1,
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

export const geminiService = {
  async generateQuestions(config: InterviewConfig): Promise<Question[]> {
    if (!ai) {
      return [
        { id: 1, text: "Tell me about yourself.", category: "HR" },
        { id: 2, text: `Why do you want to work at ${config.company}?`, category: "HR" },
        { id: 3, text: `Explain a challenging project you handled as a ${config.role}.`, category: "Technical" },
        { id: 4, text: "How do you debug production issues under pressure?", category: "Technical" },
        { id: 5, text: "What are your strengths and one area you are improving?", category: "HR" }
      ];
    }

    return withRetry(async () => {
      const prompt = `Senior hiring manager at ${config.company}. 5 questions for ${config.role} (${config.experience}). JSON format: {questions: [{text, category}]}. First must be "Tell me about yourself".`;

      const response = await ai.models.generateContent({
        model: COMPONENT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ["HR", "Technical"] }
                  },
                  required: ["text", "category"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      const data = JSON.parse(response.text || '{"questions": []}');
      return data.questions.map((q: any, index: number) => ({
        id: index + 1,
        text: q.text,
        category: q.category
      }));
    });
  },

  async evaluateAnswer(question: string, answer: string, config: InterviewConfig): Promise<EvaluationResult> {
    if (!ai) {
      const lengthScore = Math.min(10, Math.max(4, Math.floor(answer.trim().length / 40)));
      const technical = /system|design|api|database|algorithm|testing|debug|performance/i.test(answer) ? Math.min(10, lengthScore + 1) : Math.max(4, lengthScore - 1);
      return {
        relevance: lengthScore,
        clarity: Math.max(4, lengthScore - 1),
        confidence: Math.max(4, lengthScore - 1),
        technical_depth: technical,
        sentiment: "neutral",
        overall_score: Math.round(((lengthScore + Math.max(4, lengthScore - 1) + Math.max(4, lengthScore - 1) + technical) / 40) * 100),
        feedback: "Running in local mock mode because GEMINI_API_KEY is not configured. Your answer has a good start; add more concrete examples and measurable outcomes.",
        improvement_tips: [
          "Use STAR format (Situation, Task, Action, Result).",
          `Tie your answer to ${config.role} responsibilities.`,
          "Add one metric (latency, revenue, bug reduction, etc.)."
        ]
      };
    }

    return withRetry(async () => {
      const prompt = `Evaluate answer for ${config.role} at ${config.company}: Q: "${question}" A: "${answer}". Metrics 1-10, Overall 1-100, Sentiment, Feedback, Tips. Return JSON.`;

      const response = await ai.models.generateContent({
        model: COMPONENT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              relevance: { type: Type.NUMBER },
              clarity: { type: Type.NUMBER },
              confidence: { type: Type.NUMBER },
              technical_depth: { type: Type.NUMBER },
              sentiment: { type: Type.STRING },
              overall_score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              improvement_tips: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["relevance", "clarity", "confidence", "technical_depth", "overall_score", "feedback", "improvement_tips", "sentiment"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    });
  },

  async generateSpeech(text: string): Promise<string | undefined> {
    if (!ai) return undefined;

    try {
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (err) {
      console.warn("TTS fallback engaged");
      return undefined;
    }
  }
};
