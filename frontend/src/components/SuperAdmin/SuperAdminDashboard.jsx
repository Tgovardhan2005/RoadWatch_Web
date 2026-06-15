import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../auth';
import API_BASE_URL from '../../config';
import { getStatusClass, getSeverityClass, timeAgo, formatDate } from '../../utils/statusUtils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#2563eb','#7c3aed','#dc2626','#16a34a','#d97706','#0891b2','#ea580c','#64748b'];

function AdminModal({ districts, admin, onClose, onSave }) {
  const [form, setForm] = useState({
    name: admin?.name || '',
    email: admin?.email || '',
    phone: admin?.phone || '',
    password: '',
    districtId: admin?.district?._id || admin?.district || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      const url = admin ? `${API_BASE_URL}/api/admin/district-admins/${admin._id}` : `${API_BASE_URL}/api/admin/district-admins`;
      const method = admin ? 'PATCH' : 'POST';
      const body = { ...form };
      if (!body.password) delete body.password;
      const res = await authFetch(url, { method, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSave(data.admin || data);
      onClose();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{admin ? 'Edit' : 'Add'} District Admin</h3>
          <button onClick={onClose} className="icon-btn"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div><label className="input-label">Full Name *</label><input className="input-field" value={form.name} onChange={set('name')} placeholder="John Doe" /></div>
            <div><label className="input-label">Phone</label><input className="input-field" value={form.phone} onChange={set('phone')} placeholder="+91…" /></div>
          </div>
          <div><label className="input-label">Email *</label><input type="email" className="input-field" value={form.email} onChange={set('email')} placeholder="admin@tn.gov.in" /></div>
          <div><label className="input-label">Password {admin ? '(leave blank to keep)' : '*'}</label><input type="password" className="input-field" value={form.password} onChange={set('password')} placeholder="••••••••" /></div>
          <div>
            <label className="input-label">Assign District *</label>
            <select className="input-field" value={form.districtId} onChange={set('districtId')}>
              <option value="">Select district…</option>
              {districts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save Admin'}</button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard({ auth }) {
  const [tab, setTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'All', severity: 'All', search: '' });
  const [adminModal, setAdminModal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, dRes, admRes, repRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/api/admin/analytics`),
        authFetch(`${API_BASE_URL}/api/districts`),
        authFetch(`${API_BASE_URL}/api/admin/district-admins`),
        authFetch(`${API_BASE_URL}/api/admin/all-reports?limit=200&sort=-createdAt`),
      ]);
      if (aRes.ok) setAnalytics(await aRes.json());
      if (dRes.ok) setDistricts(await dRes.json());
      if (admRes.ok) setAdmins(await admRes.json());
      if (repRes.ok) { const d = await repRes.json(); setReports(d.reports || []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDeleteAdmin = async (id) => {
    if (!confirm('Delete this district admin?')) return;
    setDeletingId(id);
    try {
      await authFetch(`${API_BASE_URL}/api/admin/district-admins/${id}`, { method: 'DELETE' });
      setAdmins(prev => prev.filter(a => a._id !== id));
    } finally { setDeletingId(null); }
  };

  const handleSaveAdmin = (adminData) => {
    setAdmins(prev => {
      const idx = prev.findIndex(a => a._id === adminData._id);
      if (idx >= 0) { const n = [...prev]; n[idx] = adminData; return n; }
      return [...prev, adminData];
    });
  };

  const handleStatusUpdate = async (reportId, status) => {
    const res = await authFetch(`${API_BASE_URL}/api/reports/${reportId}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReports(prev => prev.map(r => r._id === reportId ? updated : r));
    }
  };

  const a = analytics || {};
  const monthlyData = (a.monthlyTrend || []).map(m => ({ name: MONTHS[(m._id.month - 1)], reports: m.count }));
  const distData = (a.topDistricts || []).slice(0, 10).map(d => ({ name: d._id, count: d.count }));
  const statusData = (a.byStatus || []).map(s => ({ name: s._id, value: s.count }));

  const filtered = reports.filter(r => {
    if (filters.status !== 'All' && r.status !== filters.status) return false;
    if (filters.severity !== 'All' && r.severity !== filters.severity) return false;
    if (filters.search && !r.description?.toLowerCase().includes(filters.search.toLowerCase()) && !r.district?.toLowerCase().includes(filters.search.toLowerCase()) && !r.userName?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const TABS = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'reports', label: `All Reports (${a.totalReports || 0})`, icon: '📋' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'districts', label: 'Districts', icon: '🗺️' },
    { id: 'admins', label: `Admins (${admins.length})`, icon: '👥' },
  ];

  return (
    <div className="page-container" style={{ paddingTop: '5rem' }}>
      {/* Header */}
      <div className="card animate-up" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', margin: 0 }}>State Administration · Tamil Nadu</p>
            <h1 className="font-display" style={{ fontSize: '1.375rem', fontWeight: 800, color: '#fff', margin: 0 }}>Super Admin Dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
              <p className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1 }}>{a.totalReports || 0}</p>
              <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Total Reports</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
              <p className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1 }}>{a.resolutionRate || 0}%</p>
              <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Resolution Rate</p>
            </div>
          </div>
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

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-up">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Total Reports', value: a.totalReports || 0, icon: '📋', color: '#2563eb', bg: '#eff6ff' },
              { label: 'Active', value: a.totalPending || 0, icon: '⏳', color: '#d97706', bg: '#fffbeb' },
              { label: 'Resolved', value: a.totalResolved || 0, icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Critical', value: a.totalCritical || 0, icon: '🚨', color: '#dc2626', bg: '#fef2f2' },
              { label: 'Districts', value: districts.length, icon: '🗺️', color: '#7c3aed', bg: '#faf5ff' },
              { label: 'Admins', value: admins.length, icon: '👥', color: '#0891b2', bg: '#ecfeff' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <p className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: '0.6875rem', color: '#64748b', margin: 0 }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts + Recent */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', marginBottom: '1rem' }}>Monthly Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="reports" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', marginBottom: '1rem' }}>Recent Reports</h3>
              {(a.recentReports || []).slice(0, 6).map(r => (
                <div key={r._id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.severity === 'Critical' ? '#dc2626' : r.severity === 'High' ? '#ea580c' : r.severity === 'Medium' ? '#d97706' : '#16a34a', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.8125rem', color: '#0f172a', margin: 0 }} className="line-clamp-1">{r.description}</p>
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>{r.district} · {timeAgo(r.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Reports Tab */}
      {tab === 'reports' && (
        <div className="animate-up">
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input className="input-field" placeholder="Search…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} style={{ fontSize: '0.8125rem' }} />
            </div>
            <select className="input-field" style={{ width: 140 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              {['All','Reported','Under Review','Assigned','Repair In Progress','Resolved','Closed','Rejected'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="input-field" style={{ width: 120 }} value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}>
              {['All','Critical','High','Medium','Low'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="rw-table">
                <thead><tr><th>Report</th><th>District</th><th>Status</th><th>Severity</th><th>Citizen</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading…</td></tr>
                  ) : filtered.slice(0, 100).map(r => (
                    <tr key={r._id}>
                      <td><p style={{ fontSize: '0.8125rem', fontWeight: 500, maxWidth: 260 }} className="line-clamp-2">{r.description}</p></td>
                      <td style={{ fontSize: '0.8125rem', color: '#475569' }}>{r.district || '—'}</td>
                      <td><span className={getStatusClass(r.status)} style={{ fontSize: '0.5625rem' }}>{r.status}</span></td>
                      <td><span className={getSeverityClass(r.severity)} style={{ fontSize: '0.5625rem' }}>{r.severity}</span></td>
                      <td style={{ fontSize: '0.8125rem', color: '#475569' }}>{r.userName || '—'}</td>
                      <td style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                      <td>
                        <select className="input-field" style={{ fontSize: '0.75rem', padding: '4px 8px', width: 130 }} defaultValue="" onChange={e => { if (e.target.value) { handleStatusUpdate(r._id, e.target.value); e.target.value = ''; } }}>
                          <option value="" disabled>Update…</option>
                          {['Under Review','Assigned','Repair In Progress','Resolved','Closed','Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="animate-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', marginBottom: '1rem' }}>Top Districts by Reports</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distData} layout="vertical" margin={{ left: 60, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', marginBottom: '1rem' }}>Status Distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name.split(' ')[0]} ${(percent*100).toFixed(0)}%`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card" style={{ padding: '1.25rem', gridColumn: '1/-1' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', marginBottom: '1rem' }}>Monthly Report Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="reports" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Districts Tab */}
      {tab === 'districts' && (
        <div className="animate-up">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {districts.map(d => (
              <div key={d._id} className="card-hover" style={{ padding: '1.125rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', margin: 0 }}>{d.name}</h3>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, background: '#f1f5f9', color: '#64748b', borderRadius: 999, padding: '2px 8px', border: '1px solid #e2e8f0' }}>{d.code}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>🏛️ {d.headquarters}</span>
                  <span>📐 {d.area_sqkm?.toLocaleString()} km²</span>
                  <span>👤 {d.adminId ? `${d.adminId.name}` : <span style={{ color: '#dc2626' }}>No admin assigned</span>}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admins Tab */}
      {tab === 'admins' && (
        <div className="animate-up">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button id="add-district-admin-btn" className="btn btn-primary" onClick={() => setAdminModal({})}>+ Add District Admin</button>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="rw-table">
              <thead><tr><th>Name</th><th>Email</th><th>District</th><th>Phone</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading…</td></tr>
                ) : admins.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No district admins yet. Add one above.</td></tr>
                ) : admins.map(admin => (
                  <tr key={admin._id}>
                    <td style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{admin.name}</td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{admin.email}</td>
                    <td style={{ fontSize: '0.8125rem', color: '#0f172a' }}>{admin.district?.name || '—'}</td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{admin.phone || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button id={`edit-admin-${admin._id}`} className="btn btn-secondary btn-sm" onClick={() => setAdminModal(admin)}>Edit</button>
                        <button id={`delete-admin-${admin._id}`} className="btn btn-danger btn-sm" onClick={() => handleDeleteAdmin(admin._id)} disabled={deletingId === admin._id}>
                          {deletingId === admin._id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin CRUD Modal */}
      {adminModal !== null && (
        <AdminModal
          districts={districts}
          admin={adminModal?._id ? adminModal : null}
          onClose={() => setAdminModal(null)}
          onSave={handleSaveAdmin}
        />
      )}
    </div>
  );
}
