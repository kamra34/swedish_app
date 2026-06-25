// Practice-drill generation engine (Phase 1 of the curriculum plan, PROJECT.md §14).
//
// For every drill type the flow is the same: GENERATE candidates with Claude →
// VERIFY them with a second native-Swedish-teacher pass → keep only those that pass
// (auto-correcting where the teacher fixes them). Verified items are CACHED in
// Postgres (`practice_items`), so after the first generation, drills are served
// instantly and the pool grows in the background. This is what makes generated
// practice both trustworthy and fast.
import Anthropic from '@anthropic-ai/sdk';
import { pool } from './db.js';

const MODEL = 'claude-opus-4-8';
const client = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJson(text) {
  try { return JSON.parse(text ?? '{}'); } catch { return {}; }
}
function cleanText(s) {
  if (typeof s !== 'string') return '';
  let out = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  out = out.replace(/\s+/g, ' ').trim();
  return /^(null|undefined)$/i.test(out) ? '' : out;
}
const textOf = (resp) => resp?.content?.find((b) => b.type === 'text')?.text;

// ============================ en/ett gender drill ============================
const ENETT_GEN_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { items: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: {
      noun: { type: 'string', description: 'Bare singular noun, no article (e.g. "bil").' },
      article: { type: 'string', enum: ['en', 'ett'] },
      en: { type: 'string', description: 'Short English meaning.' },
    }, required: ['noun', 'article', 'en'],
  } } }, required: ['items'],
};
const ENETT_QA_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { results: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: {
      keep: { type: 'boolean' },
      noun: { type: 'string' },
      article: { type: 'string', enum: ['en', 'ett'] },
      en: { type: 'string' },
    }, required: ['keep', 'noun', 'article', 'en'],
  } } }, required: ['results'],
};

async function genEnEtt({ count, knownWords }) {
  const known = knownWords.length ? knownWords.slice(0, 60).join(', ') : '(none yet)';
  const system = [
    `Generate ${count + 4} DISTINCT common everyday Swedish nouns for a CEFR A1 learner to practise the en/ett gender.`,
    `For each: the bare singular noun (no article), its correct gender article ("en"/"ett"), and a short English meaning.`,
    `Prefer concrete, high-frequency, everyday nouns (objects, food, places, people, animals). Avoid abstract, rare, compound, or proper nouns.`,
    `Mix en-words and ett-words. Use real Swedish letters (å ä ö). Avoid nouns the learner clearly knows: ${known}.`,
  ].join('\n');
  const resp = await client().messages.create({
    model: MODEL, max_tokens: 900, system,
    messages: [{ role: 'user', content: 'Generate the nouns now.' }],
    output_config: { format: { type: 'json_schema', schema: ENETT_GEN_SCHEMA } },
  });
  return parseJson(textOf(resp)).items || [];
}
async function qaEnEtt(items) {
  if (!items.length) return [];
  const system = [
    `You are a strict native Swedish teacher checking en/ett items for an A1 app. For EACH item:`,
    `1) Is "article" the CORRECT standard gender for "noun"? If the noun is fine but the article is wrong, keep=true and FIX it.`,
    `2) Is "en" an accurate English meaning?  3) Is it genuinely A1 (common, concrete, singular)?`,
    `keep=false for wrong/rare/abstract/compound/proper/duplicate items. Lowercase nouns, real Swedish letters.`,
  ].join('\n');
  const resp = await client().messages.create({
    model: MODEL, max_tokens: 1200, system,
    messages: [{ role: 'user', content: JSON.stringify({ items }) }],
    output_config: { format: { type: 'json_schema', schema: ENETT_QA_SCHEMA } },
  });
  const results = parseJson(textOf(resp)).results || [];
  const seen = new Set(); const out = [];
  for (const r of results) {
    if (!r.keep) continue;
    const noun = cleanText(r.noun).toLowerCase(); const en = cleanText(r.en);
    const article = r.article === 'ett' ? 'ett' : 'en';
    if (!noun || !en || seen.has(noun)) continue;
    seen.add(noun); out.push({ noun, article, en });
  }
  return out;
}

// ========================= verb conjugation drill ===========================
const VERB_GEN_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { items: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: {
      infinitive: { type: 'string', description: 'Infinitive with att, e.g. "att tala".' },
      en: { type: 'string', description: 'English meaning, e.g. "to speak".' },
      present: { type: 'string', description: 'Present tense, e.g. "talar".' },
      preteritum: { type: 'string', description: 'Past tense, e.g. "talade".' },
    }, required: ['infinitive', 'en', 'present', 'preteritum'],
  } } }, required: ['items'],
};
const VERB_QA_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { results: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: {
      keep: { type: 'boolean' },
      infinitive: { type: 'string' }, en: { type: 'string' },
      present: { type: 'string' }, preteritum: { type: 'string' },
    }, required: ['keep', 'infinitive', 'en', 'present', 'preteritum'],
  } } }, required: ['results'],
};

async function genVerbConj({ count }) {
  const system = [
    `Generate ${count + 4} DISTINCT common everyday Swedish verbs for a CEFR A1 learner to practise conjugation.`,
    `For each: the infinitive WITH "att" (e.g. "att tala"); a short English meaning ("to speak"); the PRESENT tense ("talar"); and the PRETERITUM / past ("talade").`,
    `Prefer high-frequency verbs; a mix of regular groups is good, plus the most common irregulars (vara→är→var, ha→har→hade, gå→går→gick). Use real Swedish letters (å ä ö).`,
  ].join('\n');
  const resp = await client().messages.create({
    model: MODEL, max_tokens: 1100, system,
    messages: [{ role: 'user', content: 'Generate the verbs now.' }],
    output_config: { format: { type: 'json_schema', schema: VERB_GEN_SCHEMA } },
  });
  return parseJson(textOf(resp)).items || [];
}
async function qaVerbConj(items) {
  if (!items.length) return [];
  const system = [
    `You are a strict native Swedish teacher checking verb-conjugation items for an A1 app. For EACH verb verify:`,
    `1) "infinitive" is the correct infinitive with "att".  2) "present" is the correct present tense.  3) "preteritum" is the correct past tense.  4) "en" is accurate.  5) it's a common A1 verb.`,
    `Fix any slightly-wrong form; set keep=false for wrong/rare/duplicate verbs. Use real Swedish letters, lowercase.`,
  ].join('\n');
  const resp = await client().messages.create({
    model: MODEL, max_tokens: 1500, system,
    messages: [{ role: 'user', content: JSON.stringify({ items }) }],
    output_config: { format: { type: 'json_schema', schema: VERB_QA_SCHEMA } },
  });
  const results = parseJson(textOf(resp)).results || [];
  const seen = new Set(); const out = [];
  for (const r of results) {
    if (!r.keep) continue;
    const infinitive = cleanText(r.infinitive).toLowerCase();
    const present = cleanText(r.present).toLowerCase();
    const preteritum = cleanText(r.preteritum).toLowerCase();
    const en = cleanText(r.en);
    const key = infinitive.replace(/^att\s+/i, '');
    if (!infinitive || !present || !en || seen.has(key)) continue;
    seen.add(key); out.push({ infinitive, en, present, preteritum });
  }
  return out;
}

// ============================ cache + dispatch ==============================
const TYPES = {
  en_ett: { gen: genEnEtt, qa: qaEnEtt, keyOf: (it) => it.noun },
  verb_conj: { gen: genVerbConj, qa: qaVerbConj, keyOf: (it) => (it.infinitive || '').replace(/^att\s+/i, '') },
};
const POOL_TARGET = 40;       // grow each type's cache toward this in the background
const refilling = new Set();  // guards against concurrent background refills

async function poolSample(type, n) {
  try {
    const { rows } = await pool.query('SELECT item FROM practice_items WHERE type=$1 ORDER BY random() LIMIT $2', [type, n]);
    return rows.map((r) => r.item);
  } catch { return []; }
}
async function poolCount(type) {
  try {
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM practice_items WHERE type=$1', [type]);
    return rows[0]?.n || 0;
  } catch { return 0; }
}
async function poolInsert(type, items, keyOf) {
  for (const it of items) {
    const key = String(keyOf(it) || '').toLowerCase().trim();
    if (!key) continue;
    try {
      await pool.query(
        'INSERT INTO practice_items (type, item_key, item) VALUES ($1,$2,$3) ON CONFLICT (type, item_key) DO NOTHING',
        [type, key, it],
      );
    } catch {}
  }
}
async function generateBatch(cfg, knownWords, count) {
  return cfg.qa(await cfg.gen({ count, knownWords }));
}
function backgroundRefill(type, cfg, knownWords) {
  if (refilling.has(type)) return;
  refilling.add(type);
  (async () => {
    try { await poolInsert(type, await generateBatch(cfg, knownWords, 10), cfg.keyOf); }
    catch {}
    finally { refilling.delete(type); }
  })();
}

export async function generateDrills(body) {
  const type = String(body.type || 'en_ett');
  const count = Math.min(Math.max(Number(body.count) || 8, 3), 12);
  const knownWords = Array.isArray(body.knownWords) ? body.knownWords.map(String) : [];
  const cfg = TYPES[type];
  if (!cfg) return { type, items: [] };

  let items = await poolSample(type, count);
  if (items.length < count) {
    // cold or low cache → generate one verified batch synchronously so we can serve now
    const fresh = await generateBatch(cfg, knownWords, Math.max(count, 8));
    await poolInsert(type, fresh, cfg.keyOf);
    items = await poolSample(type, count);
    if (items.length < count) items = fresh.slice(0, count); // DB hiccup fallback
  } else if ((await poolCount(type)) < POOL_TARGET) {
    backgroundRefill(type, cfg, knownWords); // served instantly; grow the pool in the background
  }
  return { type, items: items.slice(0, count) };
}
