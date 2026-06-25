import { BACKEND_URL } from '../aiConfig';

// The signed-in user's token (set by the auth layer after login).
let TOKEN = null;
export function setAuthToken(t) {
  TOKEN = t;
}

async function request(path, { method = 'POST', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && TOKEN) headers.Authorization = 'Bearer ' + TOKEN;
  const res = await fetch(BACKEND_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(data.error || 'Error ' + res.status);
  return data;
}

// --- auth + profile ---
export const apiSignup = (email, password, displayName) =>
  request('/auth/signup', { auth: false, body: { email, password, displayName } });
export const apiLogin = (email, password) =>
  request('/auth/login', { auth: false, body: { email, password } });
export const apiMe = () => request('/me', { method: 'GET' });
export const apiSaveProgress = (itemId, opts = {}) =>
  request('/progress', { body: { itemId, kind: 'lesson', completed: true, ...opts } });
export const apiSetLevel = (level) => request('/level', { body: { level } });

// --- Claude (used by ConversationScreen) ---
export const sendChat = (p) => request('/chat', { body: p });
export const fetchScenes = (p) => request('/scenes', { body: p });
