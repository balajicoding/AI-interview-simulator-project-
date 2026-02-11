
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInterview } from '../context/InterviewContext';
import { InterviewType, ExperienceLevel, InterviewConfig } from '../types';
import { COMPANIES, ROLES, DIFFICULTIES } from '../constants';

const SetupPage: React.FC = () => {
  const { startInterview, loading } = useInterview();
  const navigate = useNavigate();

  const [config, setConfig] = useState<InterviewConfig>({
    type: InterviewType.MIXED,
    role: ROLES[0],
    experience: ExperienceLevel.FRESHER,
    company: COMPANIES[0],
    difficulty: DIFFICULTIES[1]
  });

  const handleStart = async () => {
    await startInterview(config);
    navigate('/session');
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 md:p-12"
      >
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Configure Your Interview</h1>
          <p className="text-slate-500 dark:text-slate-400">Personalize the simulation to match your target job profile.</p>
        </div>

        <div className="space-y-8">
          {/* Interview Type */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Interview Category</label>
            <div className="grid grid-cols-3 gap-4">
              {Object.values(InterviewType).map((type) => (
                <button
                  key={type}
                  onClick={() => setConfig({ ...config, type })}
                  className={`py-4 px-2 rounded-xl border-2 transition-all font-semibold ${
                    config.type === type 
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 shadow-sm' 
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Target Role</label>
              <select 
                value={config.role}
                onChange={(e) => setConfig({ ...config, role: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
              >
                {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>

            {/* Experience Selection */}
            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Experience Level</label>
                <div className="flex rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1">
                    {Object.values(ExperienceLevel).map((lvl) => (
                        <button
                            key={lvl}
                            onClick={() => setConfig({ ...config, experience: lvl })}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                config.experience === lvl 
                                ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
             {/* Company Selection */}
             <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Target Company</label>
              <select 
                value={config.company}
                onChange={(e) => setConfig({ ...config, company: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
              >
                {COMPANIES.map(comp => <option key={comp} value={comp}>{comp}</option>)}
              </select>
            </div>

            {/* Difficulty Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Difficulty</label>
              <select 
                value={config.difficulty}
                onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
              >
                {DIFFICULTIES.map(diff => <option key={diff} value={diff}>{diff}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleStart}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg ${
                loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Preparing Session...
                </span>
              ) : 'Launch Interview Simulator'}
            </button>
            <p className="text-center text-slate-400 dark:text-slate-500 text-sm mt-4">
              Estimated duration: 15-20 minutes
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SetupPage;
