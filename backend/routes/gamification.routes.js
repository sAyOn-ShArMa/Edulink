const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/gamification.controller');

// All routes require authentication
router.use(auth);

// Student gamification profile (XP, streak, badges)
router.get('/profile', ctrl.getProfile);

// Record daily login for streak tracking
router.post('/login-streak', ctrl.recordLogin);

// Record flashcard set completion with XP award
router.post('/flashcard-complete', ctrl.flashcardComplete);

// Record quiz completion with XP award
router.post('/quiz-complete', ctrl.quizComplete);

// Class or global leaderboard
router.get('/leaderboard', ctrl.getLeaderboard);

// All badge definitions with earned status
router.get('/badges', ctrl.getAllBadges);

// Recent XP history
router.get('/xp-history', ctrl.getXPHistory);

module.exports = router;
