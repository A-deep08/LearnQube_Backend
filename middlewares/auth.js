const jwt = require('jsonwebtoken');

// Verifies the Bearer JWT issued by authController.login and sets req.user = { id, email }
const auth = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Authentication token missing' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = { id: payload.userId, email: payload.email };
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = auth;