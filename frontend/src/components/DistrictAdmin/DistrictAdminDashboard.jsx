import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../auth';
import API_BASE_URL from '../../config';
import { getStatusClass, getSeverityClass, timeAgo, formatDate, getAvatarGradient, getInitials } from '../../utils/statusUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const VALID_STATUSES = ['Under Review', 'Assigned', 'Repair In Progress', 'Resolved', 'Closed', 'Rejected'];

function StatusUpdateModal({ report, onClose, onUpdate }) {
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!status) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/reports/${report._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        onClose();
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Update Report Status</h3>
          <button onClick={onClose} className="icon-btn"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }} className="line-clamp-2">{report.description}</p>
        <div style={{ marginBottom: '1rem' }}>
          <label className="input-label">New Status</label>
          <select className="input-field" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Select status…</option>
            {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="input-label">Note (optional)</label>
          <textarea className="input-field" rows={3} placeholder="Add context for this update…" value={note} onChange={e => setNote(e.target.value)} style={{ resize: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!status || loading}>{loading ? 'Updating…' : 'Update Status'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Confirmation Details Panel (shown inline when row is expanded) ────────────
function ConfirmationsPanel({ report }) {
  const confirmations = report.confirmations || [];
  if (confirmations.length === 0) return null;
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', marginTop: 8 }}>
      <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', marginBottom: 8 }}>
        🔗 {confirmations.length} Confirmation{confirmations.length > 1 ? 's' : ''} from other users
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {confirmations.map((c, i) => (
          <div key={c._id || i} style={{ background: '#fff', borderRadius: 8, padding: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
            {/* Avatar */}
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: getAvatarGradient(c.userName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {getInitials(c.userName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a' }}>{c.userName}</span>
                {c.severity && (
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, background: c.severity === 'Critical' ? '#fef2f2' : c.severity === 'High' ? '#fff7ed' : '#fffbeb', color: c.severity === 'Critical' ? '#dc2626' : c.severity === 'High' ? '#ea580c' : '#d97706', border: `1px solid ${c.severity === 'Critical' ? '#fecaca' : '#fed7aa'}`, padding: '1px 6px', borderRadius: 999 }}>
                    {c.severity}
                  </span>
                )}
                <span style={{ fontSize: '0.6875rem', color: '#94a3b8', marginLeft: 'auto' }}>{timeAgo(c.submittedAt)}</span>
              </div>
              {c.description && (
                <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 4px', lineHeight: 1.5 }} className="line-clamp-2">{c.description}</p>
              )}
              {c.imageUrl && (
                <img src={c.imageUrl} alt="Confirmation photo" style={{ maxWidth: 120, borderRadius: 6, marginTop: 4, border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => window.open(c.imageUrl, '_blank')} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#64748b'];

export default function DistrictAdminDashboard({ auth }) {
  const [tab, setTab] = useState('overview');
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'All', severity: 'All', search: '', mergedOnly: false });
  const [updateModal, setUpdateModal] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null); // report _id of expanded confirmations
  const [districtInfo, setDistrictInfo] = useState(null);

  const districtId = auth?.district?._id || auth?.district;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, statRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/reports?limit=200&sort=-confirmationCount,-createdAt`),
        districtId ? authFetch(`${API_BASE_URL}/api/districts/${districtId}/stats`) : null,
      ]);
      if (repRes.ok) { const d = await repRes.json(); setReports(d.reports || []); }
      if (statRes?.ok) { setStats(await statRes.json()); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [districtId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = reports.filter(r => {
    if (filters.status !== 'All' && r.status !== filters.status) return false;
    if (filters.severity !== 'All' && r.severity !== filters.severity) return false;
    if (filters.mergedOnly && (!r.confirmationCount || r.confirmationCount === 0)) return false;
    if (filters.search && !r.description?.toLowerCase().includes(filters.search.toLowerCase()) && !r.district?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const handleUpdate = (updated) => {
    setReports(prev => prev.map(r => r._id === updated._id ? updated : r));
    if (districtId) authFetch(`${API_BASE_URL}/api/districts/${districtId}/stats`).then(r => r.json()).then(setStats);
  };

  const total = stats?.total || 0;
  const resolved = stats?.resolved || 0;
  const pending = stats?.pending || 0;
  const critical = stats?.critical || 0;
  const rate = stats?.resolutionRate || 0;

  const bySeverityData = (stats?.bySeverity || []).map(s => ({ name: s._id, value: s.count }));
  const byStatusData = (stats?.byStatus || []).map(s => ({ name: s._id, value: s.count }));

  // Count merged reports for badge
  const mergedCount = reports.filter(r => r.confirmationCount > 0).length;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'reports', label: `Reports (${reports.length})`, icon: '📋' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ];

  return (
    <div className="page-container" style={{ paddingTop: '5rem' }}>

      {/* Header */}
      <div className="card animate-up" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}>District Administration Panel</p>
          <h1 className="font-display" style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {auth?.district?.name || 'Your District'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {mergedCount > 0 && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 5 }}>
              🔗 {mergedCount} Merged Report{mergedCount > 1 ? 's' : ''}
            </div>
          )}
          {critical > 0 && (
            <div className="badge sev-critical" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              🚨 {critical} Critical
            </div>
          )}
          <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 999, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700 }}>
            {rate}% Resolution Rate
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="animate-up">
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Total Reports', value: total, icon: '📋', color: '#2563eb', bg: '#eff6ff' },
              { label: 'Active / Pending', value: pending, icon: '⏳', color: '#d97706', bg: '#fffbeb' },
              { label: 'Resolved', value: resolved, icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Critical', value: critical, icon: '🚨', color: '#dc2626', bg: '#fef2f2' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', border: `1px solid ${s.color}25`, flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <p className="font-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Resolution bar + Recent */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', marginBottom: '1rem' }}>Resolution Rate</h3>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <span className="font-display" style={{ fontSize: '3rem', fontWeight: 900, color: '#0f172a' }}>{rate}%</span>
              </div>
              <div className="stat-bar" style={{ marginBottom: 8 }}>
                <div className="stat-bar-fill" style={{ width: `${rate}%`, background: `linear-gradient(90deg,${rate > 70 ? '#16a34a' : rate > 40 ? '#d97706' : '#dc2626'},${rate > 70 ? '#059669' : rate > 40 ? '#92400e' : '#991b1b'})` }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>{resolved} of {total} reports resolved</p>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', marginBottom: '1rem' }}>Recent Reports</h3>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />)}
                </div>
              ) : (stats?.recent || []).slice(0, 5).map(r => (
                <div key={r._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.severity === 'Critical' ? '#dc2626' : r.severity === 'High' ? '#ea580c' : r.severity === 'Medium' ? '#d97706' : '#16a34a', marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a', marginBottom: 2 }} className="line-clamp-1">{r.description}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={getStatusClass(r.status)} style={{ fontSize: '0.5625rem' }}>{r.status}</span>
                      {r.confirmationCount > 0 && (
                        <span style={{ fontSize: '0.5625rem', fontWeight: 700, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 999, padding: '1px 5px' }}>
                          🔗 ×{r.confirmationCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8', flexShrink: 0 }}>{timeAgo(r.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div className="animate-up">
          {/* Filters */}
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" className="input-field" placeholder="Search reports…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} style={{ fontSize: '0.8125rem' }} />
            </div>
            <select className="input-field" style={{ width: 140 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              {['All', 'Reported', 'Under Review', 'Assigned', 'Repair In Progress', 'Resolved', 'Closed', 'Rejected'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="input-field" style={{ width: 120 }} value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}>
              {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
            </select>
            {/* Merged-only filter */}
            <button
              onClick={() => setFilters(f => ({ ...f, mergedOnly: !f.mergedOnly }))}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                background: filters.mergedOnly ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${filters.mergedOnly ? '#bfdbfe' : '#e2e8f0'}`,
                color: filters.mergedOnly ? '#2563eb' : '#64748b',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              🔗 Merged only {filters.mergedOnly ? '✓' : ''}
            </button>
          </div>

          {/* Reports Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="rw-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Confirmations</th>
                    <th>Status</th>
                    <th>Severity</th>
                    <th>Citizen</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No reports match your filters</td></tr>
                  ) : filtered.map(r => {
                    const hasConfirmations = r.confirmationCount > 0;
                    const isExpanded = expandedRow === r._id;
                    return (
                      <React.Fragment key={r._id}>
                        <tr style={{ background: hasConfirmations ? '#f8fbff' : undefined }}>
                          <td>
                            <div style={{ maxWidth: 260 }}>
                              <p style={{ fontWeight: 500, color: '#0f172a', fontSize: '0.875rem', marginBottom: 2 }} className="line-clamp-2">{r.description}</p>
                              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>📍 {r.district}{r.aiVerified ? ' · 🤖 AI Verified' : ''}</p>
                            </div>
                          </td>
                          <td>
                            {hasConfirmations ? (
                              <button
                                onClick={() => setExpandedRow(isExpanded ? null : r._id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', color: '#2563eb' }}
                                title="Click to view confirmations"
                              >
                                🔗 {r.confirmationCount} user{r.confirmationCount > 1 ? 's' : ''}
                                <span style={{ fontSize: '0.5rem', marginLeft: 2 }}>{isExpanded ? '▲' : '▼'}</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td><span className={getStatusClass(r.status)} style={{ fontSize: '0.625rem' }}>{r.status}</span></td>
                          <td><span className={getSeverityClass(r.severity)} style={{ fontSize: '0.625rem' }}>{r.severity}</span></td>
                          <td style={{ fontSize: '0.8125rem', color: '#475569' }}>{r.userName || '—'}</td>
                          <td style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setUpdateModal(r)}
                              id={`update-status-${r._id}`}
                            >
                              Update
                            </button>
                          </td>
                        </tr>
                        {/* Inline confirmation details */}
                        {isExpanded && hasConfirmations && (
                          <tr style={{ background: '#f8fbff' }}>
                            <td colSpan={7} style={{ padding: '0 1rem 1rem' }}>
                              <ConfirmationsPanel report={r} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="animate-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '1rem', color: '#0f172a' }}>Reports by Severity</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={bySeverityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {bySeverityData.map((_, i) => <Cell key={i} fill={['#dc2626','#ea580c','#d97706','#16a34a'][i % 4]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '1rem', color: '#0f172a' }}>Reports by Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byStatusData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[4,4,0,0]}>
                  {byStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {updateModal && (
        <StatusUpdateModal report={updateModal} onClose={() => setUpdateModal(null)} onUpdate={handleUpdate} />
      )}
    </div>
  );
}
