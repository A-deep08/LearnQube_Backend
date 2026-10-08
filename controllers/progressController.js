const Activity = require('../models/Activity');
const analytics = require('../utils/analytics');

const parseDays = (value, fallback, max = 365) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
};

const handle = (fn) => async (req, res) => {
    try {
        res.status(200).json(await fn(req));
    } catch (error) {
        console.error('Progress error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /api/progress/activity
const logActivity = async (req, res) => {
    try {
        const { subject, chapter, type, score = 0, maxScore = 0, durationSec = 0 } = req.body;

        if (!subject || !type) {
            return res.status(400).json({ error: 'subject and type are required' });
        }
        if (![score, maxScore, durationSec].every((n) => typeof n === 'number' && n >= 0)) {
            return res.status(400).json({ error: 'score, maxScore and durationSec must be non-negative numbers' });
        }
        if (score > maxScore) {
            return res.status(400).json({ error: 'score cannot exceed maxScore' });
        }

        const activity = await Activity.create({
            user: req.user.id,
            subject,
            chapter,
            type,
            score,
            maxScore,
            durationSec,
        });
        res.status(201).json({ message: 'Activity logged', activity });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error logging activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getSummary = handle((req) => analytics.getSummary(req.user.id, parseDays(req.query.days, 30)));

const getSubjects = handle(async (req) => {
    const days = parseDays(req.query.days, 30);
    return { periodDays: days, subjects: await analytics.getSubjectStats(req.user.id, days) };
});

const getDaily = async (req, res) => {
    const date = req.query.date;
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date)))) {
        return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
    }
    return handle((r) => analytics.getDailyReport(r.user.id, date || undefined))(req, res);
};

const getTrends = handle(async (req) => {
    const days = parseDays(req.query.days, 7, 90);
    return { periodDays: days, trends: await analytics.getTrends(req.user.id, days) };
});

const getWeakAreas = handle(async (req) => ({
    weakAreas: await analytics.getWeakAreas(req.user.id, parseDays(req.query.days, 30)),
}));

module.exports = { logActivity, getSummary, getSubjects, getDaily, getTrends, getWeakAreas };