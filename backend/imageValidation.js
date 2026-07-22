/**
 * imageValidation.js — AI-powered road damage image verification
 * Uses pixel-level heuristic analysis to classify road damage types.
 */
const sharp = require('sharp');

function formatDamageType(dt) {
  if (!dt || dt === 'not_road') return 'Invalid Image';
  if (dt === 'road_damage') return 'Surface Damage';
  // Capitalize words (e.g. pothole -> Pothole, construction_damage -> Construction Damage)
  const cleaned = dt.replace(/_/g, ' ');
  return cleaned.replace(/\b\w/g, l => l.toUpperCase());
}

async function analyzeImage(base64Image) {
  if (!base64Image || base64Image.length < 100) {
    return { valid: false, damageType: 'Invalid Image', confidence: 0, reason: 'No image provided' };
  }

  // 1. Try calling the New YOLOv8 AI Service (port 5000)
  const aiServiceUrl = process.env.NEW_AI_SERVICE_URL || 'http://localhost:5000/analyze-road';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(aiServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64Image }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const formattedType = formatDamageType(data.prediction);
        const isValid = !!data.store_in_db;
        return {
          valid: isValid,
          damageType: formattedType,
          confidence: parseFloat((data.confidence || 0).toFixed(3)),
          total_damages: data.total_damages || 0,
          detections: data.detections || [],
          store_in_db: data.store_in_db,
          source: 'yolov8_new_ai_service',
          reason: isValid
            ? `YOLOv8 AI verified road damage: ${formattedType} (${data.total_damages} detection(s)).`
            : 'YOLOv8 AI did not detect valid road damage in this image.',
        };
      }
    }
  } catch (aiErr) {
    console.warn('[AI] New YOLOv8 AI service unavailable, using Sharp heuristic fallback:', aiErr.message);
  }

  // 2. Fallback: Sharp Heuristic Pixel Analysis
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const { data: pixelData, info } = await sharp(imageBuffer)
      .resize(64, 64)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = Array.from(pixelData);
    const total = pixels.length;
    const mean = pixels.reduce((a, b) => a + b, 0) / total;
    const variance = pixels.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / total;
    const stdDev = Math.sqrt(variance);
    const darkPixels = pixels.filter(p => p < 80).length;
    const darkRatio = darkPixels / total;
    const veryDarkPixels = pixels.filter(p => p < 40).length;
    const veryDarkRatio = veryDarkPixels / total;
    let edgeCount = 0;
    for (let i = 1; i < pixels.length - 1; i++) {
      if (Math.abs(pixels[i] - pixels[i - 1]) > 30) edgeCount++;
    }
    const edgeRatio = edgeCount / total;

    let damageType = 'No Damage';
    let confidence = 0.5;
    let valid = false;
    let reason = '';

    if (stdDev < 5) {
      return { valid: false, damageType: 'Invalid Image', confidence: 0.95, reason: 'Image appears to be blank or a solid color. Please upload a clear photo of the damaged road.' };
    }
    if (mean > 220 && stdDev < 15) {
      return { valid: false, damageType: 'Invalid Image', confidence: 0.85, reason: 'Image appears to be overexposed or not a road photo. Please capture the damaged road clearly.' };
    }
    if (veryDarkRatio > 0.08 && stdDev > 35) {
      damageType = 'Pothole'; confidence = Math.min(0.95, 0.60 + (veryDarkRatio * 3) + (stdDev / 200)); valid = true;
      reason = 'Deep dark cavity pattern detected, consistent with pothole damage.';
    } else if (darkRatio > 0.12 && edgeRatio > 0.15 && stdDev > 25) {
      damageType = 'Crack'; confidence = Math.min(0.93, 0.55 + edgeRatio + (darkRatio / 2)); valid = true;
      reason = 'Linear dark patterns with high edge contrast detected, consistent with road cracking.';
    } else if (darkRatio > 0.25 && stdDev < 30 && mean < 100) {
      damageType = 'Waterlogging'; confidence = Math.min(0.88, 0.60 + (darkRatio / 2)); valid = true;
      reason = 'Large uniform dark area detected, consistent with water accumulation on road.';
    } else if (stdDev > 40 && edgeRatio > 0.20) {
      damageType = 'Surface Damage'; confidence = Math.min(0.85, 0.50 + (stdDev / 150) + (edgeRatio / 2)); valid = true;
      reason = 'Irregular surface texture detected, consistent with road surface deterioration.';
    } else if (darkRatio > 0.06 && stdDev > 30) {
      damageType = 'Construction Damage'; confidence = Math.min(0.80, 0.50 + (darkRatio * 2)); valid = true;
      reason = 'Mixed damage pattern detected, possibly construction-related road damage.';
    } else if (mean < 180 && stdDev > 15) {
      damageType = 'Surface Damage'; confidence = 0.55; valid = true;
      reason = 'Minor road surface irregularities detected.';
    } else {
      damageType = 'No Damage'; confidence = 0.65; valid = false;
      reason = 'No significant road damage pattern detected. Please ensure you are photographing the damaged area directly.';
    }

    return {
      valid, damageType,
      confidence: parseFloat(confidence.toFixed(3)),
      reason,
      store_in_db: valid,
      source: 'heuristic',
      meta: { mean: mean.toFixed(1), stdDev: stdDev.toFixed(1), darkRatio: darkRatio.toFixed(3), edgeRatio: edgeRatio.toFixed(3) },
    };
  } catch (err) {
    console.error('[AI] Image analysis error:', err.message);
    return { valid: false, damageType: 'Invalid Image', confidence: 0, reason: 'Could not process image. Please try again with a clearer photo.' };
  }
}

function isValidImageFormat(base64Image) {
  if (!base64Image) return false;
  const validPrefixes = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp', 'data:image/gif'];
  return validPrefixes.some(p => base64Image.startsWith(p)) || base64Image.length > 1000;
}

module.exports = { analyzeImage, isValidImageFormat };
