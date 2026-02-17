import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../api/gamification.api';
import { getMyClasses } from '../api/class.api';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyClasses().then((res) => {
      setClasses(res.data.classes);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(selectedClassId || undefined)
      .then((res) => setLeaderboard(res.data.leaderboard))
      .finally(() => setLoading(false));
  }, [selectedClassId]);

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
    if (rank === 2) return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
    if (rank === 3) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    return 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700';
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">See how you rank among your peers</p>
        </div>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">All Students</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading leaderboard...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No students found. Start earning XP!</div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-shadow hover:shadow-md ${getRankStyle(entry.rank)} ${entry.id === user?.id ? 'ring-2 ring-primary-500' : ''}`}
            >
              {/* Rank */}
              <div className="w-10 text-center text-lg font-bold text-gray-700 dark:text-gray-300">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold text-sm flex-shrink-0">
                {entry.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${entry.id === user?.id ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                  {entry.full_name} {entry.id === user?.id && '(You)'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Level {entry.level}</p>
              </div>

              {/* Streak */}
              {entry.streak > 0 && (
                <div className="text-sm text-orange-500 font-medium flex items-center gap-1">
                  <span>🔥</span> {entry.streak}
                </div>
              )}

              {/* XP */}
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">{entry.total_xp}</p>
                <p className="text-xs text-gray-400">XP</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
