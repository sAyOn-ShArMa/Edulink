const express = require('express');
const router = express.Router();
const dm = require('../controllers/dm.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { verifyEnrollment, verifyConversationAccess } = require('../middleware/enrollment');

// Get available teachers (students) or students (teachers) filtered by enrollment
router.get('/teachers', authenticate, requireRole('student', 'teacher'), dm.getAvailableTeachers);

// List all conversations for the current user
router.get('/conversations', authenticate, requireRole('student', 'teacher'), dm.getConversations);

// Start or get an existing conversation (enrollment verified)
router.post('/conversations', authenticate, requireRole('student', 'teacher'), verifyEnrollment, dm.startConversation);

// Get messages in a conversation (access verified)
router.get('/conversations/:conversationId/messages', authenticate, verifyConversationAccess, dm.getMessages);

// Send a message in a conversation (access verified)
router.post('/conversations/:conversationId/messages', authenticate, verifyConversationAccess, dm.sendMessage);

// Delete a conversation and all its messages (access verified)
router.delete('/conversations/:conversationId', authenticate, verifyConversationAccess, dm.deleteConversation);

// AI assistant within a conversation (access verified, students only)
router.post('/conversations/:conversationId/ai-assist', authenticate, requireRole('student'), verifyConversationAccess, dm.aiAssist);

module.exports = router;
