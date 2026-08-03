const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const Groq = require('groq-sdk');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    let base64Image, mimeType;

    if (req.file) {
      base64Image = fs.readFileSync(req.file.path).toString('base64');
      mimeType = req.file.mimetype || 'image/jpeg';
      fs.unlinkSync(req.file.path);
    } else if (req.body.image_url) {
      const response = await axios.get(req.body.image_url, { responseType: 'arraybuffer' });
      base64Image = Buffer.from(response.data).toString('base64');
      mimeType = 'image/jpeg';
    } else {
      return res.status(400).json({ success: false, error: 'Provide image_url or upload a file' });
    }

    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Transcribe all handwritten text from this image.
                     Format the output cleanly for reading:
                     - Use proper line breaks between sections
                     - Preserve chemical equations and notation
                     - Use proper subscript notation like H₂O, NH₃, CO₂ using unicode
                     - Use proper arrows → and ⇌
                     - Clearly separate headings, equations, and bullet points
                     - Return only the transcribed text, no extra commentary.`
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` }
            }
          ]
        }
      ],
      max_tokens: 1024
    });

    const raw = response.choices[0].message.content;

    // clean up newlines and spacing
    const transcription = raw
      .replace(/\\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // convert to HTML for browser rendering
    const html = transcription
      .replace(/## (.+)/g, '<h2>$1</h2>')
      .replace(/\* (.+)/g, '<li>$1</li>')
      .replace(/\n/g, '<br>');

    res.json({ success: true, transcription, html });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
