const express = require('express');
const router = express.Router();
const fc = require('../controllers/flashcard.controller');
const authenticate = require('../middleware/auth');

router.post('/generate', authenticate, fc.generate);
router.get('/sets', authenticate, fc.listSets);
router.get('/sets/:setId', authenticate, fc.getSet);
router.delete('/sets/:setId', authenticate, fc.deleteSet);
router.get('/books/:classId', authenticate, fc.getBookStructure);

module.exports = router;
