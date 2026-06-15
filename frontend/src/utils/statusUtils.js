// Status utilities for RoadWatch v2

export const ALL_STATUSES = [
  'Reported', 'Under Review', 'Assigned', 'Repair In Progress', 'Resolved', 'Closed', 'Rejected',
];
export const STATUS_FLOW = [
  'Under Review', 'Assigned', 'Repair In Progress', 'Resolved', 'Closed',
];
export const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export function getStatusClass(status) {
  const map = {
    'Reported':          'badge badge-reported',
    'Under Review':      'badge badge-review',
    'Assigned':          'badge badge-assigned',
    'Repair In Progress':'badge badge-progress',
    'Resolved':          'badge badge-resolved',
    'Closed':            'badge badge-closed',
    'Rejected':          'badge badge-rejected',
  };
  return map[status] || 'badge badge-reported';
}

export function getSeverityClass(severity) {
  const map = {
    'Low':      'badge sev-low',
    'Medium':   'badge sev-medium',
    'High':     'badge sev-high',
    'Critical': 'badge sev-critical',
  };
  return map[severity] || 'badge sev-medium';
}

export function getStatusColor(status) {
  const map = {
    'Reported':           '#d97706',
    'Under Review':       '#9333ea',
    'Assigned':           '#0891b2',
    'Repair In Progress': '#ea580c',
    'Resolved':           '#16a34a',
    'Closed':             '#64748b',
    'Rejected':           '#dc2626',
  };
  return map[status] || '#94a3b8';
}

export function getSeverityColor(severity) {
  const map = {
    'Low':      '#16a34a',
    'Medium':   '#d97706',
    'High':     '#ea580c',
    'Critical': '#dc2626',
  };
  return map[severity] || '#94a3b8';
}

export function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return formatDate(date);
}

export function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0] || '?').slice(0, 2).toUpperCase();
}

export const AVATAR_COLORS = [
  'linear-gradient(135deg,#2563eb,#7c3aed)',
  'linear-gradient(135deg,#059669,#0891b2)',
  'linear-gradient(135deg,#d97706,#dc2626)',
  'linear-gradient(135deg,#7c3aed,#db2777)',
  'linear-gradient(135deg,#0891b2,#2563eb)',
  'linear-gradient(135deg,#16a34a,#059669)',
];

export function getAvatarGradient(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getRoleBadgeClass(role) {
  if (role === 'super_admin') return 'badge role-super-admin';
  if (role === 'district_admin') return 'badge role-district-admin';
  return 'badge role-citizen';
}

export function getRoleLabel(role) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'district_admin') return 'District Admin';
  return 'Citizen';
}
