
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, Cell
} from 'recharts';
import { useInterview } from '../context/InterviewContext';
import { useTheme } from '../context/ThemeContext';

const ConfidenceGauge = ({ value }: { value: number }) => {
  const { theme } = useTheme();
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-48 h-48 transform -rotate-90">
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-slate-100 dark:text-slate-800"
        />
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-indigo-600 dark:text-indigo-400 transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-black text-slate-800 dark:text-white">{value}%</span>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Confidence</span>
      </div>
    </div>
  );
};

const ResultsPage: React.FC = () => {
  const { session, resetInterview } = useInterview();
  const { theme } = useTheme();
  const navigate = useNavigate();

  if (!session || session.status !== 'completed' || session.answers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 text-center max-w-md">
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">No Session Data Found</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-6">Complete an interview session to see your detailed analytics and feedback.</p>
           <button onClick={() => navigate('/setup')} className="w-full px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all">
             Start Interview
           </button>
        </div>
      </div>
    );
  }

  // Aggregate stats
  const count = session.answers.length;
  const avgScores = session.answers.reduce((acc, ans) => {
    if (!ans.evaluation) return acc;
    acc.relevance += ans.evaluation.relevance;
    acc.clarity += ans.evaluation.clarity;
    acc.confidence += ans.evaluation.confidence;
    acc.techDepth += ans.evaluation.technical_depth;
    acc.overall += ans.evaluation.overall_score;
    return acc;
  }, { relevance: 0, clarity: 0, confidence: 0, techDepth: 0, overall: 0 });

  const metricsData = [
    { subject: 'Relevance', A: (avgScores.relevance / count) * 10 },
    { subject: 'Clarity', A: (avgScores.clarity / count) * 10 },
    { subject: 'Confidence', A: (avgScores.confidence / count) * 10 },
    { subject: 'Tech Depth', A: (avgScores.techDepth / count) * 10 },
    { subject: 'Logic', A: (avgScores.clarity / count) * 10 },
  ];

  const categoryBarData = [
    { name: 'Relevance', score: Math.round((avgScores.relevance / count) * 10), fill: '#4f46e5' },
    { name: 'Clarity', score: Math.round((avgScores.clarity / count) * 10), fill: '#6366f1' },
    { name: 'Confidence', score: Math.round((avgScores.confidence / count) * 10), fill: '#818cf8' },
    { name: 'Tech Depth', score: Math.round((avgScores.techDepth / count) * 10), fill: '#a5b4fc' },
  ];

  const progressionData = session.answers.map((ans, i) => ({
    name: `Q${i+1}`,
    score: ans.evaluation?.overall_score || 0
  }));

  const overallAvg = Math.round(avgScores.overall / count);
  const avgConfidence = Math.round((avgScores.confidence / count) * 10);
  const mainSentiment = session.answers[session.answers.length - 1].evaluation?.sentiment || "Professional";

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
    return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400';
  };

  const chartTextColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Concise Session Summary Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center space-x-6">
          <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-black text-2xl shadow-inner ${getScoreColor(overallAvg)}`}>
            {overallAvg}
            <span className="text-[10px] opacity-60 font-bold uppercase">Score</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {session.config.role}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Interview at <span className="text-indigo-600 dark:text-indigo-400">{session.config.company}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden lg:block h-10 w-px bg-slate-200 dark:bg-slate-800 mx-4"></div>
          <div className="text-center md:text-left">
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sentiment</div>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{mainSentiment}</div>
          </div>
          <div className="hidden lg:block h-10 w-px bg-slate-200 dark:bg-slate-800 mx-4"></div>
          <button 
            onClick={() => { resetInterview(); navigate('/setup'); }}
            className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all"
          >
            New Session
          </button>
        </div>
      </motion.div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Performance Overview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-colors"
        >
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Final Proficiency</div>
          <div className={`text-7xl font-black mb-2 ${getScoreColor(overallAvg).split(' ')[0]}`}>{overallAvg}</div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Score</div>
          <div className={`mt-6 inline-block px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${getScoreColor(overallAvg)}`}>
            {overallAvg >= 80 ? 'EXPERT' : overallAvg >= 60 ? 'COMPETENT' : 'DEVELOPING'}
          </div>
        </motion.div>

        {/* Confidence Gauge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center transition-colors"
        >
          <ConfidenceGauge value={avgConfidence} />
        </motion.div>

        {/* Competency Radar */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 lg:col-span-2 transition-colors"
        >
           <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2 text-center md:text-left">Competency Mapping</div>
           <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={metricsData}>
                  <PolarGrid stroke={gridColor} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: chartTextColor, fontSize: 10, fontWeight: 600 }} />
                  <Radar name="Score" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} strokeWidth={3} />
                </RadarChart>
              </ResponsiveContainer>
           </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feedback List */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8">Detailed Competency Scores</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" tick={{ fill: chartTextColor, fontSize: 12, fontWeight: 500 }} width={100} />
                  <Tooltip 
                    cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      background: theme === 'dark' ? '#1e293b' : '#fff', 
                      color: theme === 'dark' ? '#fff' : '#000',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
                    {categoryBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white px-2">Response History & Analysis</h3>
            {session.answers.map((ans, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center space-x-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold">
                      {i + 1}
                    </span>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-snug">{ans.questionText}</h4>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl font-black text-xl self-end md:self-auto ${getScoreColor(ans.evaluation?.overall_score || 0).split(' ')[0]}`}>
                    {ans.evaluation?.overall_score}<span className="text-sm opacity-60">/100</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 transition-colors">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Transcribed Response</span>
                    <p className="text-slate-600 dark:text-slate-300 italic text-sm leading-relaxed">"{ans.answerText}"</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div>
                      <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block mb-3 underline decoration-indigo-200 dark:decoration-indigo-900 underline-offset-4">Critical Feedback</span>
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">{ans.evaluation?.feedback}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block mb-3 underline decoration-emerald-200 dark:decoration-emerald-900 underline-offset-4">Improvement Path</span>
                      <ul className="space-y-2">
                        {ans.evaluation?.improvement_tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 flex-shrink-0"></span>
                            <span className="text-slate-600 dark:text-slate-400 text-xs">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </section>
        </div>

        {/* Actionable Side Panel */}
        <div className="space-y-8">
           <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
             <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Performance Flow</h3>
             <div className="h-40">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={progressionData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                   <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: chartTextColor }} />
                   <YAxis hide domain={[0, 100]} />
                   <Tooltip 
                     contentStyle={{ 
                       borderRadius: '12px', 
                       background: theme === 'dark' ? '#1e293b' : '#fff',
                       border: 'none',
                       color: theme === 'dark' ? '#fff' : '#000'
                     }} 
                   />
                   <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#4f46e5" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }} 
                      activeDot={{ r: 8, strokeWidth: 0 }}
                   />
                 </LineChart>
               </ResponsiveContainer>
             </div>
             <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 leading-relaxed text-center font-medium">
               Consistency across different questions indicates technical stability.
             </p>
           </section>

           <section className="bg-gradient-to-br from-slate-900 to-indigo-950 dark:from-indigo-950 dark:to-slate-950 rounded-3xl p-8 text-white shadow-xl">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
                  {mainSentiment.toLowerCase().includes('positive') || mainSentiment.toLowerCase().includes('confident') ? '🚀' : '⚖️'}
                </div>
                <div>
                   <h3 className="text-lg font-bold">Semantic Tone</h3>
                   <p className="text-indigo-300 text-xs font-medium">{mainSentiment}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-indigo-200 uppercase mb-2">
                    <span>Professionalism</span>
                    <span>High</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full">
                    <div className="bg-indigo-400 h-full rounded-full w-[90%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-indigo-200 uppercase mb-2">
                    <span>Logic Flow</span>
                    <span>Moderate</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full">
                    <div className="bg-indigo-400 h-full rounded-full w-[65%]"></div>
                  </div>
                </div>
              </div>

              <p className="mt-8 text-xs text-indigo-100/70 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10 italic">
                Focus on structured reasoning for scenario-based questions in future sessions.
              </p>
           </section>

           <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative transition-colors">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Competency Map</h3>
              <div className="grid grid-cols-4 gap-2">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-8 rounded-md transition-all duration-500 ${
                      i < 4 ? 'bg-indigo-600 dark:bg-indigo-500' : i < 8 ? 'bg-indigo-300 dark:bg-indigo-700/50' : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                  ></div>
                ))}
              </div>
              <div className="mt-4 flex justify-between text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                <span>Core</span>
                <span>System</span>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
