import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClassesPage from './pages/ClassesPage';
import CourseBooksPage from './pages/CourseBooksPage';
import FlashcardPage from './pages/FlashcardPage';
import GradesheetPage from './pages/GradesheetPage';
import OperatorPage from './pages/OperatorPage';
import DirectMessagesPage from './pages/DirectMessagesPage';
import QuizPage from './pages/QuizPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BadgesPage from './pages/BadgesPage';

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />

      <Route path="/" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/classes" element={<ProtectedRoute><AppLayout><ClassesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/books" element={<ProtectedRoute><AppLayout><CourseBooksPage /></AppLayout></ProtectedRoute>} />
      <Route path="/flashcards" element={<ProtectedRoute><AppLayout><FlashcardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/gradesheet" element={<ProtectedRoute><AppLayout><GradesheetPage /></AppLayout></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><AppLayout><DirectMessagesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/quiz" element={<ProtectedRoute><AppLayout><QuizPage /></AppLayout></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><AppLayout><LeaderboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/badges" element={<ProtectedRoute><AppLayout><BadgesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/operator" element={<ProtectedRoute><AppLayout><OperatorPage /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
