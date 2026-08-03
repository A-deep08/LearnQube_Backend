const express = require('express');
const katex = require('katex');

const router = express.Router();

router.post('/', (req, res) => {
  const { formula } = req.body;

  if (!formula) {
    return res.status(400).json({ success: false, error: 'Provide a formula field' });
  }

  try {
    // auto convert * to \times
    const tex = formula.replace(/(?<![\\{])\*/g, ' \\times ');

    const html = katex.renderToString(tex, {
      throwOnError: true,
      displayMode: true
    });

    res.json({ success: true, latex: tex, html });

  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
