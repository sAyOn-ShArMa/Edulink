const db = require('../config/db');

exports.get = (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const portfolio = db.prepare('SELECT * FROM portfolios WHERE student_id = ?').get(studentId);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const user = db.prepare('SELECT id, full_name, email, avatar_url, created_at FROM users WHERE id = ?').get(studentId);

    res.json({
      portfolio: {
        ...portfolio,
        achievements: JSON.parse(portfolio.achievements || '[]'),
        projects: JSON.parse(portfolio.projects || '[]'),
      },
      user,
    });
  } catch (err) {
    console.error('Portfolio get error:', err);
    res.status(500).json({ error: 'Failed to get portfolio' });
  }
};

exports.update = (req, res) => {
  try {
    const { bio, interests, achievements, projects } = req.body;

    db.prepare(`
      UPDATE portfolios SET
        bio = COALESCE(?, bio),
        interests = COALESCE(?, interests),
        achievements = COALESCE(?, achievements),
        projects = COALESCE(?, projects),
        updated_at = datetime('now')
      WHERE student_id = ?
    `).run(
      bio ?? null,
      interests ?? null,
      achievements ? JSON.stringify(achievements) : null,
      projects ? JSON.stringify(projects) : null,
      req.user.id
    );

    const portfolio = db.prepare('SELECT * FROM portfolios WHERE student_id = ?').get(req.user.id);
    res.json({
      portfolio: {
        ...portfolio,
        achievements: JSON.parse(portfolio.achievements || '[]'),
        projects: JSON.parse(portfolio.projects || '[]'),
      },
    });
  } catch (err) {
    console.error('Portfolio update error:', err);
    res.status(500).json({ error: 'Failed to update portfolio' });
  }
};
