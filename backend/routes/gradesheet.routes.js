const express = require('express');
const router = express.Router();
const gs = require('../controllers/gradesheet.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { uploadGradesheet } = require('../middleware/upload');

// Specific routes must come before param-based routes
router.post('/upload', authenticate, requireRole('student'), uploadGradesheet.single('file'), gs.upload);
router.post('/analyze', authenticate, requireRole('student'), gs.analyze);
router.get('/schedule/:studentId', authenticate, gs.getSchedule);
router.get('/:studentId', authenticate, gs.get);

module.exports = router;
