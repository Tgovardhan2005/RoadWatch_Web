# -*- coding: utf-8 -*-
"""
create_damage_model.py
======================
Trains a MobileNetV2-based road damage TYPE classifier.

Classes (6):
  0 - Pothole
  1 - Crack
  2 - Surface Damage
  3 - Waterlogging
  4 - Construction Damage
  5 - No Damage (good road)

Usage:
  python create_damage_model.py

Output:
  frontend/damage_classifier.keras   <- trained model
  frontend/public/model/damage/      <- TF.js converted weights (optional)

How it works:
  1. Generates synthetic training images using NumPy (no external dataset needed)
  2. Augments each class with random transforms (flip, rotate, brightness, noise)
  3. Fine-tunes MobileNetV2 (pretrained ImageNet) with a new classification head
  4. Saves the model to .keras format for the Flask server to load
"""

import os, sys, json, struct
import numpy as np

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import tensorflow as tf
from tensorflow import keras

print(f"[DamageModel] TensorFlow {tf.__version__}")

# Limit TF memory growth to avoid OOM
try:
    gpus = tf.config.experimental.list_physical_devices('GPU')
    for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)
except Exception:
    pass

# ── Config ────────────────────────────────────────────────────────────────────
IMG_SIZE    = (128, 128)   # Smaller than 224 to reduce memory
BATCH_SIZE  = 4            # Small batch to avoid OOM
EPOCHS      = 15
SAMPLES_PER_CLASS = 200   # synthetic images per class
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, 'frontend', 'damage_classifier.keras')
CHECKPT_PATH = os.path.join(BASE_DIR, 'frontend', 'damage_classifier_ckpt.keras')
CLASSES     = ['Pothole', 'Crack', 'Surface Damage', 'Waterlogging', 'Construction Damage', 'No Damage']

np.random.seed(42)
tf.random.set_seed(42)

# ── Synthetic image generators ────────────────────────────────────────────────
def asphalt_base(h=224, w=224):
    """Dark gray noisy asphalt background."""
    base = np.random.randint(60, 100, (h, w, 3), dtype=np.uint8)
    noise = np.random.randint(-10, 10, (h, w, 3))
    return np.clip(base.astype(int) + noise, 30, 150).astype(np.uint8)

def gen_pothole(h=224, w=224):
    img = asphalt_base(h, w)
    n_holes = np.random.randint(1, 4)
    for _ in range(n_holes):
        cx, cy = np.random.randint(40, w-40), np.random.randint(40, h-40)
        rx, ry = np.random.randint(15, 50), np.random.randint(10, 40)
        for y in range(max(0, cy-ry), min(h, cy+ry)):
            for x in range(max(0, cx-rx), min(w, cx+rx)):
                if ((x-cx)/rx)**2 + ((y-cy)/ry)**2 < 1:
                    depth = 1 - np.sqrt(((x-cx)/rx)**2 + ((y-cy)/ry)**2)
                    img[y, x] = np.clip(img[y, x].astype(int) - int(depth * 60), 5, 255)
    return img

def gen_crack(h=224, w=224):
    img = asphalt_base(h, w)
    n_cracks = np.random.randint(1, 4)
    for _ in range(n_cracks):
        x, y = np.random.randint(0, w), np.random.randint(0, h)
        angle = np.random.uniform(0, np.pi)
        length = np.random.randint(60, 180)
        width  = np.random.randint(1, 4)
        for t in range(length):
            xi = int(x + t * np.cos(angle) + np.random.randint(-2, 2))
            yi = int(y + t * np.sin(angle) + np.random.randint(-2, 2))
            if 0 <= xi < w and 0 <= yi < h:
                for dw in range(-width, width+1):
                    if 0 <= xi+dw < w:
                        img[yi, xi+dw] = np.clip(img[yi, xi+dw].astype(int) - 45, 5, 255)
    return img

def gen_surface_damage(h=224, w=224):
    img = asphalt_base(h, w)
    # Many small pits and rough patches
    n_pits = np.random.randint(20, 60)
    for _ in range(n_pits):
        x, y = np.random.randint(0, w), np.random.randint(0, h)
        r = np.random.randint(3, 12)
        for dy in range(-r, r+1):
            for dx in range(-r, r+1):
                if dx**2 + dy**2 <= r**2 and 0 <= y+dy < h and 0 <= x+dx < w:
                    img[y+dy, x+dx] = np.clip(
                        img[y+dy, x+dx].astype(int) + np.random.randint(-40, 20), 5, 200)
    return img

def gen_waterlogging(h=224, w=224):
    img = asphalt_base(h, w)
    # Large water puddle — blue-gray, reflective
    pool_y = np.random.randint(20, h//2)
    pool_h = np.random.randint(h//3, h - pool_y - 10)
    # Water area: blueish, smooth
    water = np.zeros((pool_h, w, 3), dtype=np.uint8)
    water[:, :, 0] = np.random.randint(20, 60)   # R
    water[:, :, 1] = np.random.randint(40, 90)   # G
    water[:, :, 2] = np.random.randint(80, 140)  # B
    noise = np.random.randint(-8, 8, water.shape)
    img[pool_y:pool_y+pool_h, :] = np.clip(water.astype(int) + noise, 0, 255).astype(np.uint8)
    # Reflection highlights
    n_ref = np.random.randint(3, 8)
    for _ in range(n_ref):
        rx = np.random.randint(0, w-20)
        ry = np.random.randint(pool_y, pool_y + pool_h - 5)
        rw = np.random.randint(10, 40)
        img[ry:ry+3, rx:rx+rw] = np.clip(img[ry:ry+3, rx:rx+rw].astype(int) + 60, 0, 255)
    return img

def gen_construction_damage(h=224, w=224):
    img = asphalt_base(h, w)
    # Orange/yellow safety cones or barriers
    n_cones = np.random.randint(2, 5)
    for _ in range(n_cones):
        cx = np.random.randint(20, w-20)
        base_y = np.random.randint(h//2, h-10)
        cone_h = np.random.randint(20, 50)
        cone_w = np.random.randint(8, 20)
        for y in range(base_y - cone_h, base_y):
            ratio = (base_y - y) / cone_h
            w_at_y = max(2, int(cone_w * ratio))
            x_start = cx - w_at_y
            x_end   = cx + w_at_y
            if 0 <= y < h:
                for x in range(max(0, x_start), min(w, x_end)):
                    # Orange stripes
                    if (y // 6) % 2 == 0:
                        img[y, x] = [220, 100, 20]
                    else:
                        img[y, x] = [240, 180, 10]
    # Dug-up section
    dug_x = np.random.randint(0, w//2)
    dug_w = np.random.randint(50, 100)
    dug_y = np.random.randint(20, h//2)
    dug_h = np.random.randint(30, 80)
    for y in range(dug_y, min(h, dug_y+dug_h)):
        for x in range(dug_x, min(w, dug_x+dug_w)):
            img[y, x] = np.clip(
                np.array([60, 40, 30]) + np.random.randint(-15, 15, 3), 0, 255)
    return img

def gen_no_damage(h=224, w=224):
    """Smooth uniform asphalt — good road."""
    base = np.random.randint(70, 110, (h, w, 3), dtype=np.uint8)
    noise = np.random.randint(-8, 8, (h, w, 3))
    img = np.clip(base.astype(int) + noise, 40, 160).astype(np.uint8)
    # Optional lane markings
    if np.random.random() > 0.5:
        mark_x = np.random.randint(w//4, 3*w//4)
        img[h//3:2*h//3, mark_x:mark_x+8] = [220, 220, 180]
    return img

GENERATORS = [gen_pothole, gen_crack, gen_surface_damage,
              gen_waterlogging, gen_construction_damage, gen_no_damage]

def augment(img):
    """Apply random augmentation: flip, rotate, brightness."""
    # Horizontal flip
    if np.random.random() > 0.5:
        img = img[:, ::-1]
    # Vertical flip
    if np.random.random() > 0.5:
        img = img[::-1, :]
    # Brightness jitter
    factor = np.random.uniform(0.7, 1.4)
    img = np.clip(img.astype(float) * factor, 0, 255).astype(np.uint8)
    # Gaussian noise
    noise = np.random.randint(-15, 15, img.shape)
    img = np.clip(img.astype(int) + noise, 0, 255).astype(np.uint8)
    return img

# ── Build dataset ─────────────────────────────────────────────────────────────
print(f"[DamageModel] Generating {SAMPLES_PER_CLASS * len(CLASSES)} synthetic images...")
X, y = [], []
for class_idx, (cls, gen) in enumerate(zip(CLASSES, GENERATORS)):
    print(f"  [{class_idx}] {cls} ...", end=' ', flush=True)
    for i in range(SAMPLES_PER_CLASS):
        img = gen(IMG_SIZE[0], IMG_SIZE[1])
        if i % 3 != 0:  # augment 2/3 of samples
            img = augment(img)
        X.append(img)
        y.append(class_idx)
    print(f"{SAMPLES_PER_CLASS} images")

X = np.array(X, dtype=np.float32) / 255.0   # normalize to [0,1]
y = np.array(y, dtype=np.int32)

# Shuffle
idx = np.random.permutation(len(X))
X, y = X[idx], y[idx]

# Split train / val (80/20)
split = int(0.8 * len(X))
X_train, X_val = X[:split], X[split:]
y_train, y_val = y[:split], y[split:]
print(f"[DamageModel] Train: {len(X_train)}, Val: {len(X_val)}")

# ── Build model ───────────────────────────────────────────────────────────────
print("[DamageModel] Building MobileNetV2 transfer learning model...")

base_model = keras.applications.MobileNetV2(
    input_shape=(*IMG_SIZE, 3),
    include_top=False,
    weights='imagenet',
    pooling='avg',
)
base_model.trainable = False  # freeze backbone

inputs  = keras.Input(shape=(*IMG_SIZE, 3))
# MobileNetV2 expects [-1, 1] range — we pass [0,1] so rescale here
x       = keras.layers.Rescaling(scale=2.0, offset=-1.0)(inputs)
x       = base_model(x, training=False)
x       = keras.layers.Dropout(0.3)(x)
x       = keras.layers.Dense(128, activation='relu')(x)
x       = keras.layers.BatchNormalization()(x)
x       = keras.layers.Dropout(0.2)(x)
outputs = keras.layers.Dense(len(CLASSES), activation='softmax')(x)

model = keras.Model(inputs, outputs)
model.compile(
    optimizer=keras.optimizers.Adam(1e-3),
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy'],
)
model.summary()

# ── Train ─────────────────────────────────────────────────────────────────────
print(f"\n[DamageModel] Training for {EPOCHS} epochs...")

callbacks = [
    keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True, monitor='val_accuracy'),
    keras.callbacks.ReduceLROnPlateau(patience=2, factor=0.5, monitor='val_loss', verbose=1),
    keras.callbacks.ModelCheckpoint(CHECKPT_PATH, save_best_only=True, monitor='val_accuracy', verbose=1),
]

history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=callbacks,
    verbose=1,
)

val_acc = max(history.history['val_accuracy'])
print(f"\n[DamageModel] Best val accuracy: {val_acc*100:.1f}%")

# ── Fine-tune top layers (optional) ──────────────────────────────────────────
if val_acc < 0.75:
    print("[DamageModel] Fine-tuning top 20 layers of MobileNetV2...")
    base_model.trainable = True
    for layer in base_model.layers[:-20]:
        layer.trainable = False
    model.compile(
        optimizer=keras.optimizers.Adam(1e-4),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy'],
    )
    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=10,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1,
    )

# ── Save ──────────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
model.save(OUTPUT_PATH)
print(f"\n[DamageModel] Saved to: {OUTPUT_PATH}")
print(f"[DamageModel] Classes: {CLASSES}")
print("[DamageModel] Run model_server.py to serve predictions via /classify-damage")
