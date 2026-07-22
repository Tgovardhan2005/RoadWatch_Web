import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

import { getToken, getUser, saveUser, authFetch, logout } from './auth';
import API_BASE_URL from './config';

import GlobalHeader from './components/Layout/GlobalHeader';
import ErrorBoundary from './components/Layout/ErrorBoundary';
import LandingPage from './components/Landing/LandingPage';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import CitizenDashboard from './components/Citizen/CitizenDashboard';
import ReportForm from './components/Citizen/ReportForm';
import ReportsPage from './components/Reports/ReportsPage';
import DistrictAdminDashboard from './components/DistrictAdmin/DistrictAdminDashboard';
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';
import ProfilePage from './components/Profile/ProfilePage';
import NotificationsPage from './components/Notifications/NotificationsPage';

// ── Route Guards ───────────────────────────────────────────────────────────────
function RequireAuth({ auth, children }) {
  if (!auth) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ auth, roles, children }) {
  if (!auth) return <Navigate to="/login" replace />;
  const role = auth.role === 'admin' ? 'super_admin' : auth.role;
  if (!roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}

function RedirectIfAuth({ auth, children }) {
  const role = auth?.role === 'admin' ? 'super_admin' : auth?.role;
  if (auth) {
    if (role === 'super_admin') return <Navigate to="/super-admin" replace />;
    if (role === 'district_admin') return <Navigate to="/district-admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ── Page wrapper with top-padding when header is shown ─────────────────────────
function PageShell({ auth, setAuth, children, showHeader = true }) {
  return (
    <>
      {showHeader && <GlobalHeader auth={auth} setAuth={setAuth} />}
      {children}
    </>
  );
}

// ── App Content (inside Router) ────────────────────────────────────────────────
function AppContent() {
  const [auth, setAuthState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token && user) {
      setAuthState(user);
      // Silently verify token with server
      authFetch(`${API_BASE_URL}/api/auth/verify`)
        .then(async (res) => {
          if (!res.ok) { logout(); setAuthState(null); }
          else {
            const data = await res.json();
            if (data.user) { saveUser(data.user); setAuthState(data.user); }
          }
        })
        .catch(() => { /* network error — keep using cached user */ })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Socket.IO real-time connection
  useEffect(() => {
    const token = getToken();
    if (!auth || !token) return;
    const socket = io(API_BASE_URL, { auth: { token } });
    socket.on('notification', (notif) => {
      // Browser notification (if permission granted)
      if (Notification.permission === 'granted') {
        new Notification('RoadWatch', { body: notif.message, icon: '/favicon.svg' });
      }
    });
    return () => socket.disconnect();
  }, [auth]);

  // Request browser notification permission
  useEffect(() => {
    if (auth && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [auth]);

  const setAuth = useCallback((user) => {
    setAuthState(user);
    if (user) saveUser(user);
    else logout();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div className="spinner" style={{ margin: '0 auto' }} />
          <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.875rem' }}>Loading RoadWatch…</p>
        </div>
      </div>
    );
  }

  const role = auth?.role === 'admin' ? 'super_admin' : auth?.role;

  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/" element={
        <PageShell auth={auth} setAuth={setAuth}>
          {auth
            ? <Navigate to={role === 'super_admin' ? '/super-admin' : role === 'district_admin' ? '/district-admin' : '/dashboard'} replace />
            : <LandingPage />
          }
        </PageShell>
      } />

      <Route path="/login" element={
        <RedirectIfAuth auth={auth}>
          <Login onAuth={(user) => { setAuth(user); }} />
        </RedirectIfAuth>
      } />

      <Route path="/register" element={
        <RedirectIfAuth auth={auth}>
          <Register onAuth={(user) => { setAuth(user); }} />
        </RedirectIfAuth>
      } />

      {/* ── Reports (public view + authenticated features) ── */}
      <Route path="/reports" element={
        <PageShell auth={auth} setAuth={setAuth}>
          <ReportsPage auth={auth} />
        </PageShell>
      } />

      {/* ── Citizen Routes ── */}
      <Route path="/dashboard" element={
        <RequireAuth auth={auth}>
          <PageShell auth={auth} setAuth={setAuth}>
            <CitizenDashboard auth={auth} />
          </PageShell>
        </RequireAuth>
      } />

      <Route path="/report" element={
        <RequireAuth auth={auth}>
          <PageShell auth={auth} setAuth={setAuth}>
            <ReportForm auth={auth} />
          </PageShell>
        </RequireAuth>
      } />

      {/* ── District Admin ── */}
      <Route path="/district-admin" element={
        <RequireRole auth={auth} roles={['district_admin', 'super_admin']}>
          <PageShell auth={auth} setAuth={setAuth}>
            <DistrictAdminDashboard auth={auth} />
          </PageShell>
        </RequireRole>
      } />

      {/* ── Super Admin ── */}
      <Route path="/super-admin" element={
        <RequireRole auth={auth} roles={['super_admin']}>
          <PageShell auth={auth} setAuth={setAuth}>
            <SuperAdminDashboard auth={auth} />
          </PageShell>
        </RequireRole>
      } />

      {/* ── Shared Authenticated Routes ── */}
      <Route path="/profile" element={
        <RequireAuth auth={auth}>
          <PageShell auth={auth} setAuth={setAuth}>
            <ProfilePage auth={auth} setAuth={setAuth} />
          </PageShell>
        </RequireAuth>
      } />

      <Route path="/notifications" element={
        <RequireAuth auth={auth}>
          <PageShell auth={auth} setAuth={setAuth}>
            <NotificationsPage />
          </PageShell>
        </RequireAuth>
      } />

      {/* ── Fallback ── */}
      <Route path="*" element={
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#f1f5f9' }}>
          <div style={{ fontSize: '4rem' }}>🗺️</div>
          <h1 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Page not found</h1>
          <p style={{ color: '#64748b' }}>The route you're looking for doesn't exist.</p>
          <a href="/" className="btn btn-primary">Go Home</a>
        </div>
      } />
    </Routes>
  );
}

export default function RootApp() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
