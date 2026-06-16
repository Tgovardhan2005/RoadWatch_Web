# patch_ai_card.py — upgrades the AiResultCard verified section in ReportForm.jsx
# Shows damage type with classifier top-3 breakdown
import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r'e:\Projects - 2k25\RW v2\frontend\src\components\Citizen\ReportForm.jsx'
with open(path, encoding='utf-8') as f:
    src = f.read()
src = src.replace('\r\n', '\n')

OLD = """  // \u2500\u2500 3. Verified: damage found \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (category === 'verified') {
    const typeColors = {
      Pothole:               ['#dc2626', '#fef2f2', '#fecaca'],
      Crack:                 ['#ea580c', '#fff7ed', '#fed7aa'],
      'Surface Damage':      ['#d97706', '#fffbeb', '#fde68a'],
      Waterlogging:          ['#0891b2', '#ecfeff', '#a5f3fc'],
      'Construction Damage': ['#7c3aed', '#faf5ff', '#e9d5ff'],
    };
    const [tc, tbg, tbd] = typeColors[aiResult.damageType] || ['#2563eb', '#eff6ff', '#bfdbfe'];

    return (
      <div style={{ borderRadius: 14, border: '2px solid #bbf7d0', background: '#f0fdf4', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>✅</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
              <p style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9375rem', margin: 0 }}>Road damage detected</p>
              {aiResult.damageType && aiResult.damageType !== 'Unknown' && (
                <span style={{ background: tbg, color: tc, border: `1px solid ${tbd}`, borderRadius: 999, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {aiResult.damageType}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#166534', lineHeight: 1.6, margin: 0 }}>
              The image appears to show road damage. Proceed to the next step.
            </p>
          </div>
        </div>
      </div>
    );
  }"""

NEW = """  // \u2500\u2500 3. Verified: damage found \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (category === 'verified') {
    const TYPE_META = {
      'Pothole':             { icon: '🕳️',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
      'Crack':               { icon: '💥',  color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
      'Surface Damage':      { icon: '🪨',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
      'Waterlogging':        { icon: '💧',  color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
      'Construction Damage': { icon: '🚧',  color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
      'No Damage':           { icon: '✅',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    };
    const meta = TYPE_META[aiResult.damageType] || { icon: '🛣️', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
    const top3 = aiResult.top3 || [];
    const hasTop3 = top3.length > 1;

    return (
      <div style={{ borderRadius: 14, border: '2px solid #bbf7d0', background: '#f0fdf4', padding: '1.25rem', marginBottom: '1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: hasTop3 ? '1rem' : 0 }}>
          <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>✅</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9375rem', marginBottom: 6 }}>Road damage detected</p>

            {/* Primary damage type badge */}
            {aiResult.damageType && aiResult.damageType !== 'Unknown' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                background: meta.bg, color: meta.color, border: `1.5px solid ${meta.border}`,
                borderRadius: 999, padding: '4px 14px', fontSize: '0.8125rem', fontWeight: 700 }}>
                <span>{meta.icon}</span>
                {aiResult.damageType}
                {aiResult.source === 'keras_classifier' && (
                  <span style={{ fontSize: '0.625rem', opacity: 0.8, marginLeft: 2 }}>· AI</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top-3 breakdown from classifier */}
        {hasTop3 && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #dcfce7', padding: '0.875rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: 8 }}>
              🤖 AI Damage Analysis
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {top3.map((item, i) => {
                const m = TYPE_META[item.label] || { icon: '🛣️', color: '#64748b', bg: '#f8fafc' };
                const pct = Math.round(item.confidence * 100);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.875rem', width: 20, textAlign: 'center' }}>{m.icon}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#0f172a' : '#475569', flex: 1 }}>
                      {item.label}
                    </span>
                    {/* Progress bar */}
                    <div style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: m.color, borderRadius: 999, transition: 'width 0.5s ease' }} />
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

if OLD in src:
    result = src.replace(OLD, NEW, 1)
    print('Block replaced successfully')
else:
    print('ERROR: block not found')
    # Debug: look for start
    idx = src.find("// \u2500\u2500 3. Verified")
    print('Verified section at:', idx)
    if idx != -1:
        print(repr(src[idx:idx+200]))
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(result)
print(f'Saved {len(result)} bytes.')
