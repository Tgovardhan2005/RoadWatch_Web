# patch_success.py — Replaces the success screen in ReportForm.jsx with merged+new variants
import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r'e:\Projects - 2k25\RW v2\frontend\src\components\Citizen\ReportForm.jsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# Find the block boundaries
MARKER_START = '  // \u2500\u2500 Success State'
MARKER_END   = '\n\n  // \u2500\u2500 Form'

start = src.find(MARKER_START)
end   = src.find(MARKER_END, start)

if start == -1 or end == -1:
    print(f'ERROR: markers not found (start={start}, end={end})')
    sys.exit(1)

print(f'Replacing chars {start}..{end}')

new_block = r"""  // ── Success State ────────────────────────────────────────────────────────
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
  }"""

result = src[:start] + new_block + src[end:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(result)
print(f'Done. File size: {len(result)} bytes')
