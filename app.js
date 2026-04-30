const express = require('express');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/flashcards', flashcardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});