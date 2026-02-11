
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db, UserProfile } from '../services/databaseService';
import { InterviewSession } from '../types';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
    if (user) {
      setEditedProfile(user);
      loadHistory();
    }
  }, [user, authLoading, navigate]);

  const loadHistory = async () => {
    if (user) {
      try {
        const h = await db.getHistory(user.id);
        setHistory(h);
      } catch {
        setHistory([]);
      }
    }
  };

  const handleSave = async () => {
    if (editedProfile) {
      try {
        setSaving(true);
        await db.updateProfile(editedProfile);
        await refreshProfile();
        setIsEditing(false);
      } finally {
        setSaving(false);
      }
    }
  };

  const addSkill = (skill: string) => {
    if (editedProfile && skill && !editedProfile.skills.includes(skill)) {
      setEditedProfile({
        ...editedProfile,
        skills: [...editedProfile.skills, skill]
      });
    }
  };

  const removeSkill = (skill: string) => {
    if (editedProfile) {
      setEditedProfile({
        ...editedProfile,
        skills: editedProfile.skills.filter(s => s !== skill)
      });
    }
  };

  if (authLoading || !user || !editedProfile) return (
    <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="grid md:grid-cols-4 gap-8">
        {/* Sidebar Info */}
        <div className="md:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center shadow-sm"
          >
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-4xl">
                {user.avatar}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-xs">
                  📸
                </button>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{user.headline}</p>
            
            <div className="flex flex-wrap justify-center gap-2">
              {user.skills.map((skill, idx) => (
                <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Analytics Overview</h3>
            <div className="space-y-4">
               <div>
                  <div className="text-2xl font-black text-indigo-600">{history.length}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Simulations Done</div>
               </div>
               <div>
                  <div className="text-2xl font-black text-emerald-500">
                    {history.length > 0 ? Math.round(history.reduce((a, b) => a + (b.answers.length > 0 ? b.answers.reduce((acc, cur) => acc + (cur.evaluation?.overall_score || 0), 0) / b.answers.length : 0), 0) / history.length) : 0}%
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Proficiency</div>
               </div>
            </div>
          </motion.div>
        </div>

        {/* Main Section */}
        <div className="md:col-span-3 space-y-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Profile Details</h2>
            <button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isEditing 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                key="edit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Full Name</label>
                    <input 
                      value={editedProfile.name}
                      onChange={e => setEditedProfile({...editedProfile, name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Headline</label>
                    <input 
                      value={editedProfile.headline}
                      onChange={e => setEditedProfile({...editedProfile, headline: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Professional Bio</label>
                  <textarea 
                    value={editedProfile.bio}
                    onChange={e => setEditedProfile({...editedProfile, bio: e.target.value})}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Skills (Enter to add)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editedProfile.skills.map(s => (
                      <span key={s} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg text-xs font-bold flex items-center space-x-2">
                        <span>{s}</span>
                        <button onClick={() => removeSkill(s)} className="hover:text-rose-500">×</button>
                      </span>
                    ))}
                  </div>
                  <input 
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        addSkill(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    placeholder="Type skill and press Enter..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                   <h3 className="text-lg font-bold mb-4">Professional Bio</h3>
                   <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                     {user.bio || "No bio added yet. Tell us about your professional journey!"}
                   </p>
                </div>

                <section>
                  <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
                  {history.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center">
                      <p className="text-slate-500">No interviews recorded yet. Start your first practice session!</p>
                      <button onClick={() => navigate('/setup')} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Start Now</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item, i) => {
                        const avgScore = Math.round(item.answers.reduce((acc, cur) => acc + (cur.evaluation?.overall_score || 0), 0) / item.answers.length);
                        return (
                          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center font-bold text-indigo-600">
                                {item.config.company[0]}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200">{item.config.company} • {item.config.role}</h4>
                                <p className="text-xs text-slate-400">{new Date(item.startTime).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-black text-lg ${avgScore >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{avgScore}%</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Completed</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
