# -*- coding: utf-8 -*-
"""
model_server.py
===============
Python Flask inference server — RoadWatch AI Models.
Port 5003.

Endpoints:
  GET  /health             → server + model status
  POST /predict            → road/not-road filter    (road_damage_filter_model.keras)
  POST /classify-damage    → damage type classifier  (damage_classifier.keras)
  POST /analyze            → combined: filter + classify in one call

Usage:
  python model_server.py
"""

import os, sys, base64, io
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

app  = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:5002"])

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
FILTER_PATH     = os.path.join(BASE_DIR, 'frontend', 'road_damage_filter_model.keras')
CLASSIFIER_PATH = os.path.join(BASE_DIR, 'frontend', 'damage_classifier.keras')
IMG_SIZE        = (224, 224)   # Road filter model input size
DAMAGE_IMG_SIZE = (128, 128)   # Damage classifier input size
ROAD_THRESHOLD  = 0.5

# Damage class labels (must match create_damage_model.py order)
DAMAGE_CLASSES = [
    'Pothole',
    'Crack',
    'Surface Damage',
    'Waterlogging',
    'Construction Damage',
    'No Damage',
]

# ── Model state ────────────────────────────────────────────────────────────────
filter_model     = None
classifier_model = None

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_filter():
    global filter_model
    if filter_model is not None:
        return filter_model
    import tensorflow as tf
    print(f"[Server] Loading filter model: {FILTER_PATH}")
    filter_model = tf.keras.models.load_model(FILTER_PATH)
    # Warm up
    filter_model.predict(np.zeros((1, *IMG_SIZE, 3), dtype=np.float32), verbose=0)
    print(f"[Server] Filter model ready. Input: {filter_model.input_shape}")
    return filter_model

def load_classifier():
    global classifier_model
    if classifier_model is not None:
        return classifier_model
    if not os.path.exists(CLASSIFIER_PATH):
        print(f"[Server] Damage classifier not found at {CLASSIFIER_PATH}")
        print("[Server] Run: python create_damage_model.py  to train it.")
        return None
    import tensorflow as tf
    print(f"[Server] Loading damage classifier: {CLASSIFIER_PATH}")
    classifier_model = tf.keras.models.load_model(CLASSIFIER_PATH)
    classifier_model.predict(np.zeros((1, *DAMAGE_IMG_SIZE, 3), dtype=np.float32), verbose=0)
    print(f"[Server] Damage classifier ready. Classes: {DAMAGE_CLASSES}")
    return classifier_model

def decode_image(base64_str, size=None):
    """base64 (with or without data URI header) -> numpy float32 [0,1] (1,H,W,3)"""
    from PIL import Image
    if size is None:
        size = IMG_SIZE
    if ',' in base64_str:
        base64_str = base64_str.split(',', 1)[1]
    img_bytes = base64.b64decode(base64_str)
    img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    img = img.resize(size, Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':            'ok',
        'filter_loaded':     filter_model is not None,
        'classifier_loaded': classifier_model is not None,
        'classifier_ready':  os.path.exists(CLASSIFIER_PATH),
        'damage_classes':    DAMAGE_CLASSES,
    })

# ── 1. Road / Not-Road filter ──────────────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(silent=True)
    if not data or 'imageBase64' not in data:
        return jsonify({'error': 'Missing imageBase64'}), 400
    try:
        m   = load_filter()
        img = decode_image(data['imageBase64'])
        # Filter model was trained with [-1, 1] normalization
        img_norm = (img * 2.0) - 1.0
        raw = float(m.predict(img_norm, verbose=0)[0][0])
        is_road    = raw >= ROAD_THRESHOLD
        confidence = raw if is_road else (1.0 - raw)
        return jsonify({
            'isRoad':     bool(is_road),
            'confidence': round(confidence, 4),
            'rawScore':   round(raw, 4),
            'label':      'Road Image' if is_road else 'Not a Road Image',
            'source':     'keras_filter',
        })
    except Exception as e:
        print(f"[Server] /predict error: {e}")
        return jsonify({'isRoad': True, 'confidence': 0, 'fallback': True}), 200

# ── 2. Damage type classifier ─────────────────────────────────────────────────
@app.route('/classify-damage', methods=['POST'])
def classify_damage():
    data = request.get_json(silent=True)
    if not data or 'imageBase64' not in data:
        return jsonify({'error': 'Missing imageBase64'}), 400
    try:
        m = load_classifier()
        if m is None:
            return jsonify({
                'damageType': 'Unknown',
                'confidence': 0,
                'fallback':   True,
                'message':    'Damage classifier not trained yet. Run: python create_damage_model.py',
            }), 200

        img    = decode_image(data['imageBase64'], size=DAMAGE_IMG_SIZE)
        probs  = m.predict(img, verbose=0)[0]         # softmax [6]
        top_idx   = int(np.argmax(probs))
        top_prob  = float(probs[top_idx])

        # Top-3 results for the UI
        top3_idx  = np.argsort(probs)[::-1][:3]
        top3      = [{'label': DAMAGE_CLASSES[i], 'confidence': round(float(probs[i]), 4)}
                     for i in top3_idx]

        return jsonify({
            'damageType':  DAMAGE_CLASSES[top_idx],
            'confidence':  round(top_prob, 4),
            'allClasses':  [{'label': c, 'confidence': round(float(p), 4)}
                            for c, p in zip(DAMAGE_CLASSES, probs)],
            'top3':        top3,
            'source':      'damage_classifier',
        })
    except Exception as e:
        print(f"[Server] /classify-damage error: {e}")
        return jsonify({'damageType': 'Unknown', 'confidence': 0, 'fallback': True}), 200

# ── 3. Combined: filter + classify in one request ─────────────────────────────
@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json(silent=True)
    if not data or 'imageBase64' not in data:
        return jsonify({'error': 'Missing imageBase64'}), 400
    try:
        img_b64 = data['imageBase64']
        img     = decode_image(img_b64)

        # Stage 1: Road filter
        fm        = load_filter()
        img_norm  = (img * 2.0) - 1.0
        raw       = float(fm.predict(img_norm, verbose=0)[0][0])
        is_road   = raw >= ROAD_THRESHOLD
        filter_conf = raw if is_road else (1.0 - raw)

        result = {
            'isRoad':          bool(is_road),
            'filterConfidence': round(filter_conf, 4),
            'damageType':      None,
            'damageConfidence': 0,
            'top3':            [],
            'source':          'keras_filter+damage_classifier',
        }

        # Stage 2: Damage classifier (only if road image)
        if is_road:
            cm = load_classifier()
            if cm is not None:
                dmg_img    = decode_image(img_b64, size=DAMAGE_IMG_SIZE)
                probs      = cm.predict(dmg_img, verbose=0)[0]
                top_idx    = int(np.argmax(probs))
                result['damageType']       = DAMAGE_CLASSES[top_idx]
                result['damageConfidence'] = round(float(probs[top_idx]), 4)
                top3_idx   = np.argsort(probs)[::-1][:3]
                result['top3'] = [
                    {'label': DAMAGE_CLASSES[i], 'confidence': round(float(probs[i]), 4)}
                    for i in top3_idx
                ]

        return jsonify(result)
    except Exception as e:
        print(f"[Server] /analyze error: {e}")
        return jsonify({'isRoad': True, 'damageType': 'Unknown', 'confidence': 0, 'fallback': True}), 200

# ── Startup ───────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("[Server] RoadWatch AI Server starting on port 5003...")
    try:
        load_filter()
    except Exception as e:
        print(f"[Server] Filter model error: {e}")
    try:
        load_classifier()
    except Exception as e:
        print(f"[Server] Damage classifier error: {e}")
    app.run(host='0.0.0.0', port=5003, debug=False)
