
import React, { createContext, useContext, useState, useCallback } from 'react';
import { InterviewSession, InterviewConfig, Question, Answer, InterviewType, ExperienceLevel } from '../types';
import { aiService } from '../services/aiService';
import { db } from '../services/databaseService';
import { useAuth } from './AuthContext';

interface InterviewContextType {
  session: InterviewSession | null;
  loading: boolean;
  error: string | null;
  startInterview: (config: InterviewConfig) => Promise<void>;
  submitAnswer: (answer: string) => Promise<void>;
  resetInterview: () => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const startInterview = async (config: InterviewConfig) => {
    setLoading(true);
    setError(null);
    try {
      const questions = await aiService.generateQuestions(config);
      setSession({
        id: Date.now().toString(),
        config,
        questions,
        currentQuestionIndex: 0,
        answers: [],
        startTime: Date.now(),
        status: 'ongoing'
      });
    } catch (err: any) {
      setError(err.message || "Failed to generate interview questions.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answerText: string) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const currentQuestion = session.questions[session.currentQuestionIndex];
      const evaluation = await aiService.evaluateAnswer(
        currentQuestion.text,
        answerText,
        session.config
      );

      const newAnswer: Answer = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        answerText,
        evaluation
      };

      const isLastQuestion = session.currentQuestionIndex === session.questions.length - 1;
      
      const updatedSession: InterviewSession = {
        ...session,
        answers: [...session.answers, newAnswer],
        currentQuestionIndex: isLastQuestion ? session.currentQuestionIndex : session.currentQuestionIndex + 1,
        status: isLastQuestion ? 'completed' : 'ongoing',
        endTime: isLastQuestion ? Date.now() : undefined
      };

      setSession(updatedSession);

      if (isLastQuestion && user) {
        await db.saveInterviewSession(user.id, updatedSession);
      }
    } catch (err: any) {
      setError(err.message || "Evaluation failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetInterview = () => {
    setSession(null);
    setError(null);
  };

  return (
    <InterviewContext.Provider value={{ session, loading, error, startInterview, submitAnswer, resetInterview }}>
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (!context) throw new Error("useInterview must be used within an InterviewProvider");
  return context;
};
