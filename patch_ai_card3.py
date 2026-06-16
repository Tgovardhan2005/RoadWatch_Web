# patch_ai_card3.py
import sys, codecs
sys.stdout.reconfigure(encoding='utf-8')

path = r'e:\Projects - 2k25\RW v2\frontend\src\components\Citizen\ReportForm.jsx'
with open(path, encoding='utf-8') as f:
    src = f.read()
src = src.replace('\r\n', '\n')

# Find block
start_idx = src.rfind("if (category === 'verified') {")
start_idx = src.rfind('  //', 0, start_idx)
END_MARKER = "\n  return null;\n}"
end_idx = src.find(END_MARKER, start_idx)
print(f"Block: {start_idx}->{end_idx}, length={end_idx-start_idx}")

NEW = (
"""  // \u2500\u2500 3. Verified: damage found \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (category === 'verified') {
    const TYPE_META = {
      'Pothole':             { icon: '\U0001f573\ufe0f', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
      'Crack':               { icon: '\U0001f4a5', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
      'Surface Damage':      { icon: '\U0001fa8a', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
      'Waterlogging':        { icon: '\U0001f4a7', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
      'Construction Damage': { icon: '\U0001f6a7', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
      'No Damage':           { icon: '\u2705',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    };
    const meta = TYPE_META[aiResult.damageType] || { icon: '\U0001f6e3\ufe0f', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
    const top3 = aiResult.top3 || [];
    const hasTop3 = top3.length > 1;

    return (
      <div style={{ borderRadius: 14, border: '2px solid #bbf7d0', background: '#f0fdf4', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: hasTop3 ? '1rem' : 0 }}>
          <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>\u2705</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9375rem', marginBottom: 8 }}>Road damage detected</p>
            {aiResult.damageType && aiResult.damageType !== 'Unknown' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                background: meta.bg, color: meta.color, border: `1.5px solid ${meta.border}`,
                borderRadius: 999, padding: '4px 14px', fontSize: '0.8125rem', fontWeight: 700 }}>
                <span>{meta.icon}</span>
                {aiResult.damageType}
                {aiResult.source === 'keras_classifier' && (
                  <span style={{ fontSize: '0.625rem', opacity: 0.75, marginLeft: 2 }}>\u00b7 AI</span>
                )}
              </div>
            )}
          </div>
        </div>

        {hasTop3 && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #dcfce7', padding: '0.875rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: 8 }}>
              \U0001f916 AI Damage Type Analysis
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {top3.map((item, i) => {
                const m = TYPE_META[item.label] || { icon: '\U0001f6e3\ufe0f', color: '#64748b' };
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
  }"""
)

result = src[:start_idx] + NEW + src[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(result)
print(f'Done. Saved {len(result)} bytes.')
