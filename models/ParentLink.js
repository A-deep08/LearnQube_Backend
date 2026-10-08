const mongoose = require('mongoose');

// One document per parent <-> child relationship (a parent can have many children)
const parentLinkSchema = new mongoose.Schema(
    {
        parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

parentLinkSchema.index({ parent: 1, child: 1 }, { unique: true });

module.exports = mongoose.model('ParentLink', parentLinkSchema);