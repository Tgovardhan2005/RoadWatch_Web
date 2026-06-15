import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authFetch } from '../../auth';
import API_BASE_URL from '../../config';
import { getStatusClass, getSeverityClass, timeAgo, formatDate, getInitials, getAvatarGradient } from '../../utils/statusUtils';

function StatCard({ label, value, icon, color, bg, note }) {
  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
          <p className="font-display" style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', border: `1px solid ${color}30` }}>
          {icon}
        </div>
      </div>
      {note && <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{note}</p>}
    </div>
  );
}

function ReportRow({ report }) {
  return (
    <div className="card-interactive" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: report.severity === 'Critical' ? '#dc2626' : report.severity === 'High' ? '#ea580c' : report.severity === 'Medium' ? '#d97706' : '#16a34a', marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
          <span className={getStatusClass(report.status)} style={{ fontSize: '0.625rem' }}>{report.status}</span>
          <span className={getSeverityClass(report.severity)} style={{ fontSize: '0.625rem' }}>{report.severity}</span>
        </div>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', marginBottom: 2 }} className="line-clamp-1">{report.description}</p>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>📍 {report.district || 'Unknown'} · {timeAgo(report.createdAt)}</p>
      </div>
    </div>
  );
}

export default function CitizenDashboard({ auth }) {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  const initials = getInitials(auth?.name || auth?.email || '');
  const avatarGrad = getAvatarGradient(auth?.name || auth?.email || '');

  const fetchData = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/reports?myReports=true&limit=20&sort=-createdAt`);
      if (res.ok) {
        const data = await res.json();
        const allReports = data.reports || [];
        setReports(allReports.slice(0, 5));
        setStats({
          total: data.total || 0,
          pending: allReports.filter(r => !['Resolved','Closed','Rejected'].includes(r.status)).length,
          resolved: allReports.filter(r => ['Resolved','Closed'].includes(r.status)).length,
          rejected: allReports.filter(r => r.status === 'Rejected').length,
        });
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const STAT_CARDS = [
    { label: 'Total Reports', value: stats.total, icon: '📋', color: '#2563eb', bg: '#eff6ff', note: 'All time' },
    { label: 'Active / Pending', value: stats.pending, icon: '⏳', color: '#d97706', bg: '#fffbeb', note: 'Awaiting resolution' },
    { label: 'Resolved', value: stats.resolved, icon: '✅', color: '#16a34a', bg: '#f0fdf4', note: 'Successfully fixed' },
    { label: 'Rejected', value: stats.rejected, icon: '❌', color: '#dc2626', bg: '#fef2f2', note: 'Did not qualify' },
  ];

  return (
    <div className="page-container" style={{ paddingTop: '5rem' }}>

      {/* Welcome Header */}
      <div className="card animate-up" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="avatar" style={{ background: 'rgba(255,255,255,0.2)', width: 52, height: 52, fontSize: '1.125rem', border: '2px solid rgba(255,255,255,0.4)' }}>
              {initials}
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', margin: 0 }}>Welcome back 👋</p>
              <h1 className="font-display" style={{ fontSize: '1.375rem', fontWeight: 800, color: '#fff', margin: 0 }}>{auth?.name || 'Citizen'}</h1>
            </div>
          </div>
          <Link to="/report" id="citizen-dash-report-btn" className="btn btn-xl" style={{ background: '#fff', color: '#2563eb', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            + Report Damage
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={i} style={{ animationDelay: `${i * 60}ms` }} className="animate-up">
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* Recent Reports + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '1.5rem' }}>
        {/* Recent Reports */}
        <div className="card animate-up" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>My Recent Reports</h2>
            <Link to="/reports" style={{ fontSize: '0.8125rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
              <div className="empty-icon"><span style={{ fontSize: '1.5rem' }}>📋</span></div>
              <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>No reports yet</p>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Spot a damaged road? Report it now.</p>
              <Link to="/report" className="btn btn-primary btn-sm">+ Report Damage</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reports.map(r => <ReportRow key={r._id} report={r} />)}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card animate-up" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Report New Damage', icon: '📍', path: '/report', primary: true },
                { label: 'View Road Map', icon: '🗺️', path: '/reports', primary: false },
                { label: 'My Profile', icon: '👤', path: '/profile', primary: false },
                { label: 'Notifications', icon: '🔔', path: '/notifications', primary: false },
              ].map((a, i) => (
                <Link
                  key={i}
                  id={`quick-action-${a.label.toLowerCase().replace(/\s+/g, '-')}`}
                  to={a.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.625rem 0.875rem',
                    borderRadius: 10, textDecoration: 'none',
                    background: a.primary ? '#eff6ff' : 'var(--bg-muted)',
                    color: a.primary ? '#2563eb' : '#475569',
                    fontWeight: a.primary ? 700 : 500,
                    fontSize: '0.875rem',
                    border: `1px solid ${a.primary ? '#bfdbfe' : '#e2e8f0'}`,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                >
                  <span style={{ fontSize: '1rem' }}>{a.icon}</span>
                  {a.label}
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginLeft: 'auto', opacity: 0.5 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity summary */}
          <div className="card animate-up" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Resolution Rate</h2>
            {stats.total > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a' }}>
                    {Math.round((stats.resolved / stats.total) * 100)}%
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>of your reports</span>
                </div>
                <div className="stat-bar">
                  <div className="stat-bar-fill" style={{ width: `${Math.round((stats.resolved / stats.total) * 100)}%`, background: 'linear-gradient(90deg,#2563eb,#7c3aed)' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>{stats.resolved} of {stats.total} reports resolved</p>
              </>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Submit your first report to see your stats.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
