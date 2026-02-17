const express = require('express');
const router = express.Router();
const portfolio = require('../controllers/portfolio.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');

router.get('/:studentId', authenticate, portfolio.get);
router.put('/', authenticate, requireRole('student'), portfolio.update);

module.exports = router;
