const db = require('../config/db');

// XP amounts for different actions
const XP_VALUES = {
  DAILY_LOGIN: 10,
  FLASHCARD_CORRECT: 5,
  FLASHCARD_SET_COMPLETE: 25,
  QUIZ_CORRECT_ANSWER: 10,
  QUIZ_COMPLETE: 20,
  QUIZ_PERFECT: 50,
  STREAK_BONUS_3: 15,
  STREAK_BONUS_7: 30,
  STREAK_BONUS_30: 100,
};

const MAX_LEVEL = 150;

// XP needed to go from (level) to (level + 1)
// Levels 1-9: 100 XP per level, 10-49: 1,000 XP per level, 50-149: 10,000 XP per level
function xpForLevel(level) {
  if (level < 10) return 100;
  if (level < 50) return 1000;
  return 10000;
}

// Cumulative XP required to reach a given level
function getLevelThreshold(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpForLevel(l);
  }
  return total;
}

function calculateLevel(totalXp) {
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= getLevelThreshold(level + 1)) {
    level++;
  }
  return level;
}

// Award XP to a student and check for badge unlocks
function awardXP(studentId, amount, source, sourceId = null) {
  // Ensure student_xp row exists
  const existing = db.prepare('SELECT * FROM student_xp WHERE student_id = ?').get(studentId);
  if (!existing) {
    db.prepare('INSERT INTO student_xp (student_id, total_xp, level) VALUES (?, ?, ?)').run(studentId, 0, 1);
  }

  // Add XP
  db.prepare('UPDATE student_xp SET total_xp = total_xp + ?, level = ? WHERE student_id = ?')
    .run(amount, calculateLevel((existing?.total_xp || 0) + amount), studentId);

  // Log the XP event
  db.prepare('INSERT INTO xp_log (student_id, xp_amount, source, source_id) VALUES (?, ?, ?, ?)')
    .run(studentId, amount, source, sourceId);

  // Check for XP-based badges
  const updatedXp = db.prepare('SELECT total_xp FROM student_xp WHERE student_id = ?').get(studentId);
  checkAndAwardBadges(studentId, 'total_xp', updatedXp.total_xp);

  return updatedXp.total_xp;
}

// Check badge criteria and award if earned
function checkAndAwardBadges(studentId, criteriaType, currentValue) {
  const badges = db.prepare(
    'SELECT * FROM badges WHERE criteria_type = ? AND criteria_value <= ?'
  ).all(criteriaType, currentValue);

  const newBadges = [];
  for (const badge of badges) {
    const alreadyEarned = db.prepare(
      'SELECT id FROM student_badges WHERE student_id = ? AND badge_id = ?'
    ).get(studentId, badge.id);
    if (!alreadyEarned) {
      db.prepare('INSERT INTO student_badges (student_id, badge_id) VALUES (?, ?)').run(studentId, badge.id);
      newBadges.push(badge);
    }
  }
  return newBadges;
}

// GET /api/gamification/profile — Get student's gamification profile
exports.getProfile = (req, res) => {
  try {
    const studentId = req.user.id;

    // Get or create XP record
    let xp = db.prepare('SELECT * FROM student_xp WHERE student_id = ?').get(studentId);
    if (!xp) {
      db.prepare('INSERT INTO student_xp (student_id, total_xp, level) VALUES (?, 0, 1)').run(studentId);
      xp = { total_xp: 0, level: 1 };
    }

    // Get streak info
    let streak = db.prepare('SELECT * FROM student_streaks WHERE student_id = ?').get(studentId);
    if (!streak) {
      streak = { current_streak: 0, longest_streak: 0, last_login_date: null };
    }

    // Get earned badges
    const badges = db.prepare(`
      SELECT b.*, sb.earned_at
      FROM student_badges sb
      JOIN badges b ON b.id = sb.badge_id
      WHERE sb.student_id = ?
      ORDER BY sb.earned_at DESC
    `).all(studentId);

    // XP needed for next level
    const currentLevelThreshold = getLevelThreshold(xp.level);
    const nextLevelThreshold = getLevelThreshold(xp.level + 1);
    const xpProgress = xp.total_xp - currentLevelThreshold;
    const xpNeeded = nextLevelThreshold - currentLevelThreshold;

    res.json({
      xp: {
        total: xp.total_xp,
        level: xp.level,
        progress: xpProgress,
        xpNeeded: xpNeeded,
        nextLevelAt: nextLevelThreshold,
      },
      streak: {
        current: streak.current_streak,
        longest: streak.longest_streak,
        lastLoginDate: streak.last_login_date,
      },
      badges,
    });
  } catch (err) {
    console.error('Get gamification profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// POST /api/gamification/login-streak — Record daily login and update streak
exports.recordLogin = (req, res) => {
  try {
    const studentId = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    let streak = db.prepare('SELECT * FROM student_streaks WHERE student_id = ?').get(studentId);

    if (!streak) {
      // First ever login
      db.prepare('INSERT INTO student_streaks (student_id, current_streak, longest_streak, last_login_date) VALUES (?, 1, 1, ?)')
        .run(studentId, today);
      awardXP(studentId, XP_VALUES.DAILY_LOGIN, 'daily_login');
      checkAndAwardBadges(studentId, 'daily_login', 1);
      checkAndAwardBadges(studentId, 'streak', 1);

      return res.json({
        streak: 1,
        longest: 1,
        xpEarned: XP_VALUES.DAILY_LOGIN,
        isNewDay: true,
      });
    }

    if (streak.last_login_date === today) {
      // Already logged in today
      return res.json({
        streak: streak.current_streak,
        longest: streak.longest_streak,
        xpEarned: 0,
        isNewDay: false,
      });
    }

    // Check if yesterday was the last login (consecutive day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak;
    let bonusXP = 0;

    if (streak.last_login_date === yesterdayStr) {
      // Consecutive day — increment streak
      newStreak = streak.current_streak + 1;
    } else {
      // Streak broken — reset to 1
      newStreak = 1;
    }

    const newLongest = Math.max(newStreak, streak.longest_streak);

    db.prepare('UPDATE student_streaks SET current_streak = ?, longest_streak = ?, last_login_date = ? WHERE student_id = ?')
      .run(newStreak, newLongest, today, studentId);

    // Award daily login XP
    let totalXpEarned = XP_VALUES.DAILY_LOGIN;
    awardXP(studentId, XP_VALUES.DAILY_LOGIN, 'daily_login');

    // Streak milestone bonuses
    if (newStreak === 3) {
      bonusXP = XP_VALUES.STREAK_BONUS_3;
      awardXP(studentId, bonusXP, 'streak_bonus_3');
    } else if (newStreak === 7) {
      bonusXP = XP_VALUES.STREAK_BONUS_7;
      awardXP(studentId, bonusXP, 'streak_bonus_7');
    } else if (newStreak === 30) {
      bonusXP = XP_VALUES.STREAK_BONUS_30;
      awardXP(studentId, bonusXP, 'streak_bonus_30');
    }
    totalXpEarned += bonusXP;

    // Check streak badges
    checkAndAwardBadges(studentId, 'streak', newStreak);
    checkAndAwardBadges(studentId, 'daily_login', 1);

    res.json({
      streak: newStreak,
      longest: newLongest,
      xpEarned: totalXpEarned,
      bonusXP,
      isNewDay: true,
    });
  } catch (err) {
    console.error('Record login error:', err);
    res.status(500).json({ error: 'Failed to record login' });
  }
};

// POST /api/gamification/flashcard-complete — Award XP for completing a flashcard set
exports.flashcardComplete = (req, res) => {
  try {
    const studentId = req.user.id;
    const { setId, correct, total } = req.body;

    if (!setId || correct === undefined || !total) {
      return res.status(400).json({ error: 'setId, correct, and total are required' });
    }

    // Award XP per correct answer
    const correctXP = correct * XP_VALUES.FLASHCARD_CORRECT;
    if (correctXP > 0) {
      awardXP(studentId, correctXP, 'flashcard_correct', setId);
    }

    // Award set completion bonus
    awardXP(studentId, XP_VALUES.FLASHCARD_SET_COMPLETE, 'flashcard_set_complete', setId);

    // Count total flashcard sets completed by this student
    const completedSets = db.prepare(
      "SELECT COUNT(*) as count FROM xp_log WHERE student_id = ? AND source = 'flashcard_set_complete'"
    ).get(studentId);

    // Check flashcard badges
    const newBadges = checkAndAwardBadges(studentId, 'flashcard_sets_completed', completedSets.count);

    const totalXpEarned = correctXP + XP_VALUES.FLASHCARD_SET_COMPLETE;
    const updatedXp = db.prepare('SELECT total_xp, level FROM student_xp WHERE student_id = ?').get(studentId);

    res.json({
      xpEarned: totalXpEarned,
      totalXp: updatedXp.total_xp,
      level: updatedXp.level,
      newBadges,
    });
  } catch (err) {
    console.error('Flashcard complete error:', err);
    res.status(500).json({ error: 'Failed to record flashcard completion' });
  }
};

// POST /api/gamification/quiz-complete — Award XP for completing a quiz
exports.quizComplete = (req, res) => {
  try {
    const studentId = req.user.id;
    const { quizSetId, score, total } = req.body;

    if (!quizSetId || score === undefined || !total) {
      return res.status(400).json({ error: 'quizSetId, score, and total are required' });
    }

    // XP per correct answer
    const correctXP = score * XP_VALUES.QUIZ_CORRECT_ANSWER;
    let totalXpEarned = correctXP;

    if (correctXP > 0) {
      awardXP(studentId, correctXP, 'quiz_correct', quizSetId);
    }

    // Quiz completion bonus
    awardXP(studentId, XP_VALUES.QUIZ_COMPLETE, 'quiz_complete', quizSetId);
    totalXpEarned += XP_VALUES.QUIZ_COMPLETE;

    // Perfect score bonus
    let isPerfect = false;
    if (score === total) {
      awardXP(studentId, XP_VALUES.QUIZ_PERFECT, 'quiz_perfect', quizSetId);
      totalXpEarned += XP_VALUES.QUIZ_PERFECT;
      isPerfect = true;
      checkAndAwardBadges(studentId, 'perfect_quiz', 1);
    }

    // Record attempt
    db.prepare(
      'INSERT INTO quiz_attempts (student_id, quiz_set_id, score, total, xp_earned) VALUES (?, ?, ?, ?, ?)'
    ).run(studentId, quizSetId, score, total, totalXpEarned);

    // Count total quizzes completed
    const completedQuizzes = db.prepare(
      'SELECT COUNT(*) as count FROM quiz_attempts WHERE student_id = ?'
    ).get(studentId);
    const newBadges = checkAndAwardBadges(studentId, 'quizzes_completed', completedQuizzes.count);

    const updatedXp = db.prepare('SELECT total_xp, level FROM student_xp WHERE student_id = ?').get(studentId);

    res.json({
      xpEarned: totalXpEarned,
      isPerfect,
      totalXp: updatedXp.total_xp,
      level: updatedXp.level,
      newBadges,
    });
  } catch (err) {
    console.error('Quiz complete error:', err);
    res.status(500).json({ error: 'Failed to record quiz completion' });
  }
};

// GET /api/gamification/leaderboard?classId= — Get class leaderboard
exports.getLeaderboard = (req, res) => {
  try {
    const { classId } = req.query;

    let leaderboard;
    if (classId) {
      // Class-specific leaderboard
      leaderboard = db.prepare(`
        SELECT u.id, u.full_name, u.avatar_url,
               COALESCE(sx.total_xp, 0) as total_xp,
               COALESCE(sx.level, 1) as level,
               COALESCE(ss.current_streak, 0) as streak
        FROM class_enrollments ce
        JOIN users u ON u.id = ce.student_id
        LEFT JOIN student_xp sx ON sx.student_id = u.id
        LEFT JOIN student_streaks ss ON ss.student_id = u.id
        WHERE ce.class_id = ?
        ORDER BY total_xp DESC
        LIMIT 50
      `).all(parseInt(classId));
    } else {
      // Global leaderboard
      leaderboard = db.prepare(`
        SELECT u.id, u.full_name, u.avatar_url,
               COALESCE(sx.total_xp, 0) as total_xp,
               COALESCE(sx.level, 1) as level,
               COALESCE(ss.current_streak, 0) as streak
        FROM users u
        LEFT JOIN student_xp sx ON sx.student_id = u.id
        LEFT JOIN student_streaks ss ON ss.student_id = u.id
        WHERE u.role = 'student'
        ORDER BY total_xp DESC
        LIMIT 50
      `).all();
    }

    // Add rank numbers
    const ranked = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    res.json({ leaderboard: ranked });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

// GET /api/gamification/badges — Get all badge definitions
exports.getAllBadges = (req, res) => {
  try {
    const studentId = req.user.id;
    const allBadges = db.prepare('SELECT * FROM badges ORDER BY criteria_type, criteria_value').all();
    const earned = db.prepare('SELECT badge_id, earned_at FROM student_badges WHERE student_id = ?').all(studentId);

    const earnedMap = {};
    for (const e of earned) {
      earnedMap[e.badge_id] = e.earned_at;
    }

    const badges = allBadges.map((b) => ({
      ...b,
      earned: !!earnedMap[b.id],
      earned_at: earnedMap[b.id] || null,
    }));

    res.json({ badges });
  } catch (err) {
    console.error('Get badges error:', err);
    res.status(500).json({ error: 'Failed to get badges' });
  }
};

// GET /api/gamification/xp-history — Get recent XP events
exports.getXPHistory = (req, res) => {
  try {
    const studentId = req.user.id;
    const history = db.prepare(
      'SELECT * FROM xp_log WHERE student_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(studentId);

    res.json({ history });
  } catch (err) {
    console.error('XP history error:', err);
    res.status(500).json({ error: 'Failed to get XP history' });
  }
};

module.exports = exports;
