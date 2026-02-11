
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const DemoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const features = [
    {
      icon: '🎯',
      title: 'Precision Simulation',
      desc: 'Simulate realistic interviews for 25+ roles specifically tailored to companies like TCS, Google, and Amazon.'
    },
    {
      icon: '🎙️',
      title: 'Voice-First Interaction',
      desc: 'The AI interviewer speaks to you using native browser TTS. You respond naturally with your voice, just like a real interview.'
    },
    {
      icon: '🧠',
      title: 'Semantic Intelligence',
      desc: 'Powered by Llama 3 (Groq), our AI evaluates the logical structure and technical depth of your answers, not just word count.'
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      desc: 'Get a deep dive into your performance with radar charts, sentiment indicators, and actionable feedback for every answer.'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-8 sm:p-12">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">How HireAI Works</h2>
                  <p className="text-slate-500 dark:text-slate-400">Master your next career move in 4 simple steps.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {features.map((f, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex space-x-4"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-2xl shadow-inner">
                      {f.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{f.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Industry-Aligned Preparation</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest mt-0.5">Project Significance</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  "HireAI addresses the 'Interview Gap' by providing a safe, intelligent environment to refine technical articulation and behavioral soft skills before the real pressure."
                </p>
              </div>

              <button 
                onClick={onClose}
                className="w-full mt-8 py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
              >
                Got it, let's practice!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const LandingPage: React.FC = () => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  return (
    <div className="overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-violet-100/50 dark:bg-violet-900/20 rounded-full blur-3xl"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="container mx-auto px-4 text-center max-w-4xl"
        >
          <span className="px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-6 inline-block">
            Master Your Next Interview
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white mb-8 leading-tight">
            Advanced <span className="text-indigo-600 dark:text-indigo-400">AI-Powered</span> Interview Preparation
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
            Simulate realistic technical and HR interviews with top companies. Get semantic feedback, detailed analytics, and actionable tips.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/setup" 
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-xl shadow-indigo-200 dark:shadow-none"
            >
              Start Free Interview
            </Link>
            <button 
              onClick={() => setIsDemoOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              Watch Demo
            </button>
          </div>
        </motion.div>

        {/* Floating Stats */}
        <div className="mt-20 container mx-auto px-4">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                    { label: 'Role Specific', value: '25+ Roles' },
                    { label: 'Top Companies', value: '10+ Companies' },
                    { label: 'AI Insights', value: 'Instant' },
                    { label: 'Success Rate', value: '94%' }
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center"
                    >
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{stat.label}</div>
                    </motion.div>
                ))}
           </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Why Choose HireAI?</h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Our platform goes beyond generic Q&A by using semantic AI to understand the core of your answers.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
                {[
                    { title: 'Company Specific', desc: 'Prepare for Google, Microsoft, TCS, or Infosys with curated, scenario-based questions.' },
                    { title: 'Semantic Scoring', desc: 'Your scores reflect clarity and logic, not just how long you talk.' },
                    { title: 'Deep Analytics', desc: 'Visualise your performance with radar charts and confidence trends.' }
                ].map((feat, i) => (
                    <div key={i} className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6">
                            <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-lg"></div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feat.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
