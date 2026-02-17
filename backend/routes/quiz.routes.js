const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/quiz.controller');

router.use(auth);

// Generate a new quiz from course material
router.post('/generate', ctrl.generate);

// List quiz sets for a class
router.get('/sets', ctrl.listSets);

// Get a specific quiz with questions
router.get('/sets/:setId', ctrl.getSet);

// Delete a quiz set
router.delete('/sets/:setId', ctrl.deleteSet);

// Submit quiz answers and get results
router.post('/sets/:setId/submit', ctrl.submitQuiz);

module.exports = router;
