import API_BASE_URL from './config';

// ── Token Storage ──────────────────────────────────────────────────────────────
const TOKEN_KEY = 'rw_token';
const USER_KEY  = 'rw_user';

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── JWT Payload Decode (no verify) ─────────────────────────────────────────────
export function getTokenPayload() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      logout();
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// ── Authenticated Fetch ────────────────────────────────────────────────────────
export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}

// ── Verify token with server ───────────────────────────────────────────────────
export async function verifyAuth() {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await authFetch(`${API_BASE_URL}/api/auth/verify`);
    return res.ok;
  } catch {
    return false;
  }
}
