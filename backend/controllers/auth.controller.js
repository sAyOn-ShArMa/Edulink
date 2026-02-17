const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.login = (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET || 'edulink_fallback_secret';
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, created_at: user.created_at },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
};

exports.me = (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, full_name, role, avatar_url, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
};
