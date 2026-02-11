
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { InterviewConfig, Question, EvaluationResult } from "../types";

// Always use process.env.API_KEY directly as a named parameter.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    const prompt = `You are a senior hiring manager at ${config.company}. Generate exactly 5 interview questions for a ${config.type} interview for the role of ${config.role}. 
    Target experience level: ${config.experience}. 
    Difficulty: ${config.difficulty}.
    
    Guidelines:
    1. If HR or Mixed, the first question MUST ALWAYS be: "Tell me about yourself."
    2. Questions must be scenario-based, reflecting real-world challenges at ${config.company}. Avoid generic textbook definitions.
    3. For Technical questions, focus on system architecture, problem-solving, and specific tech stack nuances for ${config.role}.
    4. If Mixed, alternate strictly between HR and Technical.
    5. Provide the questions in a strictly valid JSON array format.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
      }
    });

    // Directly access text as a property.
    const data = JSON.parse(response.text || "[]");
    return data.map((q: any, index: number) => ({
      id: index + 1,
      text: q.text,
      category: q.category
    }));
  },

  async evaluateAnswer(question: string, answer: string, config: InterviewConfig): Promise<EvaluationResult> {
    const prompt = `Evaluate this interview response semantically. 
    Role: ${config.role} at ${config.company}
    Question: "${question}"
    Candidate Answer: "${answer}"

    Scoring Rules:
    - DO NOT score based on answer length.
    - Relevance: Does the answer address the core problem?
    - Clarity: Is the explanation logical and structured?
    - Confidence: Analyze the tone and phrasing for assertiveness.
    - Technical Depth: For technical questions, check for conceptual coverage and accuracy.
    - Sentiment: Determine the candidate's professional mood (e.g., confident, hesitant, neutral).
    
    Return a detailed evaluation in JSON format.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relevance: { type: Type.NUMBER, description: "Score 1-10" },
            clarity: { type: Type.NUMBER, description: "Score 1-10" },
            confidence: { type: Type.NUMBER, description: "Score 1-10" },
            technical_depth: { type: Type.NUMBER, description: "Score 1-10" },
            sentiment: { type: Type.STRING },
            overall_score: { type: Type.NUMBER, description: "Total score 1-100" },
            feedback: { type: Type.STRING },
            improvement_tips: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["relevance", "clarity", "confidence", "technical_depth", "overall_score", "feedback", "improvement_tips", "sentiment"]
        }
      }
    });

    // Directly access text property.
    return JSON.parse(response.text || "{}");
  },

  async generateSpeech(text: string): Promise<string | undefined> {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say professionally: ${text}` }] }],
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
  }
};
