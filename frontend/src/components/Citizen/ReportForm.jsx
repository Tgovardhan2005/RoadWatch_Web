import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../auth';
import API_BASE_URL from '../../config';
import { analyzeImage, getModelStatus } from '../../utils/roadDamageModel';

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const SEV_CONFIG = {
  Low:      { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '🟢', label: 'Minor — No immediate danger' },
  Medium:   { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '🟡', label: 'Moderate — Needs repair soon' },
  High:     { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '🟠', label: 'Serious — Hazardous to vehicles' },
  Critical: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '🔴', label: 'Urgent — Dangerous, report ASAP' },
};
const DAMAGE_TYPES = ['Pothole', 'Crack', 'Surface Damage', 'Waterlogging', 'Construction Damage', 'Other'];

// AI result categorization
function getAiCategory(aiResult) {
  if (!aiResult) return 'none';
  if (aiResult.damageType === 'Invalid Image') return 'invalid';
  if (!aiResult.valid || aiResult.damageType === 'No Damage') return 'no_damage';
  return 'verified'; // damage detected
}

// AI Result Card component
function AiResultCard({ aiResult, onOverride, overrideConfirmed }) {
  const category = getAiCategory(aiResult);

  // ── 1. Hard block: not a road image ────────────────────────────────────────
  if (category === 'invalid') {
    return (
      <div style={{ borderRadius: 14, border: '2px solid #fecaca', background: '#fef2f2', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>🚫</div>
          <div>
            <p style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.9375rem', marginBottom: 6 }}>
              This doesn't look like a road photo
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#991b1b', lineHeight: 1.6, margin: 0 }}>
              Please upload a clear photo of the damaged road surface to continue.
            </p>
          </div>
        </div>
        <div style={{ marginTop: '1rem', padding: '0.875rem', background: '#fff', borderRadius: 10, border: '1px solid #fecaca' }}>
          <p style={{ fontSize: '0.8125rem', color: '#7f1d1d', fontWeight: 700, marginBottom: 8 }}>📸 Tips for a valid photo:</p>
          <ul style={{ fontSize: '0.8125rem', color: '#991b1b', paddingLeft: '1.25rem', margin: 0, lineHeight: 2 }}>
            <li>Point camera directly at the damaged road surface</li>
            <li>Ensure good lighting — avoid dark or overexposed shots</li>
            <li>Fill the frame with the damaged area (pothole, crack, etc.)</li>
            <li>Avoid photos of walls, vehicles, or non-road surfaces</li>
          </ul>
        </div>
      </div>
    );
  }

  // ── 2. Soft gate: no damage detected ───────────────────────────────────────
  if (category === 'no_damage') {
    return (
      <div style={{ borderRadius: 14, border: '2px solid #fde68a', background: '#fffbeb', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>⚠️</div>
          <div>
            <p style={{ fontWeight: 800, color: '#92400e', fontSize: '0.9375rem', marginBottom: 6 }}>
              No road damage detected
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.6, margin: 0 }}>
              The photo doesn't clearly show road damage. Make sure you're photographing the damaged area directly.
            </p>
          </div>
        </div>

        {!overrideConfirmed ? (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #fde68a', padding: '0.875rem' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
              Are you sure this is road damage?
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#78350f', marginBottom: 12, lineHeight: 1.6 }}>
              False reports may lead to account restrictions. If you're certain this is a real issue, you can proceed anyway.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="ai-override-confirm-btn"
                onClick={onOverride}
                style={{ flex: 1, padding: '9px', borderRadius: 8, background: '#d97706', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}
              >
                Yes, proceed anyway
              </button>
              <div style={{ flex: 1, padding: '9px', borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb', fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.4 }}>
                Or remove &amp; re-upload a clearer photo
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #fde68a', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✅</span>
            <p style={{ fontSize: '0.8125rem', color: '#78350f', fontWeight: 600, margin: 0 }}>
              Confirmed — please describe the damage clearly in the next step.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── 3. Verified: damage found ────────────────────────────────────────────────
  if (category === 'verified') {
    const TYPE_META = {
      'Pothole':             { icon: '🕳️', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
      'Crack':               { icon: '💥', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
      'Surface Damage':      { icon: '🪊', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
      'Waterlogging':        { icon: '💧', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
      'Construction Damage': { icon: '🚧', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
      'No Damage':           { icon: '✅',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    };
    const meta = TYPE_META[aiResult.damageType] || { icon: '🛣️', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
    const top3 = aiResult.top3 || [];
    const hasTop3 = top3.length > 1;

    return (
      <div style={{ borderRadius: 14, border: '2px solid #bbf7d0', background: '#f0fdf4', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: hasTop3 ? '1rem' : 0 }}>
          <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>✅</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9375rem', marginBottom: 8 }}>Road damage detected</p>
            {aiResult.damageType && aiResult.damageType !== 'Unknown' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                background: meta.bg, color: meta.color, border: `1.5px solid ${meta.border}`,
                borderRadius: 999, padding: '4px 14px', fontSize: '0.8125rem', fontWeight: 700 }}>
                <span>{meta.icon}</span>
                {aiResult.damageType}
                {aiResult.source === 'keras_classifier' && (
                  <span style={{ fontSize: '0.625rem', opacity: 0.75, marginLeft: 2 }}>· AI</span>
                )}
              </div>
            )}
          </div>
        </div>

        {hasTop3 && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #dcfce7', padding: '0.875rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: 8 }}>
              🤖 AI Damage Type Analysis
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {top3.map((item, i) => {
                const m = TYPE_META[item.label] || { icon: '🛣️', color: '#64748b' };
                const pct = Math.round(item.confidence * 100);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, textAlign: 'center' }}>{m.icon}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: i === 0 ? 700 : 500,
                      color: i === 0 ? '#0f172a' : '#64748b', flex: 1 }}>
                      {item.label}
                    </span>
                    <div style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: m.color,
                        borderRadius: 999, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', width: 34, textAlign: 'right' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!hasTop3 && (
          <p style={{ fontSize: '0.8125rem', color: '#166534', lineHeight: 1.6, margin: 0 }}>
            The image shows road damage. Proceed to the next step.
          </p>
        )}
      </div>
    );
  }
  return null;
}

export default function ReportForm({ auth }) {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [step, setStep] = useState(1);

  // Step 1 — Image + AI
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOverride, setAiOverride] = useState(false); // user manually confirmed despite AI rejection

  // Step 2 — Location
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [district, setDistrict] = useState('');

  // Step 3 — Details
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [damageType, setDamageType] = useState('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  // Model server status
  const [modelStatus, setModelStatus] = useState('checking'); // 'checking' | 'online' | 'offline'

  useEffect(() => {
    getModelStatus().then(s => setModelStatus(s.online ? 'online' : 'offline'));
  }, []);

  const resetImage = () => {
    setImage(null); setImagePreview(null);
    setAiResult(null); setAiOverride(false);
  };

  const handleImageFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image too large. Max 5MB allowed.'); return; }
    setError('');
    resetImage();

    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target.result;
      setImagePreview(b64);
      setImage(b64);
      setAiLoading(true);
      try {
                // AI Analysis: road filter + damage type classifier (single /analyze call)
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
      } catch (err) {
        console.warn('[AI] Analysis error:', err.message);
        // Non-fatal — allow upload without AI
      } finally {
        setAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Determine if user can proceed from Step 1
  const aiCategory = getAiCategory(aiResult);
  const canProceedFromStep1 = imagePreview && !aiLoading && (
    aiCategory === 'verified' ||       // AI confirmed damage
    aiCategory === 'none' ||           // AI hasn't run yet (no network)
    (aiCategory === 'no_damage' && aiOverride) // User overrode "no damage"
    // 'invalid' = BLOCKED — must re-upload
  );

  const getGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported on this device.'); return; }
    setGpsLoading(true); setGpsError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ latitude, longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          if (data.display_name) setAddress(data.display_name);
          const addr = data.address || {};
          setDistrict((addr.county || addr.state_district || addr.district || '').replace(/ district$/i, ''));
        } catch { /* silent */ } finally { setGpsLoading(false); }
      },
      (err) => { setGpsError(err.message || 'Could not get location. Enable GPS and try again.'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSubmit = async () => {
    if (!description.trim()) { setError('Please add a description.'); return; }
    if (!location) { setError('Please capture your GPS location.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await authFetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        body: JSON.stringify({
          description,
          imageUrl: image || '',
          location, severity, address,
          damageType: damageType || aiResult?.damageType || 'Unknown',
          aiConfidence: aiResult?.confidence || 0,
          aiVerified: aiResult?.valid || false,
          aiOverride,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      setSuccess({ reportId: data.report?._id || data.parentReportId, merged: data.merged || false, confirmationCount: data.confirmationCount || 0, distanceMeters: data.distanceMeters || null });
    } catch (err) {
      setError(err.message);
    } finally { setSubmitting(false); }
  };

  // ── Success State ────────────────────────────────────────────────────────
  if (success) {
    const isMerged = success.merged;
    const resetForm = () => {
      setSuccess(null); setStep(1); resetImage();
      setLocation(null); setDescription(''); setSeverity('Medium');
    };

    if (isMerged) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', paddingTop: '5rem', background: 'var(--bg-base)' }}>
          <div className="card animate-scale" style={{ padding: '3rem 2rem', maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '3px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.25rem', boxShadow: '0 8px 24px rgba(37,99,235,0.12)' }}>
              🔗
            </div>
            <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Report Merged!</h2>
            <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              An existing report already exists nearby. Your details have been added as a confirmation to that report.
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: '1.75rem', justifyContent: 'center' }}>
              <div style={{ flex: 1, background: '#eff6ff', borderRadius: 12, padding: '0.875rem', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>{success.confirmationCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, marginTop: 2 }}>Total confirmations</div>
              </div>
              {success.distanceMeters !== null && (
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 12, padding: '0.875rem', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>{success.distanceMeters}m</div>
                  <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, marginTop: 2 }}>From original report</div>
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: '0.875rem', marginBottom: '1.75rem', textAlign: 'left' }}>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                Multiple confirmations signal to the district admin that this is a high-priority issue. The admin will be notified immediately.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/dashboard')} className="btn btn-primary">📊 View Dashboard</button>
              <button onClick={resetForm} className="btn btn-secondary">+ Report Another</button>
            </div>
          </div>
        </div>
      );
    }

    // Newly created report
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', paddingTop: '5rem', background: 'var(--bg-base)' }}>
        <div className="card animate-scale" style={{ padding: '3rem 2rem', maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '3px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.25rem', boxShadow: '0 8px 24px rgba(22,163,74,0.15)' }}>
            ✅
          </div>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Report Submitted!</h2>
          <p style={{ color: '#64748b', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Your road damage report has been received and will be reviewed by the district authority shortly.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary">📊 Go to Dashboard</button>
            <button onClick={resetForm} className="btn btn-secondary">+ Report Another</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', paddingTop: '5rem', background: 'var(--bg-base)', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="font-display section-title" style={{ marginBottom: 4 }}>Report Road Damage</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            AI verifies your image before submission — 3 simple steps
          </p>
        </div>

        {/* Step Indicator */}
        <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.25rem' }}>
          <div className="step-indicator">
            {[
              { label: 'Photo', icon: '📸' },
              { label: 'Location', icon: '📍' },
              { label: 'Details', icon: '📝' },
            ].map(({ label, icon }, i) => {
              const stepNum = i + 1;
              const done = step > stepNum;
              const active = step === stepNum;
              return (
                <React.Fragment key={i}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div className={`step-dot${done ? ' done' : active ? ' active' : ''}`}>
                      {done ? '✓' : icon}
                    </div>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: done || active ? '#2563eb' : '#94a3b8', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                  {i < 2 && <div className={`step-line${done ? ' done' : ''}`} style={{ marginBottom: 16 }} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── STEP 1: Photo + AI ── */}
        {step === 1 && (
          <div className="card animate-up" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>📸 Upload Road Photo</h2>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '4px 0 0' }}>Our AI will verify the image before you proceed</p>
            </div>

            {/* Image Preview */}
            {imagePreview ? (
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    width: '100%', borderRadius: 14, maxHeight: 260, objectFit: 'cover',
                    border: `2px solid ${aiCategory === 'verified' ? '#bbf7d0' : aiCategory === 'invalid' ? '#fecaca' : '#e2e8f0'}`,
                    filter: aiLoading ? 'brightness(0.7)' : 'none',
                    transition: 'all 0.3s',
                  }}
                />
                {aiLoading && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(15,23,42,0.45)', borderRadius: 14 }}>
                    <div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)', width: 36, height: 36 }} />
                    <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}>Analyzing image…</p>
                  </div>
                )}
                {!aiLoading && (
                  <button
                    onClick={resetImage}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`upload-zone${dragging ? ' dragging' : ''}`}
                style={{ padding: '2.5rem 1rem', textAlign: 'center', marginBottom: '1rem', cursor: 'pointer' }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleImageFile(e.dataTransfer.files[0]); }}
              >
                <div style={{ fontSize: '2.75rem', marginBottom: 12 }}>📷</div>
                <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Drag & drop or click to upload</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>JPEG, PNG, WebP · Max 5MB</p>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { handleImageFile(e.target.files[0]); e.target.value = ''; }} />

            {!imagePreview && (
              <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>📁 Browse Files</button>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { fileRef.current?.setAttribute('capture','environment'); fileRef.current?.click(); }}>📷 Use Camera</button>
              </div>
            )}

            {/* AI Result Card */}
            {!aiLoading && aiResult && (
              <AiResultCard
                aiResult={aiResult}
                onOverride={() => setAiOverride(true)}
                overrideConfirmed={aiOverride}
              />
            )}

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            {/* Next button — gated by AI */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                id="step1-next-btn"
                className="btn btn-primary"
                onClick={() => { setError(''); setStep(2); }}
                disabled={!canProceedFromStep1}
                title={!imagePreview ? 'Upload an image first' : aiCategory === 'invalid' ? 'Replace with a valid road photo' : aiLoading ? 'Please wait for AI analysis' : ''}
              >
                {aiLoading ? (
                  <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Scanning…</>
                ) : aiCategory === 'invalid' ? '🚫 Replace Image First' : 'Next: Location →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Location ── */}
        {step === 2 && (
          <div className="card animate-up" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>📍 Capture Location</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem' }}>GPS routes your report to the correct district authority</p>

            {location ? (
              <div className="alert alert-success" style={{ marginBottom: '1rem', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📍</span> Location Captured!
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ fontSize: '0.8125rem', margin: 0, color: '#15803d' }}>🌐 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                  {district && <p style={{ fontSize: '0.8125rem', margin: 0, color: '#15803d' }}>📌 District: <strong>{district}</strong></p>}
                  {address && <p style={{ fontSize: '0.8125rem', margin: 0, color: '#15803d' }} className="line-clamp-2">🏠 {address}</p>}
                </div>
                <button className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }} onClick={() => setLocation(null)}>📍 Re-capture</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#f8fafc', borderRadius: 14, border: '2px dashed #e2e8f0', marginBottom: '1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
                <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>GPS Location Required</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  Stand at the damage site and tap the button below to auto-detect your precise location.
                </p>
                <button id="capture-gps-btn" className="btn btn-primary" onClick={getGPS} disabled={gpsLoading}>
                  {gpsLoading
                    ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Detecting…</>
                    : '📍 Capture My Location'}
                </button>
              </div>
            )}

            {gpsError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {gpsError}</div>}

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="input-label">Address / Landmark (optional)</label>
              <textarea className="input-field" placeholder="e.g., Near City Bus Stop, Anna Nagar Main Road" value={address} onChange={e => setAddress(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!location}>Next: Details →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Details ── */}
        {step === 3 && (
          <div className="card animate-up" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>📝 Report Details</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem' }}>Describe the damage and set its severity</p>

            {/* AI summary chip on step 3 */}
            {aiResult?.valid && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999, padding: '4px 12px', marginBottom: '1rem', fontSize: '0.8125rem', fontWeight: 700, color: '#15803d' }}>
                🤖 AI Detected: {aiResult.damageType} ({Math.round(aiResult.confidence * 100)}% confidence)
              </div>
            )}
            {aiOverride && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 999, padding: '4px 12px', marginBottom: '1rem', fontSize: '0.8125rem', fontWeight: 700, color: '#92400e' }}>
                ⚠️ Submitted with AI override — please describe damage clearly
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="input-label">Description *</label>
              <textarea
                id="report-description"
                className="input-field"
                placeholder="Describe the road damage in detail — size, depth, location landmarks, hazards…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                required
                style={{ resize: 'vertical' }}
              />
              <p style={{ fontSize: '0.6875rem', color: description.length < 20 ? '#d97706' : '#94a3b8', marginTop: 4 }}>
                {description.length} characters {description.length < 20 && description.length > 0 ? '— add more detail' : ''}
              </p>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="input-label">Severity Level *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {SEVERITIES.map(sev => {
                  const cfg = SEV_CONFIG[sev];
                  const selected = severity === sev;
                  return (
                    <button
                      key={sev}
                      id={`severity-${sev.toLowerCase()}`}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      style={{
                        padding: '0.75rem', borderRadius: 12,
                        border: `2px solid ${selected ? cfg.color : '#e2e8f0'}`,
                        background: selected ? cfg.bg : '#fafafa',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s',
                        boxShadow: selected ? `0 0 0 3px ${cfg.color}18` : 'none',
                      }}
                    >
                      <div style={{ fontSize: '1.25rem', marginBottom: 4 }}>{cfg.icon}</div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: selected ? cfg.color : '#0f172a', margin: 0 }}>{sev}</p>
                      <p style={{ fontSize: '0.6875rem', color: selected ? cfg.color : '#94a3b8', margin: '2px 0 0' }}>{cfg.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="input-label">Damage Type {aiResult?.valid ? '(AI Pre-selected)' : ''}</label>
              <select className="input-field" value={damageType} onChange={e => setDamageType(e.target.value)}>
                <option value="">Select type…</option>
                {DAMAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button
                id="submit-report-btn"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !description.trim() || description.length < 10}
              >
                {submitting
                  ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Submitting…</>
                  : '🚀 Submit Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
