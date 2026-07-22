"""
RoadWatch AI Microservice (Flask + YOLOv8)
Loads roadwatch_yolov8_final_87_percent.pt and exposes /analyze-road and /predict endpoints.
"""

import os
import io
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from ultralytics import YOLO

# ── Logging Setup ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# ── Flask Setup ──────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)  # Enable cross-origin requests for frontend

# ── Model Resolution ──────────────────────────────────────────────────────────
MODEL_FILENAME = "roadwatch_yolov8_final_87_percent.pt"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

POSSIBLE_PATHS = [
    os.path.join(BASE_DIR, MODEL_FILENAME),
    os.path.join(BASE_DIR, "..", "ai_service", MODEL_FILENAME),
    os.path.join(BASE_DIR, "..", "ai_service", "model", MODEL_FILENAME),
    MODEL_FILENAME
]

model = None
selected_model_path = None

for path in POSSIBLE_PATHS:
    if os.path.exists(path):
        selected_model_path = path
        break

if selected_model_path:
    try:
        logger.info("Loading YOLOv8 model from: %s", selected_model_path)
        model = YOLO(selected_model_path)
        logger.info("✅ YOLOv8 model loaded successfully! Classes: %s", getattr(model, "names", {}))
    except Exception as exc:
        logger.exception("❌ Error loading YOLO model from %s: %s", selected_model_path, exc)
else:
    logger.error("❌ Model file %s not found in any expected directory.", MODEL_FILENAME)


import base64

# ── Core Analysis Function ───────────────────────────────────────────────────
def process_road_image(image_input, target_conf=0.15):
    """
    Reads image file or bytes/base64, runs YOLOv8 model prediction, formats bounding boxes,
    and returns a structured dictionary result.
    """
    if model is None:
        return {"error": "AI Model is not loaded. Ensure roadwatch_yolov8_final_87_percent.pt is present."}, 503

    try:
        if isinstance(image_input, bytes):
            image_bytes = image_input
        elif hasattr(image_input, "read"):
            image_bytes = image_input.read()
        elif isinstance(image_input, str):
            if "," in image_input:
                image_input = image_input.split(",", 1)[1]
            image_bytes = base64.b64decode(image_input)
        else:
            return {"error": "Invalid image input format"}, 400

        if not image_bytes:
            return {"error": "Uploaded image file is empty"}, 400

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Run YOLOv8 inference with initial threshold
        results = model.predict(source=img, conf=target_conf, verbose=False)

        # Fallback to lower threshold if no detections initially found
        if not results or not hasattr(results[0], "boxes") or len(results[0].boxes) == 0:
            results = model.predict(source=img, conf=0.05, verbose=False)

        detections = []
        max_confidence = 0.0

        for result in results:
            if not hasattr(result, "boxes") or result.boxes is None:
                continue

            for box in result.boxes:
                class_id = int(box.cls[0].item()) if hasattr(box.cls[0], "item") else int(box.cls[0])
                confidence = float(box.conf[0].item()) if hasattr(box.conf[0], "item") else float(box.conf[0])

                if confidence > max_confidence:
                    max_confidence = confidence

                # Bounding box coordinates
                xyxy = box.xyxy[0].tolist()
                x1, y1, x2, y2 = float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])
                area = (x2 - x1) * (y2 - y1)
                severity = "Critical" if area > 50000 else "Medium"

                # Class name mapping
                damage_type = model.names.get(class_id, "road_damage") if hasattr(model, "names") else "road_damage"

                detections.append({
                    "damage_type": damage_type,
                    "confidence": round(confidence * 100, 2),
                    "severity": severity,
                    "bounding_box": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2)
                    }
                })

        total_damages = len(detections)
        store_in_db = total_damages > 0 or max_confidence >= 0.15
        prediction = detections[0]["damage_type"] if detections else ("road_damage" if store_in_db else "not_road")
        norm_confidence = round(max_confidence, 4) if max_confidence > 0 else (0.87 if store_in_db else 0.15)

        response_data = {
            "success": True,
            "total_damages": total_damages,
            "detections": detections,
            "prediction": prediction,
            "confidence": norm_confidence,
            "store_in_db": store_in_db
        }

        return response_data, 200

    except Exception as exc:
        logger.exception("Error analyzing image: %s", exc)
        return {"error": f"AI Analysis failed: {str(exc)}"}, 500


def extract_image_from_request(req):
    conf = req.args.get("conf", default=0.15, type=float)
    if "image" in req.files:
        return req.files["image"], conf
    if req.is_json:
        data = req.get_json(silent=True) or {}
        img_val = data.get("imageBase64") or data.get("image")
        if img_val:
            return img_val, conf
    return None, conf


# ── Flask Endpoints ──────────────────────────────────────────────────────────

@app.route("/analyze-road", methods=["POST"])
def analyze_road():
    img_input, conf = extract_image_from_request(request)
    if not img_input:
        return jsonify({"error": "No image file or imageBase64 provided"}), 400

    result_data, status_code = process_road_image(img_input, target_conf=conf)
    return jsonify(result_data), status_code


@app.route("/predict", methods=["POST"])
def predict():
    img_input, conf = extract_image_from_request(request)
    if not img_input:
        return jsonify({"error": "No image file or imageBase64 provided"}), 400

    result_data, status_code = process_road_image(img_input, target_conf=conf)
    return jsonify(result_data), status_code


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": selected_model_path,
        "classes": getattr(model, "names", {}) if model else {}
    }), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
