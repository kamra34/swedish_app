import Anthropic from '@anthropic-ai/sdk';

export interface Env {
  ANTHROPIC_API_KEY: string;
  APP_SECRET?: string;
}

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-app-secret',
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// Structured output — the app renders this directly (Swedish + English + gentle correction).
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

function buildSystemPrompt(p: { level: string; scene: string; knownWords: string[]; knownGrammar: string[] }): string {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);

    if (env.APP_SECRET && request.headers.get('x-app-secret') !== env.APP_SECRET) {
      return json({ error: 'unauthorized' }, 401);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid JSON' }, 400);
    }

    const level = String(body.level ?? 'A1');
    const scene = String(body.scene ?? '');
    const knownWords = Array.isArray(body.knownWords) ? body.knownWords.map(String) : [];
    const knownGrammar = Array.isArray(body.knownGrammar) ? body.knownGrammar.map(String) : [];
    const history = Array.isArray(body.history) ? body.history : [];
    const userMessage = String(body.userMessage ?? '').slice(0, 1000);
    if (!userMessage) return json({ error: 'userMessage required' }, 400);

    const messages = [
      ...history.slice(-12).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content ?? '').slice(0, 1000),
      })),
      { role: 'user', content: userMessage },
    ];

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    try {
      const resp: any = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 500,
        system: buildSystemPrompt({ level, scene, knownWords, knownGrammar }),
        messages: messages as any,
        output_config: { format: { type: 'json_schema', schema: REPLY_SCHEMA } },
      } as any);

      const textBlock: any = (resp.content || []).find((b: any) => b.type === 'text');
      let parsed: any = {};
      try {
        parsed = JSON.parse(textBlock?.text ?? '{}');
      } catch {
        parsed = {};
      }

      return json({
        reply_sv: parsed.reply_sv ?? '…',
        reply_en: parsed.reply_en ?? '',
        correction: parsed.correction ?? { had_error: false, note: '' },
      });
    } catch (e: any) {
      return json({ error: 'claude_error', detail: String(e?.message ?? e) }, 502);
    }
  },
};
