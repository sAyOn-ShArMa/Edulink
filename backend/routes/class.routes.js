const express = require('express');
const router = express.Router();
const cls = require('../controllers/class.controller');
const authenticate = require('../middleware/auth');

router.get('/sections', authenticate, cls.getSections);
router.get('/all', authenticate, cls.listAll);
router.get('/', authenticate, cls.list);

module.exports = router;
