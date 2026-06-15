const express = require('express');
const { analyzeImage, isValidImageFormat } = require('../imageValidation');

const router = express.Router();

router.post('/verify', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ message: 'imageBase64 is required' });
    }
    if (!isValidImageFormat(imageBase64)) {
      return res.status(400).json({
        valid: false,
        damageType: 'Invalid Image',
        confidence: 0,
        reason: 'Unsupported image format. Please use JPEG, PNG, or WebP.',
      });
    }
    const result = await analyzeImage(imageBase64);
    res.json(result);
  } catch (err) {
    console.error('[AI Route] Error:', err.message);
    res.status(500).json({
      valid: false,
      damageType: 'Invalid Image',
      confidence: 0,
      reason: 'AI processing failed. Please try again.',
    });
  }
});

module.exports = router;
