// Practice-drill generation engine (Phase 1 of the curriculum plan, PROJECT.md §14).
//
// The flow for every drill type is the same: GENERATE candidate items with Claude
// → VERIFY them with a second native-Swedish-teacher Claude pass → return only the
// items that pass (auto-correcting where the teacher fixes them). This is what makes
// generated practice trustworthy. Caching in Postgres is a later optimisation.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-4-8';
const client = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJson(text) {
  try { return JSON.parse(text ?? '{}'); } catch { return {}; }
}
// Decode stray \uXXXX escapes / drop null tokens (models occasionally emit them).
function cleanText(s) {
  if (typeof s !== 'string') return '';
  let out = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  out = out.replace(/\s+/g, ' ').trim();
  return /^(null|undefined)$/i.test(out) ? '' : out;
}
const textOf = (resp) => resp?.content?.find((b) => b.type === 'text')?.text;

// ---- en/ett gender drill ------------------------------------------------------
const ENETT_GEN_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          noun: { type: 'string', description: 'The bare singular noun, no article (e.g. "bil").' },
          article: { type: 'string', enum: ['en', 'ett'], description: 'Its correct gender article.' },
          en: { type: 'string', description: 'Short English meaning (e.g. "car").' },
        },
        required: ['noun', 'article', 'en'],
      },
    },
  },
  required: ['items'],
};
const ENETT_QA_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          keep: { type: 'boolean', description: 'true if this is a good, correct A1 item (after any fix).' },
          noun: { type: 'string' },
          article: { type: 'string', enum: ['en', 'ett'] },
          en: { type: 'string' },
        },
        required: ['keep', 'noun', 'article', 'en'],
      },
    },
  },
  required: ['results'],
};

async function genEnEtt({ count, knownWords }) {
  const known = knownWords.length ? knownWords.slice(0, 60).join(', ') : '(none yet)';
  const system = [
    `Generate ${count + 4} DISTINCT common everyday Swedish nouns for a CEFR A1 learner to practise the en/ett gender.`,
    `For each: the bare singular noun (no article), its correct gender article ("en" or "ett"), and a short English meaning.`,
    `Prefer concrete, high-frequency, everyday nouns (objects, food, places, people, animals). Avoid abstract, rare, compound, or proper nouns.`,
    `It's good to include a mix of en-words and ett-words. Use real Swedish letters (å ä ö). Don't repeat nouns the learner clearly knows already: ${known}.`,
  ].join('\n');
  const resp = await client().messages.create({
    model: MODEL, max_tokens: 900, system,
    messages: [{ role: 'user', content: 'Generate the nouns now.' }],
    output_config: { format: { type: 'json_schema', schema: ENETT_GEN_SCHEMA } },
  });
  const parsed = parseJson(textOf(resp));
  return Array.isArray(parsed.items) ? parsed.items : [];
}

async function qaEnEtt(items) {
  if (!items.length) return [];
  const system = [
    `You are a strict native Swedish teacher checking en/ett practice items for an A1 app. For EACH item verify:`,
    `1) Is "article" the CORRECT standard gender for "noun" (en/ett)? If the noun is fine but the article is wrong, set keep=true and FIX the article.`,
    `2) Is "en" an accurate English meaning?`,
    `3) Is it genuinely A1 (common, concrete, singular, a real everyday noun — not abstract/rare/compound/proper)?`,
    `Set keep=false to drop any item that is wrong, rare, abstract, duplicated, or not A1. Return real Swedish letters, lowercase nouns.`,
  ].join('\n');
  const resp = await client().messages.create({
    model: MODEL, max_tokens: 1200, system,
    messages: [{ role: 'user', content: JSON.stringify({ items }) }],
    output_config: { format: { type: 'json_schema', schema: ENETT_QA_SCHEMA } },
  });
  const parsed = parseJson(textOf(resp));
  const results = Array.isArray(parsed.results) ? parsed.results : [];
  const seen = new Set();
  const out = [];
  for (const r of results) {
    if (!r.keep) continue;
    const noun = cleanText(r.noun).toLowerCase();
    const en = cleanText(r.en);
    const article = r.article === 'ett' ? 'ett' : 'en';
    if (!noun || !en || seen.has(noun)) continue;
    seen.add(noun);
    out.push({ noun, article, en });
  }
  return out;
}

// ---- public ------------------------------------------------------------------
export async function generateDrills(body) {
  const type = String(body.type || 'en_ett');
  const count = Math.min(Math.max(Number(body.count) || 8, 3), 12);
  const knownWords = Array.isArray(body.knownWords) ? body.knownWords.map(String) : [];

  if (type === 'en_ett') {
    const candidates = await genEnEtt({ count, knownWords });
    const verified = await qaEnEtt(candidates);
    return { type, items: verified.slice(0, count) };
  }
  return { type, items: [] };
}
