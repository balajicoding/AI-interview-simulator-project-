
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { db } from '../services/databaseService';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'EMAIL' | 'OTP' | 'RESET';

const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockEmailVisible, setMockEmailVisible] = useState(false);
  
  const { resetPassword } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const users = await db.getUsers();
      if (!users.some(u => u.email === email)) {
        showNotification("No account found with this email address.", "error");
        setLoading(false);
        return;
      }

      // Generate a realistic 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      
      // Simulate network delay
      setTimeout(() => {
        setMockEmailVisible(true);
        showNotification("Verification code sent! Check the 'Mock Inbox' at the top.", "success");
        setStep('OTP');
        setLoading(false);
      }, 1500);
    } catch (err: any) {
      showNotification("An error occurred. Please try again.", "error");
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === generatedOtp) {
      setStep('RESET');
      setMockEmailVisible(false);
      showNotification("Code verified successfully.", "success");
    } else {
      showNotification("Invalid verification code. Please try again.", "error");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showNotification("Password must be at least 6 characters.", "error");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, newPassword);
      showNotification("Password updated! Redirecting to login...", "success");
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      showNotification("Failed to reset password.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950 transition-colors relative">
      
      {/* Mock Email Inbox Notification for Presentation */}
      <AnimatePresence>
        {mockEmailVisible && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[110] w-full max-w-sm"
          >
            <div className="bg-white dark:bg-slate-800 border-2 border-indigo-500 rounded-2xl shadow-2xl p-4 overflow-hidden">
               <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-lg">📧</div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Mock Inbox</span>
                  </div>
                  <button onClick={() => setMockEmailVisible(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
               </div>
               <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">HireAI Recovery Code</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Hi Candidate, your verification code is:</p>
                  <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-widest bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg text-center border border-indigo-100 dark:border-indigo-900/50">
                    {generatedOtp}
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-xl"
      >
        <div className="flex justify-center mb-6">
           <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
              <span className="text-white font-bold text-2xl">H</span>
           </div>
        </div>
        
        <h2 className="text-3xl font-black text-center mb-2 text-slate-900 dark:text-white">Secure Recovery</h2>
        <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-10">
          {step === 'EMAIL' && "Enter your registered email to receive a recovery code."}
          {step === 'OTP' && `Check your simulated inbox for a 6-digit code.`}
          {step === 'RESET' && "Verification complete. Enter your new password."}
        </p>

        <AnimatePresence mode="wait">
          {step === 'EMAIL' && (
            <motion.form 
              key="step-email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRequestOtp} 
              className="space-y-6"
            >
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white font-medium"
                  placeholder="e.g. name@example.com"
                />
              </div>
              <button className="w-full py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 dark:shadow-none">
                {loading && <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>}
                <span>Send Verification Code</span>
              </button>
            </motion.form>
          )}

          {step === 'OTP' && (
            <motion.form 
              key="step-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp} 
              className="space-y-8"
            >
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Enter 6-Digit Code</label>
                <input 
                  type="text" 
                  required 
                  maxLength={6} 
                  value={otpInput} 
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900 rounded-2xl outline-none focus:border-indigo-500 transition-all text-center text-4xl font-black tracking-[0.5em] text-indigo-600 dark:text-indigo-400"
                  placeholder="000000"
                />
              </div>
              <div className="flex flex-col gap-4">
                <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none">
                  Verify & Continue
                </button>
                <div className="flex justify-between items-center px-2">
                  <button type="button" onClick={() => setStep('EMAIL')} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                    Wrong Email?
                  </button>
                  <button type="button" onClick={() => showNotification("Code resent! Check mock inbox.", "info")} className="text-xs font-bold text-indigo-600 hover:underline">
                    Resend Code
                  </button>
                </div>
              </div>
            </motion.form>
          )}

          {step === 'RESET' && (
            <motion.form 
              key="step-reset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleResetPassword} 
              className="space-y-6"
            >
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">New Password</label>
                <input 
                  type="password" 
                  required 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white font-medium"
                  placeholder="At least 6 characters"
                />
              </div>
              <button className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 dark:shadow-none">
                {loading && <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>}
                Update Password
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
          <Link to="/login" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
