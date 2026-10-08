const mongoose = require('mongoose');
const Activity = require('../models/Activity');

// All "days" are calendar days in IST (India has no DST, so a fixed offset is safe).
const TZ = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';
const DAY_MS = 24 * 60 * 60 * 1000;
const WEAK_THRESHOLD = 60; // % below which a chapter counts as weak

const toObjectId = (id) => new mongoose.Types.ObjectId(id);
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
const dayStart = (key) => new Date(`${key}T00:00:00${IST_OFFSET}`);
const sinceDays = (days) => dayStart(dayKey(Date.now() - (days - 1) * DAY_MS));
const pct = (score, max) => (max > 0 ? Math.round((score / max) * 1000) / 10 : null);

async function getStreak(userId) {
    const rows = await Activity.aggregate([
        { $match: { user: toObjectId(userId), createdAt: { $gte: new Date(Date.now() - 365 * DAY_MS) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } } } },
        { $sort: { _id: 1 } },
    ]);
    const days = rows.map((r) => r._id);
    if (!days.length) return { current: 0, longest: 0, activeDays: 0 };

    // longest streak
    let longest = 1;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
        run = (dayStart(days[i]) - dayStart(days[i - 1])) / DAY_MS === 1 ? run + 1 : 1;
        longest = Math.max(longest, run);
    }

    // current streak (still alive if the last activity was yesterday)
    const set = new Set(days);
    let cursor = dayKey(Date.now());
    if (!set.has(cursor)) cursor = dayKey(Date.now() - DAY_MS);
    let current = 0;
    while (set.has(cursor)) {
        current++;
        cursor = dayKey(dayStart(cursor).getTime() - DAY_MS);
    }

    return { current, longest, activeDays: days.length };
}

async function getSummary(userId, days = 30) {
    const [agg] = await Activity.aggregate([
        { $match: { user: toObjectId(userId), createdAt: { $gte: sinceDays(days) } } },
        {
            $group: {
                _id: null,
                activities: { $sum: 1 },
                timeSec: { $sum: '$durationSec' },
                score: { $sum: '$score' },
                maxScore: { $sum: '$maxScore' },
                subjects: { $addToSet: '$subject' },
            },
        },
    ]);
    const streak = await getStreak(userId);
    return {
        periodDays: days,
        totalActivities: agg?.activities || 0,
        totalTimeMin: Math.round((agg?.timeSec || 0) / 60),
        averageScore: agg ? pct(agg.score, agg.maxScore) : null,
        subjectsStudied: agg?.subjects.length || 0,
        streak,
    };
}

async function getSubjectStats(userId, days = 30) {
    const rows = await Activity.aggregate([
        { $match: { user: toObjectId(userId), createdAt: { $gte: sinceDays(days) } } },
        {
            $group: {
                _id: '$subject',
                activities: { $sum: 1 },
                timeSec: { $sum: '$durationSec' },
                score: { $sum: '$score' },
                maxScore: { $sum: '$maxScore' },
                lastActive: { $max: '$createdAt' },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    return rows.map((r) => ({
        subject: r._id,
        activities: r.activities,
        timeMin: Math.round(r.timeSec / 60),
        averageScore: pct(r.score, r.maxScore),
        lastActive: r.lastActive,
    }));
}

async function getDailyReport(userId, date = dayKey(Date.now())) {
    const start = dayStart(date);
    const end = new Date(start.getTime() + DAY_MS);
    const rows = await Activity.aggregate([
        { $match: { user: toObjectId(userId), createdAt: { $gte: start, $lt: end } } },
        {
            $group: {
                _id: '$subject',
                activities: { $sum: 1 },
                timeSec: { $sum: '$durationSec' },
                score: { $sum: '$score' },
                maxScore: { $sum: '$maxScore' },
                types: { $addToSet: '$type' },
                chapters: { $addToSet: '$chapter' },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const subjects = rows.map((r) => ({
        subject: r._id,
        activities: r.activities,
        timeMin: Math.round(r.timeSec / 60),
        averageScore: pct(r.score, r.maxScore),
        activityTypes: r.types,
        chapters: r.chapters.filter(Boolean),
    }));
    const totals = rows.reduce(
        (t, r) => ({
            activities: t.activities + r.activities,
            timeSec: t.timeSec + r.timeSec,
            score: t.score + r.score,
            maxScore: t.maxScore + r.maxScore,
        }),
        { activities: 0, timeSec: 0, score: 0, maxScore: 0 }
    );

    return {
        date,
        totalActivities: totals.activities,
        totalTimeMin: Math.round(totals.timeSec / 60),
        averageScore: pct(totals.score, totals.maxScore),
        subjects,
    };
}

// Day-by-day series, zero-filled so charts have no gaps
async function getTrends(userId, days = 7) {
    const rows = await Activity.aggregate([
        { $match: { user: toObjectId(userId), createdAt: { $gte: sinceDays(days) } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
                activities: { $sum: 1 },
                timeSec: { $sum: '$durationSec' },
                score: { $sum: '$score' },
                maxScore: { $sum: '$maxScore' },
            },
        },
    ]);
    const byDay = new Map(rows.map((r) => [r._id, r]));

    const series = [];
    for (let i = days - 1; i >= 0; i--) {
        const key = dayKey(Date.now() - i * DAY_MS);
        const r = byDay.get(key);
        series.push({
            date: key,
            activities: r?.activities || 0,
            timeMin: Math.round((r?.timeSec || 0) / 60),
            averageScore: r ? pct(r.score, r.maxScore) : null,
        });
    }
    return series;
}

// Lowest-scoring chapters -> drives the "personalized learning path"
async function getWeakAreas(userId, days = 30, limit = 5) {
    const rows = await Activity.aggregate([
        { $match: { user: toObjectId(userId), maxScore: { $gt: 0 }, createdAt: { $gte: sinceDays(days) } } },
        {
            $group: {
                _id: { subject: '$subject', chapter: '$chapter' },
                attempts: { $sum: 1 },
                score: { $sum: '$score' },
                maxScore: { $sum: '$maxScore' },
            },
        },
    ]);
    return rows
        .map((r) => ({
            subject: r._id.subject,
            chapter: r._id.chapter || 'General',
            attempts: r.attempts,
            averageScore: pct(r.score, r.maxScore),
        }))
        .filter((r) => r.averageScore < WEAK_THRESHOLD)
        .sort((a, b) => a.averageScore - b.averageScore)
        .slice(0, limit)
        .map((r) => ({ ...r, suggestion: `Revise "${r.chapter}" in ${r.subject} and retake the quiz` }));
}

async function rangeScore(userId, from, to) {
    const [r] = await Activity.aggregate([
        { $match: { user: toObjectId(userId), maxScore: { $gt: 0 }, createdAt: { $gte: from, $lt: to } } },
        { $group: { _id: null, score: { $sum: '$score' }, maxScore: { $sum: '$maxScore' } } },
    ]);
    return r ? pct(r.score, r.maxScore) : null;
}

// Rule-based flags for parents: inactivity, week-over-week score drop, weak subjects
async function getAlerts(userId) {
    const alerts = [];

    const last = await Activity.findOne({ user: toObjectId(userId) }).sort({ createdAt: -1 }).select('createdAt').lean();
    if (!last) {
        alerts.push({ type: 'no_activity', severity: 'high', message: 'No study activity recorded yet' });
    } else {
        const idle = Math.round((dayStart(dayKey(Date.now())) - dayStart(dayKey(last.createdAt))) / DAY_MS);
        if (idle >= 3) {
            alerts.push({ type: 'inactive', severity: idle >= 7 ? 'high' : 'medium', message: `No study activity for ${idle} days` });
        }
    }

    const weekStart = sinceDays(7);
    const prevStart = new Date(weekStart.getTime() - 7 * DAY_MS);
    const [current, previous] = await Promise.all([
        rangeScore(userId, weekStart, new Date(Date.now() + DAY_MS)),
        rangeScore(userId, prevStart, weekStart),
    ]);
    if (current !== null && previous !== null && previous - current >= 10) {
        alerts.push({ type: 'score_drop', severity: 'medium', message: `Average score fell from ${previous}% to ${current}% this week` });
    }

    const subjects = await getSubjectStats(userId, 30);
    subjects
        .filter((s) => s.averageScore !== null && s.averageScore < WEAK_THRESHOLD)
        .forEach((s) =>
            alerts.push({ type: 'low_subject', severity: 'medium', message: `Average in ${s.subject} is ${s.averageScore}% (last 30 days)` })
        );

    return alerts;
}

module.exports = {
    getStreak,
    getSummary,
    getSubjectStats,
    getDailyReport,
    getTrends,
    getWeakAreas,
    getAlerts,
    dayKey,
};