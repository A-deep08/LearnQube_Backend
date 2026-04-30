const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcardController');

// Route to generate flashcards from a topic
router.post('/generate', flashcardController.generateFlashcards);

module.exports = router;
