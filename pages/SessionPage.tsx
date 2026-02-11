
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInterview } from '../context/InterviewContext';
import { MAX_QUESTIONS } from '../constants';
import { aiService, audioUtils } from '../services/aiService';

const SessionPage: React.FC = () => {
  const { session, submitAnswer, loading, error } = useInterview();
  const navigate = useNavigate();
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [timer, setTimer] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (!session || session.status === 'idle') {
      navigate('/setup');
      return;
    }

    if (session.status === 'completed') {
      navigate('/results');
      return;
    }
  }, [session, navigate]);

  // Handle high-quality Gemini TTS for new questions
  useEffect(() => {
    if (session?.status === 'ongoing') {
      const currentQuestion = session.questions[session.currentQuestionIndex];
      if (currentQuestion) {
        // We delay slightly to ensure transitions are smooth
        const timeout = setTimeout(() => {
          speakQuestion(currentQuestion.text);
        }, 500);
        return () => clearTimeout(timeout);
      }
    }
    
    return () => {
      stopSpeaking();
    };
  }, [session?.currentQuestionIndex, session?.status]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const initAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  };

  const speakQuestion = async (text: string) => {
    stopSpeaking();
    setIsSpeaking(true);

    try {
      // Ensure context is ready
      await initAudioContext();
      
      const base64Audio = await aiService.generateSpeech(text);
      
      if (base64Audio && audioContextRef.current) {
        const audioBuffer = await audioUtils.decodeAudioData(
          audioUtils.decodeBase64(base64Audio),
          audioContextRef.current,
          24000,
          1
        );

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
          setIsSpeaking(false);
          sourceNodeRef.current = null;
        };
        source.start();
        sourceNodeRef.current = source;
      } else {
        // Fallback to browser TTS if Gemini TTS fails or isn't supported
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("Speech playback error:", err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const startRecording = async () => {
    // Resume audio context on user gesture if needed
    await initAudioContext();
    
    stopSpeaking();
    setIsRecording(true);
    setTranscript('');
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          alert("Microphone access is required for this simulation.");
        }
        setIsRecording(false);
      };

      recognitionRef.current.start();
    } else {
      alert("Speech recognition not supported in this browser.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = async () => {
    stopRecording();
    if (!transcript.trim()) {
      alert("Please provide an answer before submitting.");
      return;
    }
    await submitAnswer(transcript);
    setTranscript('');
  };

  if (!session) return null;

  const currentQuestion = session.questions[session.currentQuestionIndex];
  const progress = ((session.currentQuestionIndex + 1) / MAX_QUESTIONS) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-10rem)] flex flex-col">
      {/* Progress Bar */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Question {session.currentQuestionIndex + 1} of {MAX_QUESTIONS}</span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-indigo-600 dark:bg-indigo-500"
          ></motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentQuestion?.id || 'empty'}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: -20 }}
            className="w-full bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 shadow-xl border border-slate-100 dark:border-slate-800 text-center mb-8 relative overflow-hidden"
          >
            <AnimatePresence>
              {isSpeaking && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-0 left-0 w-full h-1.5 bg-indigo-500/10 overflow-hidden"
                >
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-1/3 h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="inline-block px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6">
              {currentQuestion?.category || 'General'} Question
            </div>
            
            <h2 className={`text-2xl md:text-4xl font-bold text-slate-800 dark:text-white leading-tight transition-opacity duration-300 ${isSpeaking ? 'opacity-100' : 'opacity-90'}`}>
              {currentQuestion?.text || 'Loading question...'}
            </h2>
            
            {isSpeaking && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-indigo-500 dark:text-indigo-400 text-xs mt-4 font-bold flex items-center justify-center space-x-2"
              >
                <span className="flex space-x-1">
                  <span className="w-1 h-3 bg-indigo-500 animate-[bounce_0.6s_infinite]"></span>
                  <span className="w-1 h-3 bg-indigo-500 animate-[bounce_0.6s_infinite_0.1s]"></span>
                  <span className="w-1 h-3 bg-indigo-500 animate-[bounce_0.6s_infinite_0.2s]"></span>
                </span>
                <span>Interviewer is speaking...</span>
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Live Transcript Preview */}
        <div className="w-full min-h-[150px] bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 mb-8 relative transition-colors">
           {!transcript && !isRecording && (
             <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium px-4 text-center">
               Your response transcript will appear here as you speak...
             </div>
           )}
           {isRecording && (
             <div className="flex items-center space-x-2 text-red-500 dark:text-red-400 mb-4 animate-pulse">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <span className="text-xs font-bold uppercase tracking-widest">Listening: {Math.floor(timer/60)}:{(timer%60).toString().padStart(2, '0')}</span>
             </div>
           )}
           <p className="text-slate-700 dark:text-slate-200 leading-relaxed italic text-lg">
             {transcript || (isRecording ? "I'm listening..." : "")}
           </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mx-auto">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={loading || isSpeaking}
              className="w-full py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>{transcript ? 'Re-record Answer' : 'Start Recording'}</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full py-4 bg-rose-500 dark:bg-rose-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-rose-600 dark:hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 dark:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H10a1 1 0 01-1-1v-4z" />
              </svg>
              <span>Stop Recording</span>
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || isRecording || !transcript}
            className={`w-full py-4 rounded-2xl font-bold transition-all ${
              loading || isRecording || !transcript
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 shadow-lg shadow-emerald-100 dark:shadow-none'
            }`}
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                 <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 <span>Evaluating...</span>
              </span>
            ) : 'Submit Answer'}
          </button>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 w-full max-w-md bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex items-start space-x-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-rose-600 dark:text-rose-400 text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SessionPage;
