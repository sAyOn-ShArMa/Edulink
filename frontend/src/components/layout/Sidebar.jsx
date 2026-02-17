import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const linkClass = ({ isActive }) =>
  `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'}`;

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-57px)] p-4 flex flex-col gap-1
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        {/* Mobile close button */}
        <div className="flex items-center justify-between mb-2 md:hidden">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Menu</span>
          <button onClick={onClose} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <NavLink to="/" className={linkClass} end onClick={onClose}>Dashboard</NavLink>

        {user?.role === 'operator' && (
          <NavLink to="/operator" className={linkClass} onClick={onClose}>Management</NavLink>
        )}

        {(user?.role === 'teacher' || user?.role === 'student') && (
          <>
            <NavLink to="/classes" className={linkClass} onClick={onClose}>Classes</NavLink>
            <NavLink to="/messages" className={linkClass} onClick={onClose}>Messages</NavLink>
            <NavLink to="/books" className={linkClass} onClick={onClose}>Course Books</NavLink>
            <NavLink to="/flashcards" className={linkClass} onClick={onClose}>Flashcards</NavLink>
            <NavLink to="/quiz" className={linkClass} onClick={onClose}>Quizzes</NavLink>
          </>
        )}

        {user?.role === 'student' && (
          <>
            <NavLink to="/leaderboard" className={linkClass} onClick={onClose}>Leaderboard</NavLink>
            <NavLink to="/portfolio" className={linkClass} onClick={onClose}>My Portfolio</NavLink>
            <NavLink to="/gradesheet" className={linkClass} onClick={onClose}>Gradesheet</NavLink>
          </>
        )}
      </aside>
    </>
  );
}
