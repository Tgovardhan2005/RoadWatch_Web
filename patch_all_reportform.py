# patch_all_reportform.py
# Applies all AI-related changes to ReportForm.jsx in one pass:
# 1. Import classifyImage -> analyzeImage
# 2. handleImageFile: use /analyze (combined) endpoint
# 3. AiResultCard 'verified': show top-3 damage breakdown
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

path = r'e:\Projects - 2k25\RW v2\frontend\src\components\Citizen\ReportForm.jsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

original_len = len(src)
print(f"Original: {original_len} bytes")

# ── 1. Fix import ─────────────────────────────────────────────────────────────
OLD1 = "import { classifyImage, getModelStatus } from '../../utils/roadDamageModel';"
NEW1 = "import { analyzeImage, getModelStatus } from '../../utils/roadDamageModel';"
assert OLD1 in src, "Import not found!"
src = src.replace(OLD1, NEW1, 1)
print("1. Import fixed")

# ── 2. Replace AI analysis block in handleImageFile ───────────────────────────
# Find the section by unique markers
ANALYSIS_START = "// ── Stage 1: Keras model"
ANALYSIS_END   = "      } catch (err) {"

s = src.find(ANALYSIS_START)
assert s != -1, f"Analysis start not found: {ANALYSIS_START!r}"
e = src.find(ANALYSIS_END, s)
assert e != -1, "Analysis end not found"

print(f"2. Analysis block found: chars {s}-{e}, len={e-s}")

new_analysis = """        // AI Analysis: road filter + damage type classifier (single /analyze call)
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
            reason: "This doesn't look like a road photo. Please upload a clear photo of the road surface.",
            source: 'keras_filter',
          });
          setAiLoading(false);
          return;
        }

        // Stage 2: Damage type from AI classifier
        const classifierDamageType = aiAnalysis?.damageType && aiAnalysis.damageType !== 'No Damage'
          ? aiAnalysis.damageType : null;
        const classifierTop3 = aiAnalysis?.top3 || [];

        // Also call heuristic backend for fallback validation
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

src = src[:s] + new_analysis + src[e:]
print(f"2. Analysis block replaced. New len: {len(src)}")

# ── 3. Replace AiResultCard 'verified' section ────────────────────────────────
VERIFIED_START = "  // ── 3. Verified: damage found"
VERIFIED_END   = "\n  return null;\n}"

vs = src.find(VERIFIED_START)
assert vs != -1, "Verified section start not found"
ve = src.find(VERIFIED_END, vs)
assert ve != -1, "Verified section end not found"

print(f"3. Verified section found: chars {vs}-{ve}")

# New verified section — uses ASCII-safe emoji (encoded as actual chars)
new_verified = (
    "  // \u2500\u2500 3. Verified: damage found \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n"
    "  if (category === 'verified') {\n"
    "    const TYPE_META = {\n"
    "      'Pothole':             { icon: '\U0001f573\ufe0f', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },\n"
    "      'Crack':               { icon: '\U0001f4a5', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },\n"
    "      'Surface Damage':      { icon: '\U0001fa8a', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },\n"
    "      'Waterlogging':        { icon: '\U0001f4a7', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },\n"
    "      'Construction Damage': { icon: '\U0001f6a7', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },\n"
    "      'No Damage':           { icon: '\u2705',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },\n"
    "    };\n"
    "    const meta = TYPE_META[aiResult.damageType] || { icon: '\U0001f6e3\ufe0f', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };\n"
    "    const top3 = aiResult.top3 || [];\n"
    "    const hasTop3 = top3.length > 1;\n"
    "\n"
    "    return (\n"
    "      <div style={{ borderRadius: 14, border: '2px solid #bbf7d0', background: '#f0fdf4', padding: '1.25rem', marginBottom: '1rem' }}>\n"
    "        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: hasTop3 ? '1rem' : 0 }}>\n"
    "          <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>\u2705</div>\n"
    "          <div style={{ flex: 1 }}>\n"
    "            <p style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9375rem', marginBottom: 8 }}>Road damage detected</p>\n"
    "            {aiResult.damageType && aiResult.damageType !== 'Unknown' && (\n"
    "              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,\n"
    "                background: meta.bg, color: meta.color, border: `1.5px solid ${meta.border}`,\n"
    "                borderRadius: 999, padding: '4px 14px', fontSize: '0.8125rem', fontWeight: 700 }}>\n"
    "                <span>{meta.icon}</span>\n"
    "                {aiResult.damageType}\n"
    "                {aiResult.source === 'keras_classifier' && (\n"
    "                  <span style={{ fontSize: '0.625rem', opacity: 0.75, marginLeft: 2 }}>\u00b7 AI</span>\n"
    "                )}\n"
    "              </div>\n"
    "            )}\n"
    "          </div>\n"
    "        </div>\n"
    "\n"
    "        {hasTop3 && (\n"
    "          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #dcfce7', padding: '0.875rem' }}>\n"
    "            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: 8 }}>\n"
    "              \U0001f916 AI Damage Type Analysis\n"
    "            </p>\n"
    "            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>\n"
    "              {top3.map((item, i) => {\n"
    "                const m = TYPE_META[item.label] || { icon: '\U0001f6e3\ufe0f', color: '#64748b' };\n"
    "                const pct = Math.round(item.confidence * 100);\n"
    "                return (\n"
    "                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n"
    "                    <span style={{ width: 20, textAlign: 'center' }}>{m.icon}</span>\n"
    "                    <span style={{ fontSize: '0.8125rem', fontWeight: i === 0 ? 700 : 500,\n"
    "                      color: i === 0 ? '#0f172a' : '#64748b', flex: 1 }}>\n"
    "                      {item.label}\n"
    "                    </span>\n"
    "                    <div style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>\n"
    "                      <div style={{ width: `${pct}%`, height: '100%', background: m.color,\n"
    "                        borderRadius: 999, transition: 'width 0.6s ease' }} />\n"
    "                    </div>\n"
    "                    <span style={{ fontSize: '0.75rem', color: '#64748b', width: 34, textAlign: 'right' }}>{pct}%</span>\n"
    "                  </div>\n"
    "                );\n"
    "              })}\n"
    "            </div>\n"
    "          </div>\n"
    "        )}\n"
    "        {!hasTop3 && (\n"
    "          <p style={{ fontSize: '0.8125rem', color: '#166534', lineHeight: 1.6, margin: 0 }}>\n"
    "            The image shows road damage. Proceed to the next step.\n"
    "          </p>\n"
    "        )}\n"
    "      </div>\n"
    "    );\n"
    "  }"
)

src = src[:vs] + new_verified + src[ve:]
print(f"3. Verified section replaced. Final len: {len(src)}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print("Done!")
