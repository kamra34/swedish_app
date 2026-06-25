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
  const grammar = p.knownGrammar.length ? p.knownGrammar.join('; ') : 'basic greetings';
  const scene = String(p.scene || '').trim();
  // The app signals "free talk" by sending an empty scene; any real scene is non-empty,
  // so don't keyword-match scene prose (that wrongly flipped real scenes into small talk).
  const isGeneral = !scene;

  const sceneBlock = isGeneral
    ? [
        `Mode: OPEN SMALL TALK — there is no fixed scene. Chat naturally about everyday things`,
        `(the learner's day, interests, food, family, weekend, work, weather…). Follow the`,
        `learner's lead and let the topic flow wherever they take it.`,
      ]
    : [
        `Scene (stay rooted in it): ${scene}`,
        `Play YOUR role in this scene from your very first reply, and make every reply clearly`,
        `belong to this setting and its goal. Do NOT fall back to generic introductions`,
        `("Jag heter…", "Hur mår du?") unless the scene is genuinely about meeting someone — talk`,
        `about what this scene is actually about. It's natural for the chat to drift a little after`,
        `several turns, but keep steering it around the scene.`,
      ];

  return [
    `You are a warm, patient Swedish conversation partner AND a gentle coach, helping a learner at CEFR level ${p.level} practise real speaking.`,
    ``,
    ...sceneBlock,
    ``,
    `Words the learner has studied: ${words}.`,
    `Grammar they know: ${grammar}.`,
    ``,
    `Rules:`,
    `- Reply ONLY in simple Swedish, 1-2 short sentences at about CEFR ${p.level}. Prefer words the learner knows; a few very common ${p.level} words are fine. Keep it concrete and natural for the situation.`,
    `- Keep the conversation moving with exactly ONE easy, RELEVANT question that fits the ${isGeneral ? 'current topic' : 'scene'}.`,
    `- Be warm and encouraging, and coach: when useful, gently model a better phrasing. Never write English in reply_sv.`,
    `- reply_en must be an accurate English translation of reply_sv.`,
    `- If the learner's latest Swedish has a mistake, set correction.had_error true and give a short, kind fix in English in correction.note (name what to fix, e.g. word order or en/ett). If it is fine (or they wrote English), set had_error false and note "".`,
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
  const lines = [
    `Create short everyday role-play scenes for a Swedish beginner at CEFR level ${p.level} to practise speaking.`,
    `The learner knows these words: ${words}. Grammar: ${grammar}.`,
    ``,
    `For each scene provide: a fitting emoji; a short Swedish title; a one-line English subtitle; a one-sentence English instruction for YOU, the AI, describing your role and the setting (scene_desc); and a friendly opening line in SIMPLE Swedish (opener_sv) with its English translation (opener_en). Keep all Swedish within or close to the learner's level; each opener should invite an easy reply.`,
  ];
  if (p.topics && p.topics.length) {
    lines.push(`Create exactly ${p.topics.length} scenes, ONE for each of these settings, IN THIS ORDER:`);
    p.topics.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  } else {
    lines.push(`Create exactly 4 scenes, clearly DIFFERENT from each other and fresh. Variety seed: ${p.nonce}.`);
  }
  return lines.join('\n');
}

export async function generateScenes(body) {
  const level = String(body.level ?? 'A1');
  const knownWords = Array.isArray(body.knownWords) ? body.knownWords.map(String) : [];
  const knownGrammar = Array.isArray(body.knownGrammar) ? body.knownGrammar.map(String) : [];
  const topics = Array.isArray(body.topics) ? body.topics.map(String).slice(0, 6) : [];
  const nonce = String(body.nonce ?? Math.floor(Math.random() * 1e9));

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 1100,
    system: scenesSystem({ level, knownWords, knownGrammar, nonce, topics }),
    messages: [{ role: 'user', content: 'Generate the scenes now.' }],
    output_config: { format: { type: 'json_schema', schema: SCENES_SCHEMA } },
  });

  const parsed = parseJson(resp.content?.find((b) => b.type === 'text')?.text);
  return { scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [] };
}

// ---- One custom scene from the learner's own description ----
const SINGLE_SCENE_SCHEMA = {
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
};

export async function generateCustomScene(body) {
  const level = String(body.level ?? 'A1');
  const knownWords = Array.isArray(body.knownWords) ? body.knownWords.map(String) : [];
  const knownGrammar = Array.isArray(body.knownGrammar) ? body.knownGrammar.map(String) : [];
  const description = String(body.description ?? '').slice(0, 200) || 'a simple everyday conversation';
  const words = knownWords.length ? knownWords.join(', ') : '(only a handful so far)';

  const system = [
    `Build ONE Swedish role-play scene for a CEFR ${level} learner to practise speaking, based on this request from the learner:`,
    `"${description}"`,
    ``,
    `Provide: a fitting emoji; a short Swedish title; a one-line English subtitle; a one-sentence English instruction for YOU, the AI, describing your role and the setting (scene_desc); and a friendly opening line in SIMPLE Swedish (opener_sv) with its English translation (opener_en).`,
    `Keep all Swedish within or close to the learner's level. The learner knows: ${words}. Grammar: ${knownGrammar.join('; ') || 'basic greetings'}. If the request is unclear or off-topic, choose a sensible simple everyday scene.`,
  ].join('\n');

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages: [{ role: 'user', content: 'Create the scene now.' }],
    output_config: { format: { type: 'json_schema', schema: SINGLE_SCENE_SCHEMA } },
  });

  const parsed = parseJson(resp.content?.find((b) => b.type === 'text')?.text);
  return { scene: parsed && parsed.title ? parsed : null };
}
