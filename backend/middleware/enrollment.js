const db = require('../config/db');

/**
 * Verify that a student is enrolled in a class taught by the specified teacher.
 * Prevents students from messaging teachers whose classes they aren't in.
 */
function verifyEnrollment(req, res, next) {
  const studentId = req.user.role === 'student' ? req.user.id : null;
  const teacherId = req.body.teacherId || req.params.teacherId || req.query.teacherId;

  if (!studentId || !teacherId) {
    return next(); // Non-students skip this check; teachers can respond freely
  }

  const enrollment = db.prepare(`
    SELECT ce.id FROM class_enrollments ce
    JOIN classes c ON c.id = ce.class_id
    WHERE ce.student_id = ? AND c.teacher_id = ?
    LIMIT 1
  `).get(studentId, parseInt(teacherId));

  if (!enrollment) {
    return res.status(403).json({
      error: 'You are not enrolled in any class taught by this teacher',
    });
  }

  next();
}

/**
 * Verify the user is a participant in the given direct conversation.
 */
function verifyConversationAccess(req, res, next) {
  const conversationId = parseInt(req.params.conversationId || req.body.conversationId);
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }

  const conversation = db.prepare(
    'SELECT * FROM direct_conversations WHERE id = ?'
  ).get(conversationId);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  if (conversation.student_id !== req.user.id && conversation.teacher_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this conversation' });
  }

  req.conversation = conversation;
  next();
}

module.exports = { verifyEnrollment, verifyConversationAccess };
