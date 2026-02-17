const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = function (io) {
  // Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'edulink_fallback_secret');
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.email}`);

    // --- Private DM handlers ---
    socket.on('join_dm', (conversationId) => {
      // Verify user is a participant before joining
      const convo = db.prepare(
        'SELECT * FROM direct_conversations WHERE id = ?'
      ).get(parseInt(conversationId));

      if (convo && (convo.student_id === socket.user.id || convo.teacher_id === socket.user.id)) {
        socket.join(`dm_${conversationId}`);
      }
    });

    socket.on('leave_dm', (conversationId) => {
      socket.leave(`dm_${conversationId}`);
    });

    socket.on('send_dm', ({ conversationId, content }) => {
      if (!content || !content.trim()) return;

      // Verify user is a participant
      const convo = db.prepare(
        'SELECT * FROM direct_conversations WHERE id = ?'
      ).get(parseInt(conversationId));

      if (!convo || (convo.student_id !== socket.user.id && convo.teacher_id !== socket.user.id)) {
        return; // Silently reject unauthorized messages
      }

      const result = db.prepare(
        'INSERT INTO direct_messages (conversation_id, sender_id, content) VALUES (?, ?, ?)'
      ).run(conversationId, socket.user.id, content.trim());

      const message = db.prepare(`
        SELECT dm.*, u.full_name as sender_name, u.role as sender_role
        FROM direct_messages dm
        JOIN users u ON u.id = dm.sender_id
        WHERE dm.id = ?
      `).get(result.lastInsertRowid);

      io.to(`dm_${conversationId}`).emit('new_dm', message);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.email}`);
    });
  });
};
