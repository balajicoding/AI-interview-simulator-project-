
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { InterviewConfig, Question, EvaluationResult } from "../types";

// Using the high-speed Flash model for all interactive components
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const FAST_MODEL = "gemini-3-flash-preview";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

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
    const prompt = `Conduct a ${config.type} interview for ${config.role} at ${config.company} (${config.experience}, ${config.difficulty}). 
    Generate 5 unique questions. 
    Rule: If HR/Mixed, first is "Tell me about yourself". 
    Role-specific, scenario-based, no generic definitions.
    JSON format: {questions: [{text, category}]}`;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
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
  },

  async evaluateAnswer(question: string, answer: string, config: InterviewConfig): Promise<EvaluationResult> {
    const prompt = `Fast Evaluate for ${config.company}:
    Q: "${question}"
    A: "${answer}"
    Metrics 1-10: relevance, clarity, confidence, technical_depth. Overall 1-100.
    Sentiment: 1 word. Concise feedback & 3 tips. JSON format.`;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
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
  },

  async generateSpeech(text: string): Promise<string | undefined> {
    try {
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: `${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (err) {
      return undefined;
    }
  },

  async chatWithAI(message: string, history: any[]): Promise<string> {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: 'You are an AI Interview Coach. Concise, professional, helpful.',
      }
    });
    return response.text || "I'm sorry, I couldn't process that.";
  }
};
