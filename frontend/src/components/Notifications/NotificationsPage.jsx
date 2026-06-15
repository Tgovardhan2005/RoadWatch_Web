import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../auth';
import API_BASE_URL from '../../config';
import { timeAgo } from '../../utils/statusUtils';

const NOTIF_ICONS = {
  critical_report: { icon: '🚨', bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  new_report:      { icon: '📍', bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' },
  status_changed:  { icon: '🔄', bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
  report_accepted: { icon: '✅', bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
  general:         { icon: '🔔', bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' },
};

function NotifItem({ n, onMarkRead }) {
  const cfg = NOTIF_ICONS[n.type] || NOTIF_ICONS.general;
  return (
    <div
      className={`notif-item${!n.read ? ' unread' : ''}`}
      onClick={() => !n.read && onMarkRead(n._id)}
      style={{ borderRadius: 12, border: `1px solid ${n.read ? '#e2e8f0' : cfg.border}`, background: n.read ? '#fff' : cfg.bg, padding: '0.875rem', cursor: n.read ? 'default' : 'pointer', transition: 'all 0.15s' }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', flexShrink: 0 }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.875rem', color: '#0f172a', margin: 0, lineHeight: 1.4, fontWeight: n.read ? 400 : 600 }}>{n.message}</p>
        <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '3px 0 0' }}>{timeAgo(n.createdAt)}</p>
      </div>
      {!n.read && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: 4 }} />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/notifications?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const handleMarkRead = async (id) => {
    await authFetch(`${API_BASE_URL}/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await authFetch(`${API_BASE_URL}/api/notifications/mark-all-read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } finally { setMarkingAll(false); }
  };

  const displayed = tab === 'unread' ? notifications.filter(n => !n.read) : notifications;

  return (
    <div className="page-container" style={{ paddingTop: '5rem', maxWidth: 680 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="font-display section-title" style={{ marginBottom: 2 }}>Notifications</h1>
          {unreadCount > 0 && (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              You have <strong style={{ color: '#2563eb' }}>{unreadCount}</strong> unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            id="mark-all-read-btn"
            className="btn btn-secondary btn-sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? 'Marking…' : '✓ Mark all as read'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab-btn${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          🔔 All ({notifications.length})
        </button>
        <button className={`tab-btn${tab === 'unread' ? ' active' : ''}`} onClick={() => setTab('unread')}>
          ✉️ Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 12 }} />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ width: 72, height: 72, borderRadius: 18 }}>
            <span style={{ fontSize: '2rem' }}>🔔</span>
          </div>
          <h3 style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
            {tab === 'unread' ? 'You\'re all caught up!' : 'You\'ll be notified of report updates here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.map(n => (
            <NotifItem key={n._id} n={n} onMarkRead={handleMarkRead} />
          ))}
        </div>
      )}
    </div>
  );
}
