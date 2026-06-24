import { BACKEND_URL, APP_SECRET } from '../aiConfig';

// Sends one conversation turn to the backend and returns
// { reply_sv, reply_en, correction: { had_error, note } }.
export async function sendChat({ level, scene, knownWords, knownGrammar, history, userMessage }) {
  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-secret': APP_SECRET },
    body: JSON.stringify({ level, scene, knownWords, knownGrammar, history, userMessage }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${txt}`);
  }
  return res.json();
}
