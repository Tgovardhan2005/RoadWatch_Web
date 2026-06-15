# -*- coding: utf-8 -*-
"""
model_server.py — Python Flask inference server for road damage filter
Loads the .keras model and serves predictions on port 5003.

Start: python model_server.py
Endpoint: POST http://localhost:5003/predict
Body: { "imageBase64": "data:image/jpeg;base64,..." }
Response: { "isRoad": true, "confidence": 0.92, "label": "Road Damage" }
"""

import os
import sys
import base64
import io
import json
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Suppress TF verbose logs ───────────────────────────────────────────────────
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:5002"])

# ── Model config ───────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(BASE_DIR, 'frontend', 'road_damage_filter_model.keras')
IMG_SIZE    = (224, 224)
THRESHOLD   = 0.5    # above this = road damage
model       = None

def load_model():
    global model
    if model is not None:
        return model
    import tensorflow as tf
    print(f"[ModelServer] Loading model from {MODEL_PATH} ...")
    model = tf.keras.models.load_model(MODEL_PATH)
    print(f"[ModelServer] Model loaded. Input: {model.input_shape}, Output: {model.output_shape}")
    # Warm up with a dummy inference
    dummy = np.zeros((1, *IMG_SIZE, 3), dtype=np.float32)
    model.predict(dummy, verbose=0)
    print("[ModelServer] Model warmed up and ready.")
    return model

def preprocess_image(base64_str):
    """Decode base64 → PIL Image → numpy array [1, 224, 224, 3] normalized."""
    from PIL import Image
    # Strip data URI header if present
    if ',' in base64_str:
        base64_str = base64_str.split(',', 1)[1]
    img_bytes = base64.b64decode(base64_str)
    img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    img = img.resize(IMG_SIZE, Image.BILINEAR)
    arr = np.array(img, dtype=np.float32)
    # Normalize to [-1, 1] — matches MobileNet-style preprocessing
    arr = (arr / 127.5) - 1.0
    return np.expand_dims(arr, axis=0)  # shape: (1, 224, 224, 3)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': model is not None})

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(silent=True)
    if not data or 'imageBase64' not in data:
        return jsonify({'error': 'Missing imageBase64 field'}), 400

    try:
        m = load_model()
        tensor = preprocess_image(data['imageBase64'])
        raw_score = float(m.predict(tensor, verbose=0)[0][0])

        # Binary sigmoid: output ∈ [0, 1]
        # Determine what your model was trained to predict:
        # If class 1 = "Road Damage" (positive label):
        is_road = raw_score >= THRESHOLD
        confidence = raw_score if is_road else (1.0 - raw_score)

        return jsonify({
            'isRoad': bool(is_road),
            'confidence': round(confidence, 4),
            'rawScore': round(raw_score, 4),
            'label': 'Road Damage' if is_road else 'Not a Road Image',
            'source': 'keras_model',
        })
    except Exception as e:
        print(f"[ModelServer] Prediction error: {e}")
        return jsonify({'error': str(e), 'isRoad': True, 'confidence': 0, 'fallback': True}), 200

if __name__ == '__main__':
    print("[ModelServer] Starting RoadWatch AI Model Server on port 5003...")
    # Pre-load model before serving requests
    try:
        load_model()
    except Exception as e:
        print(f"[ModelServer] WARNING: Could not pre-load model: {e}")
    app.run(host='0.0.0.0', port=5003, debug=False)
