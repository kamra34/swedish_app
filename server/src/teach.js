// Teacher-led teaching sessions (PROJECT.md §15).
// "Astrid" (the LLM) writes the warm, deep teaching prose for a step FROM the
// authored facts the app sends, a native-Swedish QA pass verifies it, and it's
// cached in `session_content` (shared by all learners at a level). The app owns
// the authored spine (OTA); this service only generates+verifies+caches prose,
// answers in-session questions, and stores resumable session state.
import Anthropic from '@anthropic-ai/sdk';
import { pool } from './db.js';

const MODEL = 'claude-opus-4-8';
const client = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const parseJson = (t) => { try { return JSON.parse(t ?? '{}'); } catch { return {}; } };
const textOf = (resp) => resp?.content?.find((b) => b.type === 'text')?.text;
function cleanText(s) {
  if (typeof s !== 'string') return '';
  let out = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return out.replace(/\s+/g, ' ').trim();
}

// ── teaching-prose generation + QA ──────────────────────────────────────────
const BLOCKS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { blocks: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: {
      type: { type: 'string', enum: ['prose', 'example', 'tip'] },
      text: { type: 'string', description: 'For prose/tip: the teaching text (English, weaving in Swedish terms).' },
      sv: { type: 'string', description: 'For example: the Swedish example.' },
      en: { type: 'string', description: 'For example: its English translation.' },
    }, required: ['type'],
  } } }, required: ['blocks'],
};
const QA_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    ok: { type: 'boolean', description: 'true if the content (after any fixes) is correct, on-topic and level-appropriate.' },
    blocks: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['prose', 'example', 'tip'] },
        text: { type: 'string' }, sv: { type: 'string' }, en: { type: 'string' },
      }, required: ['type'],
    } },
  }, required: ['ok', 'blocks'],
};

function normBlocks(blocks) {
  const out = [];
  for (const b of blocks || []) {
    if (b.type === 'example') {
      const sv = cleanText(b.sv); const en = cleanText(b.en);
      if (sv) out.push({ type: 'example', sv, en });
    } else if (b.type === 'prose' || b.type === 'tip') {
      const text = cleanText(b.text);
      if (text) out.push({ type: b.type, text });
    }
  }
  return out;
}

async function genBlocks({ level, focus, facts, examples, knownWords }) {
  const known = (knownWords || []).slice(0, 60).join(', ') || '(basics only)';
  const ex = (examples || []).map((e) => `${e.sv} = ${e.en}`).join(' · ') || '(none)';
  const system = [
    `You are Astrid, a warm, experienced Swedish teacher teaching a CEFR ${level} learner ONE small step of a lesson.`,
    `Teach this step deeply but concisely (~60–90 seconds of reading).`,
    `STEP FOCUS: ${focus}`,
    `GROUND TRUTH you must follow and must NOT contradict: ${facts}`,
    `Example phrases you may use: ${ex}.  The learner already knows: ${known}.`,
    `Write 2–4 blocks. Types: "prose" (a warm, clear explanation in English that weaves in the Swedish terms),`,
    `"example" (ONE Swedish example with its English translation), "tip" (a short pointer).`,
    `Be encouraging and concrete; never invent grammar beyond the ground truth; use real Swedish letters (å ä ö).`,
  ].join('\n');
  const resp = await client().messages.create({
    model: MODEL, max_tokens: 900, system,
    messages: [{ role: 'user', content: 'Teach this step now.' }],
    output_config: { format: { type: 'json_schema', schema: BLOCKS_SCHEMA } },
  });
  return normBlocks(parseJson(textOf(resp)).blocks);
}

async function qaBlocks({ level, focus, facts, blocks }) {
  if (!blocks.length) return { ok: false, blocks: [] };
  const system = [
    `You are a strict native Swedish teacher reviewing teaching content for a CEFR ${level} app.`,
    `Verify: no incorrect grammar claims; every Swedish example is correct and consistent with the ground truth;`,
    `it is level-appropriate and on the step's focus. Fix small issues; drop a block that is wrong and unfixable.`,
    `STEP FOCUS: ${focus}\nGROUND TRUTH: ${facts}`,
    `Set ok=true only if, after fixes, the content is correct and useful. Real Swedish letters.`,
  ].join('\n');
  const resp = await client().messages.create({
    model: MODEL, max_tokens: 1000, system,
    messages: [{ role: 'user', content: JSON.stringify({ blocks }) }],
    output_config: { format: { type: 'json_schema', schema: QA_SCHEMA } },
  });
  const parsed = parseJson(textOf(resp));
  return { ok: !!parsed.ok, blocks: normBlocks(parsed.blocks) };
}

export async function teachStep(body) {
  const sessionId = String(body.sessionId || '');
  const stepId = String(body.stepId || '');
  const version = Number(body.version) || 1;
  const level = String(body.level || 'A1');
  const focus = String(body.focus || '');
  const facts = String(body.facts || '');
  const examples = Array.isArray(body.examples) ? body.examples : [];
  const knownWords = Array.isArray(body.knownWords) ? body.knownWords.map(String) : [];
  if (!sessionId || !stepId) return { blocks: [] };

  // 1) cache
  try {
    const { rows } = await pool.query(
      'SELECT payload FROM session_content WHERE session_id=$1 AND step_id=$2 AND content_version=$3 AND level=$4',
      [sessionId, stepId, version, level],
    );
    if (rows[0]?.payload?.blocks?.length) return rows[0].payload;
  } catch {}

  // 2) generate → QA
  let result = { blocks: [] };
  try {
    const gen = await genBlocks({ level, focus, facts, examples, knownWords });
    const qa = await qaBlocks({ level, focus, facts, blocks: gen });
    if (qa.ok && qa.blocks.length) result = { blocks: qa.blocks };
  } catch {}

  // 3) authored fallback (always correct) so the learner is never blocked
  if (!result.blocks.length) {
    result = { blocks: examples.slice(0, 3).map((e) => ({ type: 'example', sv: cleanText(e.sv), en: cleanText(e.en) })), fallback: true };
  }

  // 4) cache (only verified content, not the fallback)
  if (!result.fallback) {
    try {
      await pool.query(
        `INSERT INTO session_content (session_id, step_id, content_version, level, payload)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (session_id, step_id, content_version, level) DO NOTHING`,
        [sessionId, stepId, version, level, result],
      );
    } catch {}
  }
  return result;
}

// ── in-session teacher: "Fråga Astrid" ──────────────────────────────────────
const ASK_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    answer: { type: 'string', description: 'A clear, encouraging answer in English (may weave in Swedish), 2–4 sentences.' },
    example_sv: { type: 'string', description: 'Optional one short Swedish example, or "".' },
    example_en: { type: 'string', description: 'Its English translation, or "".' },
  }, required: ['answer', 'example_sv', 'example_en'],
};
export async function askTeacher(body) {
  const level = String(body.level || 'A1');
  const sessionTitle = String(body.sessionTitle || '');
  const facts = String(body.facts || '');
  const focus = String(body.focus || '');
  const question = String(body.question || '').slice(0, 600);
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  if (!question) return { answer: '…', example_sv: '', example_en: '' };
  const system = [
    `You are Astrid, a warm, experienced Swedish teacher. The learner (CEFR ${level}) is mid-lesson: "${sessionTitle}".`,
    `What this lesson teaches (ground truth — don't contradict it): ${facts}`,
    `They're currently on: ${focus}`,
    `Answer their question in 2–4 sentences, grounded in the above; don't teach far beyond ${level}.`,
    `If off-topic, answer briefly then gently steer back to the lesson. Optionally give ONE short Swedish example.`,
    `Be encouraging. Use real Swedish letters (å ä ö).`,
  ].join('\n');
  const messages = [
    ...history.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 600) })),
    { role: 'user', content: question },
  ];
  const resp = await client().messages.create({
    model: MODEL, max_tokens: 500, system, messages,
    output_config: { format: { type: 'json_schema', schema: ASK_SCHEMA } },
  });
  const p = parseJson(textOf(resp));
  return { answer: cleanText(p.answer) || '…', example_sv: cleanText(p.example_sv), example_en: cleanText(p.example_en) };
}

// ── resumable session state ─────────────────────────────────────────────────
export async function getSessionState(userId, sessionId) {
  const { rows } = await pool.query(
    'SELECT session_id, status, current_step, step_data, score FROM session_state WHERE user_id=$1 AND session_id=$2',
    [userId, sessionId],
  );
  return rows[0] || { session_id: sessionId, status: 'not_started', current_step: 0, step_data: {}, score: null };
}
export async function saveSessionState(userId, body) {
  const sessionId = String(body.sessionId || '');
  if (!sessionId) return { ok: false };
  const currentStep = Number.isFinite(body.currentStep) ? body.currentStep : 0;
  const stepData = body.stepData && typeof body.stepData === 'object' ? body.stepData : {};
  const completed = !!body.completed;
  const score = Number.isFinite(body.score) ? body.score : null;
  await pool.query(
    `INSERT INTO session_state (user_id, session_id, status, current_step, step_data, score, completed_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $3='completed' THEN now() ELSE NULL END, now())
     ON CONFLICT (user_id, session_id) DO UPDATE SET
       status=EXCLUDED.status, current_step=EXCLUDED.current_step, step_data=EXCLUDED.step_data,
       score=COALESCE(EXCLUDED.score, session_state.score),
       completed_at=COALESCE(session_state.completed_at, EXCLUDED.completed_at), updated_at=now()`,
    [userId, sessionId, completed ? 'completed' : 'in_progress', currentStep, stepData, score],
  );
  // mirror a progress row on completion so the hub ✓ + /me keep working unchanged
  if (completed) {
    await pool.query(
      `INSERT INTO progress (user_id, item_id, kind, completed, score, updated_at)
       VALUES ($1,$2,'session',true,$3, now())
       ON CONFLICT (user_id, item_id) DO UPDATE SET completed=true, score=EXCLUDED.score, updated_at=now()`,
      [userId, sessionId, score],
    );
  }
  return { ok: true };
}
export async function allSessionStates(userId) {
  const { rows } = await pool.query(
    'SELECT session_id, status, current_step FROM session_state WHERE user_id=$1',
    [userId],
  );
  return { states: rows };
}

// ── in-session message log ──────────────────────────────────────────────────
export async function addSessionMessage(userId, sessionId, stepId, role, content) {
  try {
    await pool.query(
      'INSERT INTO session_messages (user_id, session_id, step_id, role, content) VALUES ($1,$2,$3,$4,$5)',
      [userId, sessionId, stepId || null, role, String(content || '').slice(0, 2000)],
    );
  } catch {}
}
export async function listSessionMessages(userId, sessionId) {
  const { rows } = await pool.query(
    'SELECT step_id, role, content, created_at FROM session_messages WHERE user_id=$1 AND session_id=$2 ORDER BY created_at ASC LIMIT 200',
    [userId, sessionId],
  );
  return { messages: rows };
}
