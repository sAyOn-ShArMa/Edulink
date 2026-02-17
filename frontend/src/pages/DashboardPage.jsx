import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGamificationProfile, recordLoginStreak, getLeaderboard } from '../api/gamification.api';

const studentCards = [
  { title: 'Messages', desc: 'Message your teachers directly', path: '/messages', color: 'bg-blue-500' },
  { title: 'Course Books', desc: 'Browse and download textbooks', path: '/books', color: 'bg-green-500' },
  { title: 'Flashcards', desc: 'Study with AI-generated flashcards', path: '/flashcards', color: 'bg-purple-500' },
  { title: 'Quizzes', desc: 'Test your knowledge with AI quizzes', path: '/quiz', color: 'bg-indigo-500' },
  { title: 'Leaderboard', desc: 'See how you rank among peers', path: '/leaderboard', color: 'bg-yellow-500' },
  { title: 'My Portfolio', desc: 'View and edit your profile', path: '/portfolio', color: 'bg-orange-500' },
  { title: 'Gradesheet', desc: 'Upload grades and get a study plan', path: '/gradesheet', color: 'bg-red-500' },
  { title: 'Classes', desc: 'View your enrolled classes', path: '/classes', color: 'bg-teal-500' },
];

const teacherCards = [
  { title: 'Messages', desc: 'Message your students directly', path: '/messages', color: 'bg-blue-500' },
  { title: 'Course Books', desc: 'Upload textbooks for your classes', path: '/books', color: 'bg-green-500' },
  { title: 'Flashcards', desc: 'View generated flashcard sets', path: '/flashcards', color: 'bg-purple-500' },
  { title: 'Quizzes', desc: 'View generated quizzes', path: '/quiz', color: 'bg-indigo-500' },
  { title: 'Classes', desc: 'View your assigned classes', path: '/classes', color: 'bg-teal-500' },
];

const operatorCards = [
  { title: 'Management', desc: 'Manage users, classes, enrollments & materials', path: '/operator', color: 'bg-amber-500' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [streakInfo, setStreakInfo] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);

  const cards = user?.role === 'operator' ? operatorCards : user?.role === 'teacher' ? teacherCards : studentCards;

  useEffect(() => {
    if (user?.role !== 'student') return;

    // Record daily login and fetch gamification profile in parallel
    Promise.all([
      recordLoginStreak().catch(() => null),
      getGamificationProfile().catch(() => null),
      getLeaderboard().catch(() => null),
    ]).then(([streakRes, profileRes, leaderboardRes]) => {
      if (streakRes?.data) setStreakInfo(streakRes.data);
      if (profileRes?.data) setProfile(profileRes.data);
      if (leaderboardRes?.data) setTopPlayers(leaderboardRes.data.leaderboard.slice(0, 5));
    });
  }, [user]);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.full_name}!</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here's your Edulink dashboard</p>
      </div>

      {/* Gamification widgets for students */}
      {user?.role === 'student' && profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* XP & Level */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Level {profile.xp.level}</span>
              <span className="text-xs text-gray-400">{profile.xp.total} XP</span>
            </div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all"
                style={{ width: `${(profile.xp.progress / 100) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{profile.xp.progress}/100 XP to Level {profile.xp.level + 1}</p>
          </div>

          {/* Streak */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile.streak.current}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Day Streak</p>
              </div>
            </div>
            {streakInfo?.isNewDay && streakInfo?.xpEarned > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">+{streakInfo.xpEarned} XP today!</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Best: {profile.streak.longest} days</p>
          </div>

          {/* Badges */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Badges Earned</p>
            {profile.badges.length === 0 ? (
              <p className="text-xs text-gray-400">Complete activities to earn badges!</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {profile.badges.slice(0, 8).map((b) => (
                  <span key={b.id} className="text-xl" title={`${b.name}: ${b.description}`}>{b.icon}</span>
                ))}
                {profile.badges.length > 8 && (
                  <span className="text-xs text-gray-400 self-center">+{profile.badges.length - 8} more</span>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">{profile.badges.length} total</p>
          </div>

          {/* Mini Leaderboard */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Students</p>
              <Link to="/leaderboard" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View all</Link>
            </div>
            {topPlayers.length === 0 ? (
              <p className="text-xs text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {topPlayers.map((p) => (
                  <div key={p.id} className={`flex items-center gap-2 text-sm ${p.id === user?.id ? 'font-medium text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    <span className="w-4 text-xs text-gray-400">{p.rank}.</span>
                    <span className="flex-1 truncate">{p.full_name}</span>
                    <span className="text-xs font-medium">{p.total_xp} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link key={card.path} to={card.path}
            className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow group">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
              <span className="text-white font-bold text-lg">{card.title[0]}</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{card.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
