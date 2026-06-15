import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logout, authFetch } from '../../auth';
import API_BASE_URL from '../../config';
import { getInitials, getAvatarGradient, getRoleBadgeClass, getRoleLabel } from '../../utils/statusUtils';

function BellIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

export default function GlobalHeader({ auth, setAuth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const dropRef = useRef(null);
  const notifRef = useRef(null);

  const role = auth?.role;
  const effectiveRole = role === 'admin' ? 'super_admin' : role;
  const initials = getInitials(auth?.name || auth?.email || '');
  const avatarGrad = getAvatarGradient(auth?.name || auth?.email || '');

  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!auth) return;
    setNotifLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/notifications?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { /* silent */ } finally { setNotifLoading(false); }
  }, [auth]);

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 30000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    await authFetch(`${API_BASE_URL}/api/notifications/mark-all-read`, { method: 'PATCH' });
    setNotifications(n => n.map(x => ({ ...x, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id) => {
    await authFetch(`${API_BASE_URL}/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications(n => n.map(x => x._id === id ? { ...x, read: true } : x));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleLogout = () => {
    logout();
    setAuth(null);
    setDropdownOpen(false);
    window.location.href = '/';
  };

  const getDashPath = () => {
    if (effectiveRole === 'super_admin') return '/super-admin';
    if (effectiveRole === 'district_admin') return '/district-admin';
    return '/dashboard';
  };

  const navLinks = auth ? (
    effectiveRole === 'super_admin' ? [
      { path: '/super-admin', label: 'Dashboard', icon: <DashIcon /> },
      { path: '/reports', label: 'All Reports', icon: <MapIcon /> },
    ] : effectiveRole === 'district_admin' ? [
      { path: '/district-admin', label: 'Dashboard', icon: <DashIcon /> },
      { path: '/reports', label: 'District Map', icon: <MapIcon /> },
    ] : [
      { path: '/dashboard', label: 'Dashboard', icon: <DashIcon /> },
      { path: '/reports', label: 'Map & Reports', icon: <MapIcon /> },
    ]
  ) : [];

  const notifIcons = { critical_report: '🚨', new_report: '📍', status_changed: '🔄', general: '🔔' };

  return (
    <nav className="navbar">
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', height: 60 }}>

        {/* Logo */}
        <Link to={auth ? getDashPath() : '/'} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
          }}>
            <LogoIcon />
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: '1.125rem', color: '#0f172a', letterSpacing: '-0.025em' }}>
            Road<span style={{ color: '#2563eb' }}>Watch</span>
          </span>
        </Link>

        {/* Center Nav */}
        {auth && navLinks.length > 0 && (
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: '4px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link${location.pathname === link.path ? ' active' : ''}`}
                style={{ fontSize: '0.8125rem' }}
              >
                {link.icon}{link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {auth ? (
            <>
              {/* Notification Bell */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button
                  id="notif-bell-btn"
                  onClick={() => { setNotifOpen(o => !o); if (!notifOpen) fetchNotifications(); }}
                  className="icon-btn"
                  style={{ position: 'relative' }}
                >
                  <BellIcon />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      background: '#dc2626', color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      borderRadius: '999px', minWidth: 18, height: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px', border: '2px solid #fff',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="dropdown animate-scale" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, zIndex: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {notifLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                          <div className="spinner spinner-sm" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>No notifications yet</div>
                      ) : notifications.map(n => (
                        <div
                          key={n._id}
                          className={`notif-item${!n.read ? ' unread' : ''}`}
                          onClick={() => { markRead(n._id); setNotifOpen(false); if (n.reportId) navigate('/reports'); }}
                        >
                          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{notifIcons[n.type] || '🔔'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.8125rem', color: '#0f172a', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '2px 0 0' }}>
                              {new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 4 }} />}
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #e2e8f0' }}>
                      <Link to="/notifications" onClick={() => setNotifOpen(false)} style={{ fontSize: '0.8125rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                        View all notifications →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar Dropdown */}
              <div ref={dropRef} style={{ position: 'relative' }}>
                <button
                  id="profile-menu-btn"
                  onClick={() => setDropdownOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 10 }}
                >
                  <div className="avatar" style={{ background: avatarGrad }}>{initials}</div>
                  <div style={{ textAlign: 'left', display: 'none' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2, margin: 0 }}>{auth.name || 'User'}</p>
                    <span className={getRoleBadgeClass(role)} style={{ fontSize: '0.625rem' }}>{getRoleLabel(role)}</span>
                  </div>
                  <svg width="14" height="14" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"
                    style={{ transform: dropdownOpen ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="dropdown animate-scale" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 240, zIndex: 200 }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', margin: 0 }}>{auth.name || 'User'}</p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 6px' }}>{auth.email}</p>
                      <span className={getRoleBadgeClass(role)}>{getRoleLabel(role)}</span>
                    </div>
                    <div style={{ padding: '6px' }}>
                      {[
                        { label: 'My Dashboard', path: getDashPath(), icon: '📊' },
                        { label: 'My Profile', path: '/profile', icon: '👤', id: 'dropdown-profile-btn' },
                        { label: 'Notifications', path: '/notifications', icon: '🔔' },
                      ].map(item => (
                        <button
                          key={item.path}
                          id={item.id}
                          onClick={() => { navigate(item.path); setDropdownOpen(false); }}
                          className="btn-ghost"
                          style={{ width: '100%', justifyContent: 'flex-start', padding: '9px 12px', borderRadius: 8, gap: 10, fontSize: '0.875rem', border: 'none' }}
                        >
                          <span>{item.icon}</span> {item.label}
                          {item.label === 'Notifications' && unreadCount > 0 && (
                            <span style={{ marginLeft: 'auto', background: '#dc2626', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                              {unreadCount}
                            </span>
                          )}
                        </button>
                      ))}
                      <div className="divider" style={{ margin: '4px 0' }} />
                      <button
                        id="dropdown-logout-btn"
                        onClick={handleLogout}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#dc2626', fontWeight: 600, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                      >
                        <span>🚪</span> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/login" id="header-login-link" className="btn btn-secondary btn-sm">Login</Link>
              <Link to="/register" id="header-register-link" className="btn btn-primary btn-sm">Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
