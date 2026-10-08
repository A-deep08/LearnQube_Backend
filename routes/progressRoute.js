const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const progress = require('../controllers/progressController');

router.use(auth);

router.post('/activity', progress.logActivity);   // log a quiz/flashcard/etc. event
router.get('/summary', progress.getSummary);      // ?days=30
router.get('/subjects', progress.getSubjects);    // ?days=30
router.get('/daily', progress.getDaily);          // ?date=YYYY-MM-DD
router.get('/trends', progress.getTrends);        // ?days=7
router.get('/weak-areas', progress.getWeakAreas); // ?days=30

module.exports = router;