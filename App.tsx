
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { InterviewProvider } from './context/InterviewContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AIChatbot from './components/AIChatbot';
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/ProfilePage';
import SetupPage from './pages/SetupPage';
import SessionPage from './pages/SessionPage';
import ResultsPage from './pages/ResultsPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InterviewProvider>
          <Router>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/setup" element={<SetupPage />} />
                  <Route path="/session" element={<SessionPage />} />
                  <Route path="/results" element={<ResultsPage />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
              <footer className="py-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
                <div className="container mx-auto px-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                  © 2024 HireAI Interview Simulator. Built for Excellence.
                </div>
              </footer>
              <AIChatbot />
            </div>
          </Router>
        </InterviewProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
