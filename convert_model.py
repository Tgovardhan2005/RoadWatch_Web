"""
convert_model_v2.py — Convert .keras model to TF.js GraphModel format
Uses tf.lite + a bridge approach that works with TF 2.x without needing tensorflowjs.

Run: python convert_model_v2.py
"""
import os, sys, json, struct, math
import numpy as np

base = os.path.dirname(os.path.abspath(__file__))
KERAS_PATH  = os.path.join(base, 'frontend', 'road_damage_filter_model.keras')
OUTPUT_DIR  = os.path.join(base, 'frontend', 'public', 'model')

def main():
    if not os.path.exists(KERAS_PATH):
        print(f"[ERROR] Model not found: {KERAS_PATH}"); sys.exit(1)

    import tensorflow as tf
    print(f"[OK] TensorFlow {tf.__version__}")
    
    # ── Patch numpy aliases removed in NumPy 2 ─────────────────────────────────
    if not hasattr(np, 'object'):  np.object  = object
    if not hasattr(np, 'bool'):    np.bool    = bool
    if not hasattr(np, 'int'):     np.int     = int
    if not hasattr(np, 'float'):   np.float   = float
    if not hasattr(np, 'complex'): np.complex = complex

    model = tf.keras.models.load_model(KERAS_PATH)
    print(f"[OK] Loaded model: {model.input_shape} -> {model.output_shape}")
    print(f"[OK] Params: {model.count_params():,}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── Try tensorflowjs save_keras_model (patched) ────────────────────────────
    try:
        import tensorflowjs as tfjs
        tfjs.converters.save_keras_model(model, OUTPUT_DIR)
        _print_output()
        return
    except Exception as e:
        print(f"[WARN] save_keras_model failed: {type(e).__name__}: {e}")

    # ── Fallback: export weights as JSON + bin manually ────────────────────────
    print("[INFO] Falling back to manual weight export...")
    _export_manual(model, OUTPUT_DIR)

def _export_manual(model, out_dir):
    """Export model topology + weights in TF.js Layers format manually."""
    import tensorflow as tf

    # Serialize the Keras config
    config = model.get_config()
    model_json = {
        "modelTopology": {
            "class_name": model.__class__.__name__,
            "config": config,
            "keras_version": tf.keras.__version__,
            "backend": "tensorflow",
        },
        "format": "layers-model",
        "generatedBy": f"TensorFlow.js tfjs-converter v4.x (manual)",
        "convertedBy": "convert_model_v2.py",
    }

    # Extract weights
    weights_manifest = []
    all_weight_bytes = bytearray()
    weight_specs = []
    byte_offset = 0

    for layer in model.layers:
        layer_weights = layer.get_weights()
        layer_vars = layer.trainable_weights + layer.non_trainable_weights
        for var, arr in zip(layer_vars, layer_weights):
            flat = arr.flatten().astype(np.float32)
            raw = flat.tobytes()
            spec = {
                "name": var.name,
                "shape": list(arr.shape),
                "dtype": "float32",
            }
            weight_specs.append(spec)
            all_weight_bytes.extend(raw)
            byte_offset += len(raw)

    # Write weights binary
    bin_path = os.path.join(out_dir, "group1-shard1of1.bin")
    with open(bin_path, 'wb') as f:
        f.write(all_weight_bytes)
    print(f"[OK] Wrote weights: {len(all_weight_bytes)/1024:.1f} KB -> {bin_path}")

    weights_manifest = [{
        "paths": ["group1-shard1of1.bin"],
        "weights": weight_specs,
    }]
    model_json["weightsManifest"] = weights_manifest

    # Write model.json
    json_path = os.path.join(out_dir, "model.json")
    with open(json_path, 'w') as f:
        json.dump(model_json, f, indent=2)
    print(f"[OK] Wrote model topology: {json_path}")

    _print_output()

def _print_output():
    print("\n✅ Conversion complete!")
    print(f"Output: {OUTPUT_DIR}")
    for f in sorted(os.listdir(OUTPUT_DIR)):
        fpath = os.path.join(OUTPUT_DIR, f)
        if os.path.isfile(fpath):
            print(f"  📄 {f}  ({os.path.getsize(fpath)/1024:.1f} KB)")

if __name__ == '__main__':
    main()
