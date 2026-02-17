const express = require('express');
const router = express.Router();
const gs = require('../controllers/gradesheet.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { uploadGradesheet } = require('../middleware/upload');

router.post('/upload', authenticate, requireRole('student'), uploadGradesheet.single('file'), gs.upload);
router.get('/:studentId', authenticate, gs.get);
router.post('/analyze', authenticate, requireRole('student'), gs.analyze);
router.get('/schedule/:studentId', authenticate, gs.getSchedule);

module.exports = router;
