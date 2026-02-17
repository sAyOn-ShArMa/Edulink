import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {user && (
          <button onClick={onMenuToggle} className="md:hidden p-1 -ml-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Edulink" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-xl font-bold text-gray-900 dark:text-white">Edulink</span>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme toggle */}
        <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {dark ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {user && (
          <>
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">{user.full_name}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.role === 'operator' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : user.role === 'teacher' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
              {user.role}
            </span>
            <button onClick={handleLogout} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
