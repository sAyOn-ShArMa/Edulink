import api from './axios';

export const getGamificationProfile = () => api.get('/gamification/profile');
export const recordLoginStreak = () => api.post('/gamification/login-streak');
export const completeFlashcardSet = (setId, correct, total) =>
  api.post('/gamification/flashcard-complete', { setId, correct, total });
export const completeQuiz = (quizSetId, score, total) =>
  api.post('/gamification/quiz-complete', { quizSetId, score, total });
export const getLeaderboard = (classId) =>
  api.get(`/gamification/leaderboard${classId ? `?classId=${classId}` : ''}`);
export const getAllBadges = () => api.get('/gamification/badges');
export const getXPHistory = () => api.get('/gamification/xp-history');
