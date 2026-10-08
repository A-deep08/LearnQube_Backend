const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { requireRole, ownsChild } = require('../middlewares/parentAccess');
const parent = require('../controllers/parentController');

router.use(auth);

// Linking
router.post('/link-code', requireRole('student'), parent.generateLinkCode);
router.post('/children', requireRole('parent'), parent.linkChild);
router.get('/children', requireRole('parent'), parent.listChildren);

// Everything below requires a parent who is linked to :childId
router.use('/children/:childId', requireRole('parent'), ownsChild);
router.delete('/children/:childId', parent.unlinkChild);
router.get('/children/:childId/dashboard', parent.getDashboard); // ?days=30
router.get('/children/:childId/daily', parent.getDaily);         // ?date=YYYY-MM-DD
router.get('/children/:childId/trends', parent.getTrends);       // ?days=7
router.get('/children/:childId/alerts', parent.getAlerts);

module.exports = router;