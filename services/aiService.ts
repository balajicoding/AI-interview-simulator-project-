
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { InterviewConfig, Question, EvaluationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

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
    const prompt = `You are a Senior Interviewer (Engineering Manager or HR Lead) at ${config.company}. 
    Your task is to conduct a highly professional ${config.type} interview for the position of ${config.role}.
    
    Target Candidate Profile:
    - Experience Level: ${config.experience}
    - Interview Difficulty: ${config.difficulty}
    
    Guidelines for generating exactly 5 questions:
    1. FIRST QUESTION MANDATORY: If the interview type is "HR" or "Mixed", the very first question MUST be "Tell me about yourself and your journey so far."
    2. COMPANY CONTEXT: Questions must reflect ${config.company}'s actual interview culture (e.g., Leadership Principles for Amazon, scale/process for TCS, innovation for Google).
    3. ROLE SPECIFICITY: For a ${config.role}, don't ask generic tech questions. Ask about specific challenges, architectural trade-offs, or optimization strategies relevant to this specific role.
    4. VARIETY: Ensure no two questions cover the same topic. Include a mix of:
       - Scenario-based problem solving (e.g., "Imagine our production system is failing because...")
       - Deep conceptual architecture (e.g., "How would you design a scalable system for...")
       - Behavioral/Cultural fit (e.g., "Tell me about a time you handled a conflict in your team...")
    5. NEGATIVE CONSTRAINTS (CRITICAL):
       - NO generic textbook definitions (e.g., NEVER ask "What is Polymorphism?" or "What is a React Hook?").
       - NO "trivia" questions that can be googled in 5 seconds.
       - NO questions that elicit simple "yes/no" or single-sentence answers.
       - NO random repetition.
    
    Output Format: A strictly valid JSON object with a "questions" key containing an array of objects.
    Each object must have "text" (string) and "category" (either "HR" or "Technical").`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    const prompt = `You are an expert Interview Evaluator at ${config.company}. Evaluate this response for the role of ${config.role}.
    
    Question: "${question}"
    Candidate Answer: "${answer}"

    Scoring Logic:
    - Evaluate semantic relevance, depth of understanding, and professional articulation.
    - DO NOT penalize for short answers if they are concise and technically accurate.
    - DO NOT reward "fluff" or long, irrelevant rambling.
    - Consider the experience level: ${config.experience}.
    
    Metrics to provide (1-10):
    - relevance: How accurately did they answer the specific question?
    - clarity: Was the communication structured and easy to follow?
    - confidence: Did the tone reflect mastery of the subject?
    - technical_depth: Did they show deep conceptual knowledge or just surface-level understanding?
    
    Overall Score: 1-100 based on a weighted average of the above.
    
    Feedback: Provide constructive, specific feedback.
    Improvement Tips: 3-5 concrete action items for the candidate.
    
    Return the evaluation as a strictly valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
            improvement_tips: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
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
        model: "gemini-2.5-flash-preview-tts",
        contents: `Say professionally and clearly: ${text}`,
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
      console.error("Gemini TTS failed, falling back to browser logic", err);
      return undefined;
    }
  },

  async chatWithAI(message: string, history: {role: 'user' | 'model', parts: {text: string}[]}[]): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: 'You are an AI Interview Coach assistant within the HireAI platform. Your goal is to help users with interview preparation advice, platform guidance, and career tips. Keep responses concise, professional, and helpful. If asked about technical concepts, provide clear explanations with examples.',
      }
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  }
};
