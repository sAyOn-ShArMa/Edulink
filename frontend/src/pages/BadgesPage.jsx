import { useState, useEffect } from 'react';
import { getAllBadges } from '../api/gamification.api';

const criteriaLabels = {
  flashcard_sets_completed: 'Complete {value} flashcard set(s)',
  quizzes_completed: 'Complete {value} quiz(zes)',
  perfect_quiz: 'Get a perfect score on a quiz',
  total_xp: 'Earn {value} XP',
  streak: 'Maintain a {value}-day login streak',
  daily_login: 'Log in for the first time',
};

function getUnlockHint(badge) {
  const template = criteriaLabels[badge.criteria_type];
  if (!template) return badge.description;
  return template.replace('{value}', badge.criteria_value.toLocaleString());
}

export default function BadgesPage() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getAllBadges()
      .then((res) => setBadges(res.data.badges))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);
  const filtered = filter === 'earned' ? earned : filter === 'locked' ? locked : badges;

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Badges</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {earned.length} of {badges.length} unlocked
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'earned', label: `Earned (${earned.length})` },
          { key: 'locked', label: `Locked (${locked.length})` },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.key ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filter === 'earned' ? 'No badges earned yet. Keep studying!' : 'No locked badges remaining!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((badge) => (
            <div key={badge.id}
              className={`bg-white dark:bg-gray-900 rounded-xl border p-5 transition-all ${badge.earned ? 'border-primary-200 dark:border-primary-800' : 'border-gray-200 dark:border-gray-700 opacity-60'}`}>
              <div className="flex items-start gap-4">
                <span className={`text-4xl ${badge.earned ? '' : 'grayscale'}`}>{badge.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${badge.earned ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {badge.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{badge.description}</p>

                  {badge.earned ? (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      Earned {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  ) : (
                    <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">How to unlock:</span> {getUnlockHint(badge)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
