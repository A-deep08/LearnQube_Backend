const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Proxies to pix2tex Python service running on port 5050
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let payload;

    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64 = fileBuffer.toString('base64');
      payload = { image_base64: base64 };
      fs.unlinkSync(req.file.path);
    } else if (req.body.image_url) {
      payload = { image_url: req.body.image_url };
    } else {
      return res.status(400).json({ success: false, error: 'Provide image_url or upload a file' });
    }

    const response = await axios.post('http://localhost:5050/api/formula', payload);
    res.json({ success: true, ...response.data });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
