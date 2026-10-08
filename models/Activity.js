const mongoose = require('mongoose');

// One document per learning event (quiz attempt, flashcard session, etc.)
const activitySchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        subject: { type: String, required: true, trim: true, lowercase: true },
        chapter: { type: String, trim: true, default: '' },
        type: {
            type: String,
            required: true,
            enum: ['quiz', 'flashcard', 'exam', 'chatbot', 'handwriting', 'revision'],
        },
        // Scored activities only (quiz/exam). Leave maxScore 0 for unscored ones.
        score: { type: Number, min: 0, default: 0 },
        maxScore: { type: Number, min: 0, default: 0 },
        durationSec: { type: Number, min: 0, default: 0 },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ user: 1, subject: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);