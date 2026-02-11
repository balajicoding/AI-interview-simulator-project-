
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/profile');
    } catch (err: any) {
      // Error is now handled by the context/NotificationProvider
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950 transition-colors">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        <div className="flex justify-center mb-6">
           <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
              <span className="text-white font-bold text-2xl">H</span>
           </div>
        </div>
        <h2 className="text-3xl font-bold text-center mb-8 text-slate-900 dark:text-white">Welcome Back</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 transition-colors"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
              {/* Fixed: Removed non-existent size prop from Link component */}
              <Link to="/forgot-password" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 transition-colors pr-10"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.888 9.888L3 3m18 18l-6.888-6.888" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-500 dark:text-slate-400 text-sm">
          Don't have an account? <Link to="/signup" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Sign Up</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
