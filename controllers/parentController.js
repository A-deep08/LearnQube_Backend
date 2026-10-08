const crypto = require('crypto');
const User = require('../models/User');
const ParentLink = require('../models/ParentLink');
const analytics = require('../utils/analytics');

const CODE_TTL_MS = 15 * 60 * 1000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes (0/O, 1/I)

const makeCode = () =>
    Array.from(crypto.randomBytes(8), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');

const parseDays = (value, fallback, max = 365) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
};

const handle = (fn) => async (req, res) => {
    try {
        res.status(200).json(await fn(req));
    } catch (error) {
        console.error('Parent dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /api/parent/link-code  (student) -> 8-char code valid for 15 minutes
const generateLinkCode = async (req, res) => {
    try {
        const code = makeCode();
        const expires = new Date(Date.now() + CODE_TTL_MS);
        await User.updateOne({ _id: req.user.id }, { linkCode: code, linkCodeExpires: expires });
        res.status(200).json({ code, expiresAt: expires });
    } catch (error) {
        console.error('Error generating link code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /api/parent/children  (parent) body: { code }
const linkChild = async (req, res) => {
    try {
        const code = String(req.body.code || '').trim().toUpperCase();
        if (!code) return res.status(400).json({ error: 'code is required' });

        const child = await User.findOne({
            linkCode: code,
            linkCodeExpires: { $gt: new Date() },
            role: 'student',
        }).select('name');
        if (!child) return res.status(400).json({ error: 'Invalid or expired code' });

        await ParentLink.create({ parent: req.user.id, child: child._id });
        // single-use: burn the code once it's been redeemed
        await User.updateOne({ _id: child._id }, { $unset: { linkCode: 1, linkCodeExpires: 1 } });

        res.status(201).json({ message: 'Child linked', child: { id: child._id, name: child.name } });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'Child already linked' });
        console.error('Error linking child:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /api/parent/children -> each child with a 7-day snapshot
const listChildren = handle(async (req) => {
    const links = await ParentLink.find({ parent: req.user.id }).populate('child', 'name');
    const children = await Promise.all(
        links
            .filter((l) => l.child)
            .map(async (l) => ({
                id: l.child._id,
                name: l.child.name,
                linkedAt: l.createdAt,
                last7Days: await analytics.getSummary(l.child._id, 7),
            }))
    );
    return { children };
});

// DELETE /api/parent/children/:childId
const unlinkChild = handle(async (req) => {
    await ParentLink.deleteOne({ parent: req.user.id, child: req.params.childId });
    return { message: 'Child unlinked' };
});

// GET /api/parent/children/:childId/dashboard?days=30 -> everything the home screen needs
const getDashboard = handle(async (req) => {
    const { childId } = req.params;
    const days = parseDays(req.query.days, 30);
    const [child, summary, subjects, today, trends, weakAreas, alerts] = await Promise.all([
        User.findById(childId).select('name'),
        analytics.getSummary(childId, days),
        analytics.getSubjectStats(childId, days),
        analytics.getDailyReport(childId),
        analytics.getTrends(childId, 7),
        analytics.getWeakAreas(childId, days),
        analytics.getAlerts(childId),
    ]);
    return {
        child: { id: childId, name: child?.name },
        summary,
        subjects,
        today,
        weeklyTrend: trends,
        weakAreas,
        alerts,
    };
});

// GET /api/parent/children/:childId/daily?date=YYYY-MM-DD
const getDaily = async (req, res) => {
    const date = req.query.date;
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date)))) {
        return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
    }
    return handle((r) => analytics.getDailyReport(r.params.childId, date || undefined))(req, res);
};

// GET /api/parent/children/:childId/trends?days=7
const getTrends = handle(async (req) => {
    const days = parseDays(req.query.days, 7, 90);
    return { periodDays: days, trends: await analytics.getTrends(req.params.childId, days) };
});

// GET /api/parent/children/:childId/alerts
const getAlerts = handle(async (req) => ({ alerts: await analytics.getAlerts(req.params.childId) }));

module.exports = {
    generateLinkCode,
    linkChild,
    listChildren,
    unlinkChild,
    getDashboard,
    getDaily,
    getTrends,
    getAlerts,
};