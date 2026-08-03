require('dotenv').config();
const express = require('express');
const cors = require('cors');

const formulaOCR = require('./routes/formulaOCR');
const formulaRender = require('./routes/formulaRender');
const handwriting = require('./routes/handwriting');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/formula/ocr', formulaOCR);
app.use('/api/formula/render', formulaRender);
app.use('/api/handwriting', handwriting);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'LearnQube API running',
    endpoints: {
      formulaOCR: 'POST /api/formula/ocr',
      formulaRender: 'POST /api/formula/render',
      handwriting: 'POST /api/handwriting',
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LearnQube API running on http://localhost:${PORT}`));