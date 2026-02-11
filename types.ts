
export enum InterviewType {
  HR = 'HR',
  TECHNICAL = 'Technical',
  MIXED = 'Mixed'
}

export enum ExperienceLevel {
  FRESHER = 'Fresher',
  EXPERIENCED = 'Experienced'
}

export interface InterviewConfig {
  type: InterviewType;
  role: string;
  experience: ExperienceLevel;
  company: string;
  difficulty: string;
}

export interface Question {
  id: number;
  text: string;
  category: 'HR' | 'Technical';
}

export interface Answer {
  questionId: number;
  questionText: string;
  answerText: string;
  evaluation?: EvaluationResult;
}

export interface EvaluationResult {
  relevance: number;
  clarity: number;
  confidence: number;
  technical_depth: number;
  sentiment: string;
  overall_score: number;
  feedback: string;
  improvement_tips: string[];
}

export interface InterviewSession {
  id: string;
  config: InterviewConfig;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Answer[];
  startTime: number;
  endTime?: number;
  status: 'idle' | 'ongoing' | 'completed';
}
