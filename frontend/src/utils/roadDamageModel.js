/**
 * roadDamageModel.js
 * ==================
 * Calls the Python Flask AI server (port 5003) for two-stage image analysis:
 *   Stage 1: Road/Not-Road filter  (road_damage_filter_model.keras)
 *   Stage 2: Damage type classifier (damage_classifier.keras)
 *
 * Both stages run in a single /analyze request for efficiency.
 * Falls back gracefully if the server is offline or classifier isn't trained yet.
 */

const ANALYZE_URL = '/analyze';
const CLASSIFY_URL = '/classify-damage';
const HEALTH_URL  = '/health';

let _serverOnline = null;

/**
 * Check if the Python model server is running.
 */
export async function getModelStatus() {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      _serverOnline = true;
      return {
        online:              true,
        filterLoaded:        data.filter_loaded ?? data.model_loaded ?? false,
        classifierLoaded:    data.classifier_loaded ?? data.model_loaded ?? false,
        classifierReady:     data.classifier_ready ?? data.model_loaded ?? false,
        damageClasses:       data.damage_classes || (data.classes ? Object.values(data.classes) : []),
      };
    }
  } catch { /* server not running */ }
  _serverOnline = false;
  return { online: false, filterLoaded: false, classifierLoaded: false };
}

/**
 * Run full AI analysis: road filter + damage type classification.
 *
 * @param {string} base64  — data:image/jpeg;base64,... string
 * @returns {{
 *   isRoad: boolean,
 *   filterConfidence: number,
 *   damageType: string | null,
 *   damageConfidence: number,
 *   top3: Array<{label: string, confidence: number}>,
 *   source: string,
 *   fallback?: boolean,
 * }}
 */
export async function analyzeImage(base64) {
  if (!base64) throw new Error('No image provided');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // 1. Try New YOLOv8 AI Service (/analyze-road)
    const res = await fetch('/analyze-road', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        _serverOnline = true;
        const isRoad = !!data.store_in_db;
        const formattedType = data.prediction && data.prediction !== 'not_road'
          ? data.prediction.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : null;
        return {
          isRoad,
          filterConfidence: data.confidence || 0.85,
          damageType: formattedType,
          damageConfidence: data.confidence || 0.85,
          total_damages: data.total_damages || 0,
          detections: data.detections || [],
          store_in_db: data.store_in_db,
          source: 'yolov8_new_ai_service',
          top3: data.detections && data.detections.length > 0 ? [
            { label: formattedType || 'Road Damage', confidence: data.confidence || 0.85 }
          ] : [],
        };
      }
    }
  } catch (err) {
    console.warn('[AI] /analyze-road unavailable, trying fallback...', err.message);
  }

  // 2. Legacy /analyze endpoint fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    _serverOnline = true;
    return data;
  } catch (err) {
    _serverOnline = false;
    return { isRoad: true, filterConfidence: 0, damageType: null, damageConfidence: 0, top3: [], source: 'fallback', fallback: true };
  }
}

/**
 * Classify damage type only (no road filter step).
 * Useful when you already know it's a road image.
 */
export async function classifyDamageType(base64) {
  if (!base64) throw new Error('No image provided');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(CLASSIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[AI] /classify-damage error:', err.message);
    return { damageType: 'Unknown', confidence: 0, fallback: true };
  }
}

// Keep old classifyImage as alias for backward compat
export async function classifyImage(base64) {
  const result = await analyzeImage(base64);
  return {
    isRoad:     result.isRoad,
    confidence: result.filterConfidence,
    label:      result.isRoad ? 'Road Image' : 'Not a Road Image',
    source:     result.source,
    fallback:   result.fallback,
  };
}

// Pre-check server status on import
getModelStatus().then(s => {
  if (s.online) {
    const classifierStatus = s.classifierLoaded
      ? '(filter + damage classifier loaded)'
      : s.classifierReady
        ? '(filter loaded, damage classifier training needed)'
        : '(filter only — run: python create_damage_model.py)';
    console.log(`[AI] Model server ONLINE ${classifierStatus}`);
  } else {
    console.warn('[AI] Model server OFFLINE — heuristic-only mode');
  }
});
