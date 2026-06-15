import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { authFetch } from '../../auth';
import API_BASE_URL from '../../config';
import { getStatusClass, getSeverityClass, getSeverityColor, timeAgo, formatDate } from '../../utils/statusUtils';
import { Link } from 'react-router-dom';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SEV_DOT = { Critical: '#dc2626', High: '#ea580c', Medium: '#d97706', Low: '#16a34a' };
const SEV_BG  = { Critical: '#fef2f2', High: '#fff7ed', Medium: '#fffbeb', Low: '#f0fdf4' };

// ── Map fly-to helper ─────────────────────────────────────────────────────────
function FlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 14, { animate: true, duration: 0.8 });
  }, [coords, map]);
  return null;
}

// ── Sidebar Report Card ───────────────────────────────────────────────────────
function ReportCard({ report, selected, onClick, isPublic }) {
  return (
    <div
      onClick={() => onClick(report)}
      style={{
        padding: '0.875rem 1rem',
        borderRadius: 14,
        border: `1.5px solid ${selected ? '#2563eb' : '#e8eef6'}`,
        background: selected ? '#eff6ff' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: selected ? '0 0 0 3px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = '#bfdbfe'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = '#e8eef6'; }}
    >
      {/* Top row: severity dot + damage type + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_DOT[report.severity] || '#94a3b8', flexShrink: 0 }} />
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: SEV_DOT[report.severity], background: SEV_BG[report.severity], padding: '1px 8px', borderRadius: 999, border: `1px solid ${SEV_DOT[report.severity]}22` }}>
          {report.severity}
        </span>
        <span className={getStatusClass(report.status)} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{report.status}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{timeAgo(report.createdAt)}</span>
      </div>

      {/* Description */}
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', margin: '0 0 5px', lineHeight: 1.4 }} className="line-clamp-2">
        {report.description}
      </p>

      {/* Location — always show district */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#64748b' }}>
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{report.district || 'Unknown District'}</span>
        {report.damageType && report.damageType !== 'Unknown' && (
          <><span style={{ color: '#cbd5e1' }}>·</span><span>{report.damageType}</span></>
        )}
      </div>
    </div>
  );
}

// ── Slide-in Detail Panel ─────────────────────────────────────────────────────
function ReportDetail({ report, onClose, auth, onStatusUpdate }) {
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const isAdmin = auth?.role === 'district_admin' || auth?.role === 'super_admin';
  const isPublic = !auth;
  const isOwner = auth && report.userId === auth.id;

  const validStatuses = ['Under Review', 'Assigned', 'Repair In Progress', 'Resolved', 'Closed', 'Rejected'];

  const handleUpdate = async () => {
    if (!status) return;
    setUpdating(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/reports/${report._id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status, note }),
      });
      if (res.ok) { onStatusUpdate(await res.json()); setStatus(''); setNote(''); }
    } catch { /* silent */ } finally { setUpdating(false); }
  };

  return (
    <div style={{
      position: 'fixed', right: 0, top: 60, bottom: 0,
      width: '100%', maxWidth: 420,
      background: '#fff',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
      zIndex: 150, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      animation: 'slide-in-right 0.25s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* Header */}
      <div style={{ padding: '1.125rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: SEV_DOT[report.severity] }} />
          <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', margin: 0 }}>Report Details</h3>
        </div>
        <button onClick={onClose} className="icon-btn">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Image */}
        {report.imageUrl && (
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e8eef6' }}>
            <img src={report.imageUrl} alt="Road damage" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className={getSeverityClass(report.severity)}>{report.severity}</span>
          <span className={getStatusClass(report.status)}>{report.status}</span>
          {report.aiVerified && <span className="badge" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>🤖 AI Verified</span>}
          {report.damageType && report.damageType !== 'Unknown' && (
            <span className="badge" style={{ background: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' }}>{report.damageType}</span>
          )}
        </div>

        {/* Description */}
        <div>
          <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem', lineHeight: 1.5, margin: 0 }}>
            {report.description}
          </p>
        </div>

        {/* Meta info card — hide reporter info for public users */}
        <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e8eef6', overflow: 'hidden' }}>
          {[
            { icon: '📍', label: 'District', val: report.district || 'Unknown', show: true },
            { icon: '📅', label: 'Reported', val: formatDate(report.createdAt), show: true },
            { icon: '🏠', label: 'Address', val: report.address, show: !!report.address },
            // Only show reporter identity to logged-in users (own reports or admins)
            { icon: '👤', label: 'Reported by', val: report.userName || 'Anonymous', show: !isPublic && (isAdmin || isOwner) },
            { icon: '🗺️', label: 'Coordinates', val: report.location ? `${report.location.latitude?.toFixed(5)}, ${report.location.longitude?.toFixed(5)}` : null, show: !isPublic },
          ].filter(item => item.show && item.val).map((item, i, arr) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '0.625rem 0.875rem',
              borderBottom: i < arr.length - 1 ? '1px solid #e8eef6' : 'none',
              fontSize: '0.8125rem',
            }}>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span style={{ color: '#64748b', flexShrink: 0 }}>{item.label}:</span>
              <span style={{ color: '#0f172a', fontWeight: 500 }} className="truncate">{item.val}</span>
            </div>
          ))}
        </div>

        {/* Public CTA — nudge unauthenticated users to sign up */}
        {isPublic && (
          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#faf5ff)', border: '1px solid #bfdbfe', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>Want to report road damage?</p>
            <p style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: 12 }}>Create a free account to submit reports and track your area.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
              <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
            </div>
          </div>
        )}

        {/* Status History */}
        {report.statusHistory?.length > 0 && (
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', marginBottom: 10 }}>Status Timeline</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...report.statusHistory].reverse().map((h, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                    <svg width="6" height="6" fill="#2563eb" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" /></svg>
                  </div>
                  <div style={{ paddingBottom: 8 }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{h.newStatus}</p>
                    {h.note && <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0' }}>{h.note}</p>}
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>
                      {/* Only show who updated if logged in */}
                      {!isPublic && h.updatedByName ? `${h.updatedByName} · ` : ''}{timeAgo(h.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Status Update */}
        {isAdmin && (
          <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: '1rem' }}>
            <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', marginBottom: '0.75rem' }}>⚙️ Update Status</p>
            <select className="input-field" value={status} onChange={e => setStatus(e.target.value)} style={{ marginBottom: 8 }}>
              <option value="">Select new status…</option>
              {validStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea
              className="input-field"
              placeholder="Add a note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              style={{ marginBottom: 8, resize: 'none' }}
            />
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleUpdate} disabled={!status || updating}>
              {updating ? 'Updating…' : 'Update Status'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportsPage({ auth }) {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filters, setFilters] = useState({ status: 'All', severity: 'All', search: '' });
  const [flyCoords, setFlyCoords] = useState(null);
  const isPublic = !auth;

  const setFilter = (key) => (val) => setFilters(f => ({ ...f, [key]: val }));

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 200, page: 1, sort: '-createdAt' });
      if (filters.status !== 'All') params.set('status', filters.status);
      if (filters.severity !== 'All') params.set('severity', filters.severity);
      if (filters.search) params.set('search', filters.search);
      const res = await authFetch(`${API_BASE_URL}/api/reports?${params}`);
      if (res.ok) { const d = await res.json(); setReports(d.reports || []); setTotal(d.total || 0); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSelect = (report) => {
    setSelectedReport(report);
    if (report.location?.latitude && report.location?.longitude) {
      setFlyCoords([report.location.latitude, report.location.longitude]);
    }
  };

  const handleStatusUpdate = (updated) => {
    setReports(prev => prev.map(r => r._id === updated._id ? updated : r));
    setSelectedReport(updated);
  };

  const mapReports = reports.filter(r => r.location?.latitude && r.location?.longitude);

  const SEVERITY_FILTERS = [
    { label: 'All', value: 'All' },
    { label: '🔴 Critical', value: 'Critical' },
    { label: '🟠 High', value: 'High' },
    { label: '🟡 Medium', value: 'Medium' },
    { label: '🟢 Low', value: 'Low' },
  ];

  const STATUS_FILTERS = ['All', 'Reported', 'Under Review', 'Assigned', 'Repair In Progress', 'Resolved', 'Closed'];

  return (
    <div style={{ display: 'flex', height: '100vh', paddingTop: 60, background: '#f1f5f9', overflow: 'hidden' }}>

      {/* ── Left Sidebar ──────────────────────────────────────────── */}
      <div style={{
        width: 340, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: '#fff',
        borderRight: '1px solid #e8eef6',
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
      }}>
        {/* Sidebar Header */}
        <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h1 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Road Reports</h1>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '2px 0 0' }}>Tamil Nadu — Live Map</p>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '3px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', animation: 'pulse-critical 2s infinite' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>{total} live</span>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <svg width="13" height="13" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="input-field"
              placeholder="Search by description or district…"
              value={filters.search}
              onChange={e => setFilter('search')(e.target.value)}
              style={{ paddingLeft: '2.125rem', fontSize: '0.8125rem', borderRadius: 10 }}
            />
          </div>

          {/* Severity filter chips */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {SEVERITY_FILTERS.map(({ label, value }) => {
              const active = filters.severity === value;
              return (
                <button key={value} onClick={() => setFilter('severity')(value)} style={{
                  flexShrink: 0, padding: '4px 10px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 700,
                  border: `1.5px solid ${active ? (SEV_DOT[value] || '#2563eb') : '#e8eef6'}`,
                  background: active ? (SEV_BG[value] || '#eff6ff') : '#f8fafc',
                  color: active ? (SEV_DOT[value] || '#2563eb') : '#64748b',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Status filter chips */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginTop: 6, paddingBottom: 2, scrollbarWidth: 'none' }}>
            {STATUS_FILTERS.map(st => {
              const active = filters.status === st;
              return (
                <button key={st} onClick={() => setFilter('status')(st)} style={{
                  flexShrink: 0, padding: '3px 9px', borderRadius: 999, fontSize: '0.625rem', fontWeight: 700,
                  border: `1.5px solid ${active ? '#7c3aed' : '#e8eef6'}`,
                  background: active ? '#faf5ff' : '#f8fafc',
                  color: active ? '#7c3aed' : '#64748b',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}>
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Report List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 92, borderRadius: 14 }} />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <div className="empty-icon"><span style={{ fontSize: '1.5rem' }}>🗺️</span></div>
              <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>No reports found</p>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: 0 }}>Try adjusting your filters</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {reports.map(r => (
                <ReportCard
                  key={r._id}
                  report={r}
                  selected={selectedReport?._id === r._id}
                  onClick={handleSelect}
                  isPublic={isPublic}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA for public users */}
        {isPublic && (
          <div style={{ padding: '0.875rem', borderTop: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#eff6ff,#faf5ff)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', marginBottom: 6, textAlign: 'center' }}>
              See a damaged road? Report it!
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Get Started</Link>
              <Link to="/login" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Sign In</Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Map Area ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', zIndex: 0 }}>
        <MapContainer
          center={[11.0, 78.5]}
          zoom={7}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {flyCoords && <FlyTo coords={flyCoords} />}

          {mapReports.map(r => (
            <CircleMarker
              key={r._id}
              center={[r.location.latitude, r.location.longitude]}
              radius={r.severity === 'Critical' ? 14 : r.severity === 'High' ? 11 : r.severity === 'Medium' ? 9 : 7}
              pathOptions={{
                fillColor: getSeverityColor(r.severity),
                color: selectedReport?._id === r._id ? '#fff' : 'rgba(255,255,255,0.8)',
                weight: selectedReport?._id === r._id ? 3 : 2,
                opacity: 1,
                fillOpacity: selectedReport?._id === r._id ? 1 : 0.82,
              }}
              eventHandlers={{ click: () => handleSelect(r) }}
            >
              {/* Compact popup — NO reporter name/details for anyone */}
              <Popup closeButton={false}>
                <div style={{ padding: '0.75rem', minWidth: 210, fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
                    <span className={getSeverityClass(r.severity)} style={{ fontSize: '0.5625rem' }}>{r.severity}</span>
                    <span className={getStatusClass(r.status)} style={{ fontSize: '0.5625rem' }}>{r.status}</span>
                    {r.damageType && r.damageType !== 'Unknown' && (
                      <span className="badge" style={{ fontSize: '0.5625rem', background: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' }}>{r.damageType}</span>
                    )}
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', margin: '0 0 5px', lineHeight: 1.35 }}>
                    {r.description?.slice(0, 90)}{r.description?.length > 90 ? '…' : ''}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#64748b', marginBottom: 10 }}>
                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span>{r.district || 'Unknown'}</span>
                    <span style={{ color: '#cbd5e1' }}>·</span>
                    <span>{timeAgo(r.createdAt)}</span>
                  </div>
                  <button
                    onClick={() => handleSelect(r)}
                    style={{
                      width: '100%', padding: '6px', borderRadius: 8,
                      background: '#2563eb', color: '#fff', border: 'none',
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Map Stats Overlay (top-right) */}
        <div style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12, padding: '0.625rem 1rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          border: '1px solid #e8eef6',
          zIndex: 500,
          display: 'flex', gap: '1.25rem',
        }}>
          {[
            { label: 'Total', count: total, color: '#2563eb' },
            { label: 'Critical', count: reports.filter(r => r.severity === 'Critical').length, color: '#dc2626' },
            { label: 'Resolved', count: reports.filter(r => ['Resolved','Closed'].includes(r.status)).length, color: '#16a34a' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.125rem', fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.count}</p>
              <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: '2px 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Severity Legend (bottom-left) */}
        <div style={{
          position: 'absolute', bottom: '1rem', left: '1rem',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12, padding: '0.875rem 1rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          border: '1px solid #e8eef6',
          zIndex: 500,
        }}>
          <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 8 }}>Severity</p>
          {[['Critical','#dc2626'], ['High','#ea580c'], ['Medium','#d97706'], ['Low','#16a34a']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 0 3px ${color}22` }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* FAB — only for logged-in citizens */}
        {auth?.role === 'citizen' && (
          <Link to="/report" id="map-report-fab" className="fab">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Report Damage
          </Link>
        )}
      </div>

      {/* ── Detail Panel ──────────────────────────────────────────── */}
      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          onClose={() => { setSelectedReport(null); setFlyCoords(null); }}
          auth={auth}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}
