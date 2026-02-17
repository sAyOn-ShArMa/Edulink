const express = require('express');
const router = express.Router();
const cls = require('../controllers/class.controller');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, cls.list);
router.get('/all', authenticate, cls.listAll);

module.exports = router;
