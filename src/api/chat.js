import { BACKEND_URL, APP_SECRET } from '../aiConfig';

async function post(path, payload) {
  const res = await fetch(BACKEND_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-secret': APP_SECRET },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${txt}`);
  }
  return res.json();
}

// One conversation turn → { reply_sv, reply_en, correction: { had_error, note } }
export function sendChat({ level, scene, knownWords, knownGrammar, history, userMessage }) {
  return post('/chat', { level, scene, knownWords, knownGrammar, history, userMessage });
}

// Fresh, LLM-generated scenes → { scenes: [{ emoji, title, subtitle, scene_desc, opener_sv, opener_en }] }
export function fetchScenes({ level, knownWords, knownGrammar, nonce }) {
  return post('/scenes', { level, knownWords, knownGrammar, nonce });
}
