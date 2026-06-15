/**
 * roadDamageModel.js
 * Calls the Python Flask inference server (port 5003) which runs
 * the actual road_damage_filter_model.keras model.
 *
 * Usage:
 *   import { classifyImage, getModelStatus } from './utils/roadDamageModel';
 *   const result = await classifyImage(base64String);
 *   // { isRoad: true, confidence: 0.92, label: 'Road Damage', source: 'keras_model' }
 */

const PREDICT_URL = '/predict';
const HEALTH_URL  = '/health';

// ── Model status cache ────────────────────────────────────────────────────────
let _statusCache = null; // 'online' | 'offline' | 'checking'

/**
 * Check if the Python model server is running.
 * @returns {{ online: boolean, modelLoaded: boolean }}
 */
export async function getModelStatus() {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      _statusCache = 'online';
      return { online: true, modelLoaded: data.model_loaded };
    }
  } catch { /* server not running */ }
  _statusCache = 'offline';
  return { online: false, modelLoaded: false };
}

/**
 * Run road-damage classification using the Keras model (via Python server).
 *
 * @param {string} base64 — data:image/jpeg;base64,... string
 * @returns {{
 *   isRoad: boolean,
 *   confidence: number,      // 0-1 scale
 *   label: string,           // 'Road Damage' | 'Not a Road Image'
 *   source: string,          // 'keras_model' | 'fallback'
 *   rawScore: number,        // raw sigmoid output
 *   fallback?: boolean,      // true if server was unavailable
 * }}
 */
export async function classifyImage(base64) {
  if (!base64) throw new Error('No image provided');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(PREDICT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = await res.json();
    _statusCache = 'online';

    // Handle server-side fallback (model not loaded)
    if (data.fallback) {
      console.warn('[AI] Model server running but model returned fallback');
      return { isRoad: true, confidence: 0, label: 'Model unavailable', source: 'fallback', fallback: true };
    }

    console.log(`[AI] Keras model prediction: ${data.label} (score=${data.rawScore}, conf=${data.confidence})`);
    return data;

  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[AI] Model server timeout — falling back to heuristic');
    } else {
      console.warn('[AI] Model server unavailable:', err.message);
    }
    _statusCache = 'offline';
    // Return fallback — ReportForm will fall through to heuristic
    return { isRoad: true, confidence: 0, label: 'Server offline', source: 'fallback', fallback: true };
  }
}

// Pre-check server on import
getModelStatus().then(status => {
  if (status.online) {
    console.log('[AI] Keras model server: ONLINE ✓', status.modelLoaded ? '(model loaded)' : '(loading...)');
  } else {
    console.warn('[AI] Keras model server: OFFLINE — heuristic-only mode');
  }
});
