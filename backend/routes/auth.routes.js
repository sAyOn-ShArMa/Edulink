const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');

router.post('/login', auth.login);
router.get('/me', authenticate, auth.me);

module.exports = router;
