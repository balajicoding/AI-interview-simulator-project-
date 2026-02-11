
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInterview } from '../context/InterviewContext';
import { useNotification } from '../context/NotificationContext';
import { MAX_QUESTIONS } from '../constants';
import { aiService, audioUtils } from '../services/aiService';

const SessionPage: React.FC = () => {
  const { session, submitAnswer, loading } = useInterview();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [timer, setTimer] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPreparingVoice, setIsPreparingVoice] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

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

  const stopSpeaking = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPreparingVoice(false);
  }, []);

  const speakQuestion = useCallback(async (text: string) => {
    stopSpeaking();
    setIsPreparingVoice(true);

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      
      const base64Audio = await aiService.generateSpeech(text);
      
      if (base64Audio && ctx) {
        setIsPreparingVoice(false);
        setIsSpeaking(true);
        const audioBuffer = await audioUtils.decodeAudioData(
          audioUtils.decodeBase64(base64Audio),
          ctx,
          24000,
          1
        );

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          setIsSpeaking(false);
          sourceNodeRef.current = null;
        };
        source.start();
        sourceNodeRef.current = source;
      } else {
        setIsPreparingVoice(false);
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("Speech playback error:", err);
      setIsSpeaking(false);
      setIsPreparingVoice(false);
      showNotification("Interviewer voice failed, please read the question text.", "info");
    }
  }, [getAudioContext, stopSpeaking, showNotification]);

  // Mic Level Visualizer Logic
  const startMicVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setMicLevel(average);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      return () => {
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    } catch (err) {
      console.error("Visualizer failed", err);
    }
  }, [getAudioContext]);

  useEffect(() => {
    if (session?.status === 'ongoing') {
      const currentQuestion = session.questions[session.currentQuestionIndex];
      if (currentQuestion) {
        speakQuestion(currentQuestion.text);
      }
    }
    return () => stopSpeaking();
  }, [session?.currentQuestionIndex, session?.status, speakQuestion, stopSpeaking]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      setTimer(0);
      setMicLevel(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      
      stopSpeaking();
      setIsRecording(true);
      setTranscript('');
      
      // Start Visual Feedback
      startMicVisualizer();
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptSegment = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptSegment;
            } else {
              interimTranscript += transcriptSegment;
            }
          }

          // Combine results more efficiently for real-time feel
          // Use previous final segments + current interim
          setTranscript(prev => {
             // We recreate the whole thing from the event object for accuracy
             let full = '';
             for (let i = 0; i < event.results.length; i++) {
                full += event.results[i][0].transcript;
             }
             return full;
          });
        };

        recognitionRef.current.onerror = (event: any) => {
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            showNotification("Microphone access denied. Please check your browser settings.", "error");
          } else {
            showNotification(`Speech recognition error: ${event.error}`, "error");
          }
        };

        // Auto-restart logic if it cuts out prematurely
        recognitionRef.current.onend = () => {
           if (isRecording) {
             try { recognitionRef.current.start(); } catch(e) {}
           }
        };

        recognitionRef.current.start();
      } else {
        showNotification("Speech recognition is not supported in this browser.", "error");
        setIsRecording(false);
      }
    } catch (err) {
      showNotification("Failed to initialize recording.", "error");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Prevent auto-restart
      recognitionRef.current.stop();
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsRecording(false);
  };

  const handleSubmit = async () => {
    stopRecording();
    if (!transcript.trim()) {
      showNotification("Please provide an answer by speaking.", "info");
      return;
    }
    try {
      await submitAnswer(transcript);
      setTranscript('');
    } catch (err) {
      // Global Notification handles this
    }
  };

  if (!session) return null;

  const currentQuestion = session.questions[session.currentQuestionIndex];
  const progress = ((session.currentQuestionIndex + 1) / MAX_QUESTIONS) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-10rem)] flex flex-col">
      <div className="mb-12">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Question {session.currentQuestionIndex + 1} of {MAX_QUESTIONS}</span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className="h-full bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.4)]"
          />
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentQuestion?.id || 'empty'}
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-14 shadow-2xl border border-slate-100 dark:border-slate-800 text-center mb-10 relative overflow-hidden"
          >
            <AnimatePresence>
              {(isSpeaking || isPreparingVoice) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-0 left-0 w-full h-1.5 bg-indigo-500/5 overflow-hidden"
                >
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-1/3 h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_#6366f1]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block px-4 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8"
            >
              {currentQuestion?.category || 'General'} Evaluation
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
              className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white leading-[1.2]"
            >
              {currentQuestion?.text || 'Finalizing question...'}
            </motion.h2>
            
            {(isSpeaking || isPreparingVoice) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 flex flex-col items-center"
              >
                <div className="flex space-x-1 mb-3 h-4 items-end">
                  {[...Array(5)].map((_, i) => (
                    <motion.span 
                      key={i}
                      animate={{ height: [8, 16, 8] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.6, 
                        delay: i * 0.1,
                        ease: "easeInOut"
                      }}
                      className="w-1 bg-indigo-500 rounded-full"
                    ></motion.span>
                  ))}
                </div>
                <span className="text-[10px] font-black text-indigo-500/60 dark:text-indigo-400/60 uppercase tracking-widest">
                  {isPreparingVoice ? 'Synthesizing voice...' : 'Interviewer active'}
                </span>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full min-h-[160px] bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-[2rem] p-8 mb-10 relative group transition-all hover:border-indigo-300 dark:hover:border-indigo-700"
        >
           {!transcript && !isRecording && (
             <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold px-4 text-center italic tracking-tight opacity-60 group-hover:opacity-100 transition-opacity">
               Select "Start Recording" to provide your response...
             </div>
           )}
           {isRecording && (
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2 text-rose-500 dark:text-rose-400">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                  ></motion.div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Voice Capture Active • {Math.floor(timer/60)}:{(timer%60).toString().padStart(2, '0')}</span>
                </div>
                
                {/* Real-time Sensitivity Bar */}
                <div className="flex items-center space-x-1 h-3">
                   {[...Array(8)].map((_, i) => (
                     <div 
                      key={i}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        micLevel > (i * 15) ? 'bg-emerald-500 h-full' : 'bg-slate-200 dark:bg-slate-700 h-1'
                      }`}
                     />
                   ))}
                </div>
             </div>
           )}
           <p className="text-slate-700 dark:text-slate-200 leading-relaxed italic text-xl font-medium transition-opacity duration-300">
             {transcript || (isRecording ? "Listening to your response..." : "")}
           </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center gap-5 w-full max-w-xl mx-auto">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={loading || isSpeaking || isPreparingVoice}
              className="w-full py-5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-[1.25rem] font-black text-lg flex items-center justify-center space-x-3 hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-200 dark:hover:shadow-none transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>{transcript ? 'Re-record Answer' : 'Start Recording'}</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full py-5 bg-rose-500 dark:bg-rose-600 text-white rounded-[1.25rem] font-black text-lg flex items-center justify-center space-x-3 hover:bg-rose-600 hover:shadow-2xl hover:shadow-rose-200 dark:hover:shadow-none transition-all transform hover:-translate-y-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H10a1 1 0 01-1-1v-4z" />
              </svg>
              <span>Finish Response</span>
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || isRecording || !transcript}
            className={`w-full py-5 rounded-[1.25rem] font-black text-lg transition-all transform hover:-translate-y-1 ${
              loading || isRecording || !transcript
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed hover:translate-y-0'
                : 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 hover:shadow-2xl hover:shadow-emerald-200 dark:hover:shadow-none'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Evaluating...</span>
              </span>
            ) : 'Submit Answer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionPage;
