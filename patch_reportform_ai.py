# patch_reportform_ai.py — updates AI analysis in ReportForm.jsx
import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r'e:\Projects - 2k25\RW v2\frontend\src\components\Citizen\ReportForm.jsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# 1. Fix import
src = src.replace(
    "import { classifyImage, getModelStatus } from '../../utils/roadDamageModel';",
    "import { analyzeImage, getModelStatus } from '../../utils/roadDamageModel';"
)
print("Import fix applied:", "analyzeImage" in src)

# 2. Find the AI section between the stage markers
# We look for the block that starts with "Stage 1" and ends before "} catch (err)"
START_MARKER = '// \u2500\u2500 Stage 1: Keras model'
END_MARKER   = '      } catch (err) {'

# Normalize to \n for searching
src_n = src.replace('\r\n', '\n')
s = src_n.find(START_MARKER)
e = src_n.find(END_MARKER, s)

if s == -1 or e == -1:
    # Try alternate marker
    START_MARKER = '// -- Stage 1'
    s = src_n.find(START_MARKER)
    e = src_n.find(END_MARKER, s)

if s == -1 or e == -1:
    # Try locating via classifyImage call
    s = src_n.find('kerasResult = await classifyImage')
    if s != -1:
        # Back up to find block start
        s = src_n.rfind('\n        //', 0, s) + 1  # find preceding comment line
    e = src_n.find(END_MARKER, s)

print(f"Block: {s} -> {e}")
if s == -1 or e == -1:
    print("Could not locate block. Showing relevant section:")
    idx = src_n.find('classifyImage')
    print(repr(src_n[max(0,idx-200):idx+500]))
    sys.exit(1)

old_block = src_n[s:e]
print("Old block found, length:", len(old_block))

new_block = """        // AI Analysis: road filter + damage type classifier (single call to /analyze)
        let aiAnalysis = null;
        try {
          aiAnalysis = await analyzeImage(b64);
        } catch (modelErr) {
          console.warn('[AI] Model server error:', modelErr.message);
        }

        // Stage 1: Road filter — block non-road images
        if (aiAnalysis && !aiAnalysis.fallback && !aiAnalysis.isRoad && aiAnalysis.filterConfidence > 0.6) {
          setAiResult({
            valid: false,
            damageType: 'Invalid Image',
            confidence: aiAnalysis.filterConfidence,
            reason: "This doesn't look like a road photo. Please upload a clear photo of the damaged road surface.",
            source: 'keras_filter',
          });
          setAiLoading(false);
          return;
        }

        // Stage 2: Damage type from classifier
        const classifierDamageType = aiAnalysis?.damageType && aiAnalysis.damageType !== 'No Damage'
          ? aiAnalysis.damageType : null;
        const classifierTop3 = aiAnalysis?.top3 || [];

        // Also call heuristic backend for fallback + confidence
        try {
          const res = await fetch(`${API_BASE_URL}/api/ai/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: b64 }),
          });
          if (res.ok) {
            const heurData = await res.json();
            const finalDamageType = classifierDamageType || heurData.damageType || 'Unknown';
            const merged = {
              ...heurData,
              damageType: finalDamageType,
              source: aiAnalysis && !aiAnalysis.fallback ? 'keras_classifier' : 'heuristic',
              kerasVerified: aiAnalysis?.isRoad ?? null,
              kerasConfidence: aiAnalysis?.filterConfidence ?? null,
              damageConfidence: aiAnalysis?.damageConfidence || 0,
              top3: classifierTop3,
              confidence: aiAnalysis?.isRoad
                ? Math.min(0.99, (heurData.confidence || 0.5) + 0.08)
                : (heurData.confidence || 0.5),
            };
            setAiResult(merged);
            if (merged.valid && finalDamageType && !['Invalid Image','No Damage','Unknown'].includes(finalDamageType)) {
              setDamageType(finalDamageType);
            }
          }
        } catch (_heurErr) {
          // Heuristic unavailable — use classifier result only
          if (aiAnalysis && !aiAnalysis.fallback) {
            const finalDamageType = classifierDamageType || 'Unknown';
            const isValid = aiAnalysis.isRoad && finalDamageType !== 'No Damage';
            setAiResult({
              valid: isValid,
              damageType: finalDamageType,
              confidence: aiAnalysis.damageConfidence || aiAnalysis.filterConfidence || 0.5,
              reason: isValid ? 'Road damage detected by AI.' : 'No significant damage detected.',
              source: 'keras_classifier',
              top3: classifierTop3,
              kerasVerified: aiAnalysis.isRoad,
              kerasConfidence: aiAnalysis.filterConfidence,
              damageConfidence: aiAnalysis.damageConfidence || 0,
            });
            if (isValid) setDamageType(finalDamageType);
          }
        }
"""

result = src_n[:s] + new_block + src_n[e:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(result)
print(f"Done. Saved {len(result)} bytes.")
