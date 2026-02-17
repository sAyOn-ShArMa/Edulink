const express = require('express');
const router = express.Router();
const pdf = require('../controllers/pdf.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { uploadPdf } = require('../middleware/upload');

router.post('/upload', authenticate, requireRole('teacher', 'operator'), uploadPdf.single('file'), pdf.upload);
router.get('/download/:pdfId', authenticate, pdf.download);
router.get('/:classId', authenticate, pdf.listByClass);
router.get('/content/:pdfId', authenticate, pdf.getContent);
router.delete('/:pdfId', authenticate, requireRole('teacher', 'operator'), pdf.remove);

module.exports = router;
