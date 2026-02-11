
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { InterviewConfig, Question, EvaluationResult } from "../types";

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Using gemini-3-flash-preview for high-speed text tasks and higher free-tier rate limits
const COMPONENT_MODEL = "gemini-3-flash-preview";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

const MAX_RETRIES = 2;
const INITIAL_BACKOFF = 1000; 

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = INITIAL_BACKOFF): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = 
      error?.message?.includes('429') || 
      error?.status === 'RESOURCE_EXHAUSTED' || 
      (error?.message && /quota/i.test(error.message));
    
    // If it's a 400 or 429, and we have retries, wait and try again
    if ((isQuotaError || error?.message?.includes('400')) && retries > 0) {
      console.warn(`API issue encountered. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.5);
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

export const aiService = {
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
      const prompt = `Senior Recruiter at ${config.company}. Generate 5 interview questions for ${config.role} (${config.experience}).
      Format: JSON {questions: [{text, category}]}.
      Rule: First question MUST be "Tell me about yourself".
      Be specific and professional.`;

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
      const prompt = `Evaluate response for ${config.role} at ${config.company}:
      Q: "${question}"
      A: "${answer}"
      Provide scores 1-10 for relevance, clarity, confidence, technical_depth. Overall 1-100.
      Professional feedback and 3 improvement tips. Return JSON.`;

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
      // Use zero retries for speech to ensure instant fallback if API is busy
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        // Using a standard "Say [emotion]: [text]" pattern which is most reliable for the TTS model
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
    } catch (err: any) {
      console.error("Cloud TTS Unavailable:", err?.message || "Quota/Format Error");
      // Returning undefined triggers browser fallback in SessionPage.tsx
      return undefined;
    }
  },

  async chatWithAI(message: string, history: any[]): Promise<string> {
    if (!ai) {
      return "Mock mode is active (no GEMINI_API_KEY). I can still help with interview structure, STAR answers, and technical framing.";
    }

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: COMPONENT_MODEL,
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction: 'You are an AI Interview Coach. Give fast, short, professional advice.',
        }
      });
      return response.text || "I'm sorry, I couldn't process that.";
    });
  }
};
