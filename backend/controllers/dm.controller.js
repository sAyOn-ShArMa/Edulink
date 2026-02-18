const db = require('../config/db');
const { chatAssistant } = require('../services/ai.service');

/**
 * GET /api/dm/teachers
 * Students see only teachers from classes they are enrolled in.
 * Teachers see all students from their classes (for responding).
 */
exports.getAvailableTeachers = (req, res) => {
  if (req.user.role === 'student') {
    // Find teachers from both legacy teacher_id and class_teachers junction table
    const teachers = db.prepare(`
      SELECT DISTINCT u.id, u.full_name, u.email, u.avatar_url,
        GROUP_CONCAT(DISTINCT c.name) as class_names,
        GROUP_CONCAT(DISTINCT c.subject) as subjects
      FROM users u
      JOIN (
        SELECT c.id as class_id, c.teacher_id as teacher_id FROM classes c
        JOIN class_enrollments ce ON ce.class_id = c.id WHERE ce.student_id = ?
        UNION
        SELECT ct.class_id, ct.teacher_id FROM class_teachers ct
        JOIN class_enrollments ce ON ce.class_id = ct.class_id WHERE ce.student_id = ?
      ) tc ON tc.teacher_id = u.id
      JOIN classes c ON c.id = tc.class_id
      WHERE u.role = 'teacher'
      GROUP BY u.id
      ORDER BY u.full_name ASC
    `).all(req.user.id, req.user.id);
    return res.json({ contacts: teachers });
  }

  if (req.user.role === 'teacher') {
    // Find students from both legacy teacher_id and class_teachers junction table
    const students = db.prepare(`
      SELECT DISTINCT u.id, u.full_name, u.email, u.avatar_url,
        GROUP_CONCAT(DISTINCT c.name) as class_names
      FROM users u
      JOIN class_enrollments ce ON ce.student_id = u.id
      JOIN classes c ON c.id = ce.class_id
      LEFT JOIN class_teachers ct ON ct.class_id = c.id
      WHERE (c.teacher_id = ? OR ct.teacher_id = ?) AND u.role = 'student'
      GROUP BY u.id
      ORDER BY u.full_name ASC
    `).all(req.user.id, req.user.id);
    return res.json({ contacts: students });
  }

  res.json({ contacts: [] });
};

/**
 * POST /api/dm/conversations
 * Start or get an existing 1-to-1 conversation.
 * Security: validates enrollment before allowing conversation creation.
 */
exports.startConversation = (req, res) => {
  const { teacherId } = req.body;
  const studentId = req.user.role === 'student' ? req.user.id : null;
  const resolvedTeacherId = req.user.role === 'teacher' ? req.user.id : parseInt(teacherId);
  const resolvedStudentId = req.user.role === 'teacher' ? parseInt(req.body.studentId) : studentId;

  if (!resolvedStudentId || !resolvedTeacherId) {
    return res.status(400).json({ error: 'Both student and teacher are required' });
  }

  // Check existing conversation
  const existing = db.prepare(
    'SELECT * FROM direct_conversations WHERE student_id = ? AND teacher_id = ?'
  ).get(resolvedStudentId, resolvedTeacherId);

  if (existing) {
    return res.json({ conversation: existing });
  }

  // For students: verify enrollment (check both legacy teacher_id and class_teachers)
  if (req.user.role === 'student') {
    const enrolled = db.prepare(`
      SELECT c.id as class_id FROM class_enrollments ce
      JOIN classes c ON c.id = ce.class_id
      LEFT JOIN class_teachers ct ON ct.class_id = c.id
      WHERE ce.student_id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)
      LIMIT 1
    `).get(resolvedStudentId, resolvedTeacherId, resolvedTeacherId);

    if (!enrolled) {
      return res.status(403).json({ error: 'Not enrolled in this teacher\'s class' });
    }

    const result = db.prepare(
      'INSERT INTO direct_conversations (student_id, teacher_id, class_id) VALUES (?, ?, ?)'
    ).run(resolvedStudentId, resolvedTeacherId, enrolled.class_id);

    const conversation = db.prepare('SELECT * FROM direct_conversations WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ conversation });
  }

  // For teachers: verify they teach a class the student is in (check both legacy and junction)
  if (req.user.role === 'teacher') {
    const enrolled = db.prepare(`
      SELECT c.id as class_id FROM class_enrollments ce
      JOIN classes c ON c.id = ce.class_id
      LEFT JOIN class_teachers ct ON ct.class_id = c.id
      WHERE ce.student_id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)
      LIMIT 1
    `).get(resolvedStudentId, resolvedTeacherId, resolvedTeacherId);

    if (!enrolled) {
      return res.status(403).json({ error: 'This student is not in your class' });
    }

    const result = db.prepare(
      'INSERT INTO direct_conversations (student_id, teacher_id, class_id) VALUES (?, ?, ?)'
    ).run(resolvedStudentId, resolvedTeacherId, enrolled.class_id);

    const conversation = db.prepare('SELECT * FROM direct_conversations WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ conversation });
  }

  res.status(403).json({ error: 'Only students and teachers can create conversations' });
};

/**
 * GET /api/dm/conversations
 * List all conversations for the current user.
 */
exports.getConversations = (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  let conversations;
  if (role === 'student') {
    conversations = db.prepare(`
      SELECT dc.*, u.full_name as teacher_name, u.avatar_url as teacher_avatar,
        c.name as class_name, c.subject as class_subject,
        (SELECT content FROM direct_messages WHERE conversation_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM direct_messages WHERE conversation_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM direct_conversations dc
      JOIN users u ON u.id = dc.teacher_id
      JOIN classes c ON c.id = dc.class_id
      WHERE dc.student_id = ?
      ORDER BY last_message_at DESC
    `).all(userId);
  } else if (role === 'teacher') {
    conversations = db.prepare(`
      SELECT dc.*, u.full_name as student_name, u.avatar_url as student_avatar,
        c.name as class_name, c.subject as class_subject,
        (SELECT content FROM direct_messages WHERE conversation_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM direct_messages WHERE conversation_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM direct_conversations dc
      JOIN users u ON u.id = dc.student_id
      JOIN classes c ON c.id = dc.class_id
      WHERE dc.teacher_id = ?
      ORDER BY last_message_at DESC
    `).all(userId);
  } else {
    conversations = [];
  }

  res.json({ conversations });
};

/**
 * GET /api/dm/conversations/:conversationId/messages
 * Get messages for a specific conversation (access verified by middleware).
 */
exports.getMessages = (req, res) => {
  const conversationId = parseInt(req.params.conversationId);
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  const messages = db.prepare(`
    SELECT dm.*, u.full_name as sender_name, u.role as sender_role
    FROM direct_messages dm
    JOIN users u ON u.id = dm.sender_id
    WHERE dm.conversation_id = ?
    ORDER BY dm.created_at ASC
    LIMIT ? OFFSET ?
  `).all(conversationId, limit, offset);

  res.json({ messages });
};

/**
 * POST /api/dm/conversations/:conversationId/messages
 * Send a message in a conversation (access verified by middleware).
 */
exports.sendMessage = (req, res) => {
  const conversationId = parseInt(req.params.conversationId);
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const result = db.prepare(
    'INSERT INTO direct_messages (conversation_id, sender_id, content) VALUES (?, ?, ?)'
  ).run(conversationId, req.user.id, content.trim());

  const message = db.prepare(`
    SELECT dm.*, u.full_name as sender_name, u.role as sender_role
    FROM direct_messages dm
    JOIN users u ON u.id = dm.sender_id
    WHERE dm.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message });
};

/**
 * POST /api/dm/conversations/:conversationId/ai-assist
 * Ask the AI assistant a question within the conversation context.
 * The AI is aware of the class context and conversation history.
 */
/**
 * DELETE /api/dm/conversations/:conversationId
 * Delete a conversation and all its messages (access verified by middleware).
 */
exports.deleteConversation = (req, res) => {
  const conversationId = parseInt(req.params.conversationId);

  db.prepare('DELETE FROM direct_messages WHERE conversation_id = ?').run(conversationId);
  db.prepare('DELETE FROM direct_conversations WHERE id = ?').run(conversationId);

  res.json({ message: 'Conversation deleted' });
};

exports.aiAssist = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const conversation = req.conversation;

    // Get class context
    const classInfo = db.prepare(
      'SELECT c.*, u.full_name as teacher_name FROM classes c JOIN users u ON u.id = c.teacher_id WHERE c.id = ?'
    ).get(conversation.class_id);

    // Get recent conversation messages for context
    const recentMessages = db.prepare(`
      SELECT dm.content, u.full_name as sender_name, u.role as sender_role
      FROM direct_messages dm
      JOIN users u ON u.id = dm.sender_id
      WHERE dm.conversation_id = ?
      ORDER BY dm.created_at DESC
      LIMIT 20
    `).all(conversationId).reverse();

    const aiResponse = await chatAssistant(question, {
      className: classInfo.name,
      subject: classInfo.subject,
      teacherName: classInfo.teacher_name,
      recentMessages,
    });

    // Save the AI response as a message in the conversation
    const result = db.prepare(
      'INSERT INTO direct_messages (conversation_id, sender_id, content, is_ai_response) VALUES (?, ?, ?, 1)'
    ).run(conversationId, req.user.id, aiResponse);

    const message = db.prepare(`
      SELECT dm.*, u.full_name as sender_name, u.role as sender_role
      FROM direct_messages dm
      JOIN users u ON u.id = dm.sender_id
      WHERE dm.id = ?
    `).get(result.lastInsertRowid);

    // Override sender info to show as AI
    message.sender_name = 'AI Assistant';
    message.sender_role = 'ai';
    message.is_ai_response = 1;

    res.json({ message, aiResponse });
  } catch (err) {
    console.error('AI assist error:', err);
    if (err.message && err.message.includes('GROQ_API_KEY')) {
      return res.status(503).json({ error: 'AI assistant is unavailable — GROQ_API_KEY is not configured on the server.' });
    }
    res.status(500).json({ error: 'AI assistant failed to respond' });
  }
};
