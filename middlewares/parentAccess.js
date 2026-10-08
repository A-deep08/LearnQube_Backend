const mongoose = require('mongoose');
const User = require('../models/User');
const ParentLink = require('../models/ParentLink');

// Use after auth. Looks up the role in the DB so it always reflects the current account.
const requireRole = (role) => async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('role');
        if (!user) return res.status(401).json({ error: 'User not found' });
        if (user.role !== role) {
            return res.status(403).json({ error: `Only ${role} accounts can access this` });
        }
        req.user.role = user.role;
        next();
    } catch (err) {
        console.error('Role check error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Use on routes with :childId. Ensures the parent is actually linked to that child.
const ownsChild = async (req, res, next) => {
    try {
        const { childId } = req.params;
        if (!mongoose.isValidObjectId(childId)) {
            return res.status(400).json({ error: 'Invalid child id' });
        }
        const linked = await ParentLink.exists({ parent: req.user.id, child: childId });
        // 404 (not 403) so parents can't probe which accounts exist
        if (!linked) return res.status(404).json({ error: 'Child not linked to your account' });
        next();
    } catch (err) {
        console.error('Child access error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { requireRole, ownsChild };