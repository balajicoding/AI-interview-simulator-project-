
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification, NotificationType } from '../context/NotificationContext';

const icons = {
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const styles = {
  error: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800',
  info: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800',
};

const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md min-w-[280px] max-w-md ${styles[n.type]}`}
          >
            <div className="flex-shrink-0">{icons[n.type]}</div>
            <p className="text-sm font-semibold flex-grow">{n.message}</p>
            <button
              onClick={() => removeNotification(n.id)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
