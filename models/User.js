const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'parent'], default: 'student' },
    // Short-lived, single-use code a student shares with a parent to link accounts
    linkCode: { type: String, index: true },
    linkCodeExpires: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);