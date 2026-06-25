import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-4-8';

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function parseJson(text) {
  try {
    return JSON.parse(text ?? '{}');
  } catch {
    return {};
  }
}

// ---- Chat turn ----------------------------------------------------------------
const REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply_sv: { type: 'string', description: "Reply in simple Swedish at the learner's level (1-2 short sentences)." },
    reply_en: { type: 'string', description: 'Accurate English translation of reply_sv.' },
    correction: {
      type: 'object',
      additionalProperties: false,
      properties: {
        had_error: { type: 'boolean', description: "True if the learner's last Swedish message had a mistake." },
        note: { type: 'string', description: 'If had_error: a short, kind correction in English. Otherwise "".' },
      },
      required: ['had_error', 'note'],
    },
  },
  required: ['reply_sv', 'reply_en', 'correction'],
};

function chatSystem(p) {
  const words = p.knownWords.length ? p.knownWords.join(', ') : '(only a handful so far)';
  const grammar = p.knownGrammar.length ? p.knownGrammar.join('; ') : 'basic greetings and "jag heter…"';
  return [
    `You are a warm, patient Swedish conversation partner helping a beginner practise speaking. The learner is at CEFR level ${p.level}.`,
    ``,
    `Scene: ${p.scene}`,
    ``,
    `Words the learner has studied: ${words}.`,
    `Grammar they know: ${grammar}.`,
    ``,
    `Rules:`,
    `- Reply ONLY in simple Swedish, 1-2 short sentences. Strongly prefer words the learner knows; a few other very common ${p.level} words are OK, but keep it simple and concrete.`,
    `- Stay in the scene and keep the chat going with ONE easy question.`,
    `- Be warm and encouraging. Never write English in reply_sv.`,
    `- reply_en must be an accurate English translation of reply_sv.`,
    `- If the learner's latest message has a Swedish mistake, set correction.had_error true and give a short, kind fix in English in correction.note. If it is fine (or they wrote English), set had_error false and note "".`,
  ].join('\n');
}

export async function chatReply(body) {
  const level = String(body.level ?? 'A1');
  const scene = String(body.scene ?? '');
  const knownWords = Array.isArray(body.knownWords) ? body.knownWords.map(String) : [];
  const knownGrammar = Array.isArray(body.knownGrammar) ? body.knownGrammar.map(String) : [];
  const history = Array.isArray(body.history) ? body.history : [];
  const userMessage = String(body.userMessage ?? '').slice(0, 1000);
  if (!userMessage) return { reply_sv: '…', reply_en: '', correction: { had_error: false, note: '' } };

  const messages = [
    ...history.slice(-12).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content ?? '').slice(0, 1000),
    })),
    { role: 'user', content: userMessage },
  ];

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 500,
    system: chatSystem({ level, scene, knownWords, knownGrammar }),
    messages,
    output_config: { format: { type: 'json_schema', schema: REPLY_SCHEMA } },
  });

  const parsed = parseJson(resp.content?.find((b) => b.type === 'text')?.text);
  return {
    reply_sv: parsed.reply_sv ?? '…',
    reply_en: parsed.reply_en ?? '',
    correction: parsed.correction ?? { had_error: false, note: '' },
  };
}

// ---- Scene generation ---------------------------------------------------------
const SCENES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    scenes: {
      type: 'array',
      description: 'Exactly 4 varied everyday role-play scenes.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          emoji: { type: 'string' },
          title: { type: 'string', description: 'Short Swedish title (2-3 words).' },
          subtitle: { type: 'string', description: 'Short English description of the scene.' },
          scene_desc: { type: 'string', description: 'One-sentence English instruction for the AI describing its role and the setting.' },
          opener_sv: { type: 'string', description: "The AI's opening line in simple Swedish." },
          opener_en: { type: 'string', description: 'English translation of opener_sv.' },
        },
        required: ['emoji', 'title', 'subtitle', 'scene_desc', 'opener_sv', 'opener_en'],
      },
    },
  },
  required: ['scenes'],
};

function scenesSystem(p) {
  const words = p.knownWords.length ? p.knownWords.join(', ') : '(only a handful so far)';
  const grammar = p.knownGrammar.length ? p.knownGrammar.join('; ') : 'basic greetings';
  return [
    `Generate exactly 4 short, varied, everyday role-play scenarios for a Swedish beginner at CEFR level ${p.level} to practise speaking.`,
    `The learner knows these words: ${words}. Grammar: ${grammar}.`,
    ``,
    `For each scene provide: an emoji; a short Swedish title; a one-line English subtitle; a one-sentence English instruction for YOU, the AI, describing your role and the setting (scene_desc); and a friendly opening line in SIMPLE Swedish (opener_sv) with its English translation (opener_en).`,
    `Make the four scenes clearly DIFFERENT from each other and fresh — e.g. café, bus, shop, neighbour, classroom, market, the weather, hobbies, a phone call. Keep all Swedish within or close to the learner's level. Each opener should invite an easy reply.`,
    `Variety seed (use it to pick different scenes than usual): ${p.nonce}.`,
  ].join('\n');
}

export async function generateScenes(body) {
  const level = String(body.level ?? 'A1');
  const knownWords = Array.isArray(body.knownWords) ? body.knownWords.map(String) : [];
  const knownGrammar = Array.isArray(body.knownGrammar) ? body.knownGrammar.map(String) : [];
  const nonce = String(body.nonce ?? Math.floor(Math.random() * 1e9));

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 900,
    system: scenesSystem({ level, knownWords, knownGrammar, nonce }),
    messages: [{ role: 'user', content: 'Generate the four scenes now.' }],
    output_config: { format: { type: 'json_schema', schema: SCENES_SCHEMA } },
  });

  const parsed = parseJson(resp.content?.find((b) => b.type === 'text')?.text);
  return { scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [] };
}
