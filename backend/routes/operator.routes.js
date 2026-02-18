const express = require('express');
const router = express.Router();
const op = require('../controllers/operator.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { uploadPdf } = require('../middleware/upload');

// All operator routes require authentication + operator role
router.use(authenticate, requireRole('operator'));

// User management
router.post('/users', op.createUser);
router.get('/users', op.listUsers);
router.delete('/users/:id', op.deleteUser);

// Class management
router.post('/classes', op.createClass);
router.delete('/classes/:id', op.deleteClass);
router.put('/classes/:id/teacher', op.assignTeacher);
router.delete('/classes/:id/teacher/:teacherId', op.removeTeacher);
router.get('/classes/:id/teachers', op.getClassTeachers);
router.post('/classes/:id/enroll', op.enrollStudent);
router.delete('/classes/:id/enroll/:studentId', op.unenrollStudent);
router.get('/classes/:id/students', op.getClassStudents);

// Stats
router.get('/stats', op.getStats);

// PDF management
router.get('/pdf/download/:pdfId', op.downloadPdf);
router.post('/pdf/upload', uploadPdf.single('file'), op.uploadPdf);

module.exports = router;
