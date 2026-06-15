import React, { useState, useEffect } from 'react';
import { authFetch } from '../../auth';
import API_BASE_URL from '../../config';
import { getInitials, getAvatarGradient, getRoleBadgeClass, getRoleLabel, formatDate } from '../../utils/statusUtils';

export default function ProfilePage({ auth, setAuth }) {
  const [form, setForm] = useState({ name: auth?.name || '', phone: auth?.phone || '' });
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [editMode, setEditMode] = useState(false);
  const [pwdMode, setPwdMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const initials = getInitials(auth?.name || auth?.email || '');
  const avatarGrad = getAvatarGradient(auth?.name || auth?.email || '');

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PATCH',
        body: JSON.stringify({ name: form.name, phone: form.phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (setAuth && data.user) setAuth(prev => ({ ...prev, ...data.user }));
      setEditMode(false);
      showMsg('success', 'Profile updated successfully!');
    } catch (err) {
      showMsg('error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      showMsg('error', 'New passwords do not match'); return;
    }
    if (pwdForm.newPassword.length < 6) {
      showMsg('error', 'New password must be at least 6 characters'); return;
    }
    setChangingPwd(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/auth/password`, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwdMode(false);
      showMsg('success', 'Password changed successfully!');
    } catch (err) {
      showMsg('error', err.message || 'Failed to change password');
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingTop: '5rem', maxWidth: 720 }}>

      {/* Page Title */}
      <h1 className="font-display section-title" style={{ marginBottom: '1.5rem' }}>My Profile</h1>

      {/* Alert Message */}
      {msg.text && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'} animate-up`} style={{ marginBottom: '1.25rem' }}>
          <span>{msg.type === 'success' ? '✅' : '❌'}</span>
          {msg.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="card animate-up" style={{ padding: '2rem', marginBottom: '1.25rem' }}>
        {/* Avatar + Basic Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: avatarGrad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800, color: '#fff',
            boxShadow: '0 8px 24px rgba(37,99,235,0.25)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {auth?.name || 'User'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '2px 0 6px' }}>{auth?.email}</p>
            <span className={getRoleBadgeClass(auth?.role)}>{getRoleLabel(auth?.role)}</span>
          </div>
          {!editMode && (
            <button
              id="edit-profile-btn"
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setEditMode(true)}
            >
              ✏️ Edit
            </button>
          )}
        </div>

        {/* Account Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: editMode ? '1.25rem' : 0 }}>
          {[
            { label: 'Role', value: getRoleLabel(auth?.role) },
            { label: 'Member Since', value: formatDate(auth?.createdAt) },
            ...(auth?.district?.name ? [{ label: 'District', value: auth.district.name }] : []),
          ].map((item, i) => (
            <div key={i}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', margin: '2px 0 0' }}>{item.value || '—'}</p>
            </div>
          ))}
        </div>

        {/* Edit Form */}
        {editMode && (
          <div className="animate-up">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="input-label">Full Name</label>
                <input
                  id="profile-name-input"
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="input-label">Phone Number</label>
                <input
                  id="profile-phone-input"
                  type="tel"
                  className="input-field"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="save-profile-btn"
                className="btn btn-primary"
                onClick={handleProfileSave}
                disabled={saving}
              >
                {saving ? (
                  <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Saving…</>
                ) : '💾 Save Changes'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setEditMode(false); setForm({ name: auth?.name || '', phone: auth?.phone || '' }); }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="card animate-up" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', margin: 0 }}>🔑 Password & Security</h3>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '2px 0 0' }}>Change your account password</p>
          </div>
          <button
            id="change-password-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => setPwdMode(p => !p)}
          >
            {pwdMode ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {pwdMode && (
          <div className="animate-up" style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="divider" style={{ marginBottom: '0.25rem' }} />
            <div>
              <label className="input-label">Current Password</label>
              <input type="password" className="input-field" placeholder="••••••••" value={pwdForm.currentPassword} onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="input-label">New Password</label>
                <input type="password" className="input-field" placeholder="Min. 6 chars" value={pwdForm.newPassword} onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Confirm New Password</label>
                <input type="password" className="input-field" placeholder="Repeat new password" value={pwdForm.confirmPassword} onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))} />
              </div>
            </div>
            <button
              id="confirm-password-change-btn"
              className="btn btn-primary"
              style={{ width: 'fit-content' }}
              onClick={handlePasswordChange}
              disabled={changingPwd || !pwdForm.currentPassword || !pwdForm.newPassword}
            >
              {changingPwd ? 'Changing…' : '🔒 Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
