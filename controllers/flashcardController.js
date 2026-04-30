const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateFlashcards = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in the server.' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Generate a list of 5 educational flashcards for the topic: "${topic}". 
    Format the response as a valid JSON array of objects, where each object has a "question" and "answer" property.
    Do not include any markdown formatting, code blocks or extra text, just return the raw JSON array.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let flashcards;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      flashcards = JSON.parse(cleanText.trim());
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      return res.status(500).json({ error: 'Failed to process AI response into flashcards.' });
    }

    res.status(200).json({
      topic: topic,
      flashcards: flashcards
    });

  } catch (error) {
    console.error('Error generating flashcards:', error);
    res.status(500).json({ error: 'An error occurred while generating flashcards.' });
  }
};

module.exports = {
  generateFlashcards
};
