import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, initSchema } from './db.js';
import { chatReply, generateScenes, generateCustomScene } from './claude.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const sign = (u) => jwt.sign({ sub: u.id, email: u.email }, JWT_SECRET, { expiresIn: '60d' });

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired — please sign in again.' });
  }
}

app.get('/', (_req, res) => res.json({ ok: true, service: 'svenska-api' }));

// ---- Auth ----
app.post('/auth/signup', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const displayName = String(req.body.displayName || '').trim() || null;
  if (!email.includes('@') || password.length < 6) {
    return res.status(400).json({ error: 'Enter a valid email and a password of at least 6 characters.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1,$2,$3) RETURNING id, email, display_name, current_level',
      [email, hash, displayName],
    );
    const user = rows[0];
    res.json({ token: sign(user), user });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'That email is already registered.' });
    res.status(500).json({ error: 'Sign-up failed.', detail: String(e.message) });
  }
});

app.post('/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
      return res.status(401).json({ error: 'Wrong email or password.' });
    }
    res.json({
      token: sign(u),
      user: { id: u.id, email: u.email, display_name: u.display_name, current_level: u.current_level },
    });
  } catch (e) {
    res.status(500).json({ error: 'Login failed.', detail: String(e.message) });
  }
});

// ---- Profile + progress ----
app.get('/me', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, display_name, current_level FROM users WHERE id=$1',
    [req.user.sub],
  );
  const prog = await pool.query(
    'SELECT item_id, kind, completed, score, data FROM progress WHERE user_id=$1',
    [req.user.sub],
  );
  res.json({ user: rows[0] || null, progress: prog.rows });
});

app.post('/progress', auth, async (req, res) => {
  const itemId = String(req.body.itemId || '');
  if (!itemId) return res.status(400).json({ error: 'itemId required' });
  const kind = String(req.body.kind || 'lesson');
  const completed = !!req.body.completed;
  const score = Number.isFinite(req.body.score) ? req.body.score : null;
  const data = req.body.data ?? null;
  await pool.query(
    `INSERT INTO progress (user_id, item_id, kind, completed, score, data, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6, now())
     ON CONFLICT (user_id, item_id)
     DO UPDATE SET kind=EXCLUDED.kind, completed=EXCLUDED.completed, score=EXCLUDED.score, data=EXCLUDED.data, updated_at=now()`,
    [req.user.sub, itemId, kind, completed, score, data],
  );
  res.json({ ok: true });
});

app.post('/level', auth, async (req, res) => {
  const level = String(req.body.level || 'A1');
  await pool.query('UPDATE users SET current_level=$1 WHERE id=$2', [level, req.user.sub]);
  res.json({ ok: true, level });
});

// ---- Claude (sign-in required) ----
app.post('/chat', auth, async (req, res) => {
  try {
    res.json(await chatReply(req.body));
  } catch (e) {
    res.status(502).json({ error: 'claude_error', detail: String(e.message) });
  }
});

app.post('/scenes', auth, async (req, res) => {
  try {
    res.json(await generateScenes(req.body));
  } catch (e) {
    res.status(502).json({ error: 'claude_error', detail: String(e.message) });
  }
});

app.post('/scene/custom', auth, async (req, res) => {
  try {
    res.json(await generateCustomScene(req.body));
  } catch (e) {
    res.status(502).json({ error: 'claude_error', detail: String(e.message) });
  }
});

// ---- Saved scenes (per user) ----
app.get('/scenes/saved', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, emoji, title, subtitle, scene_desc, opener_sv, opener_en FROM saved_scenes WHERE user_id=$1 ORDER BY created_at DESC',
    [req.user.sub],
  );
  res.json({ scenes: rows });
});

app.post('/scenes/saved', auth, async (req, res) => {
  const s = req.body.scene || {};
  const { rows } = await pool.query(
    `INSERT INTO saved_scenes (user_id, emoji, title, subtitle, scene_desc, opener_sv, opener_en)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, emoji, title, subtitle, scene_desc, opener_sv, opener_en`,
    [req.user.sub, s.emoji || '💬', s.title || 'Scen', s.subtitle || '', s.scene_desc || '', s.opener_sv || 'Hej!', s.opener_en || 'Hi!'],
  );
  res.json({ scene: rows[0] });
});

app.delete('/scenes/saved/:id', auth, async (req, res) => {
  await pool.query('DELETE FROM saved_scenes WHERE id=$1 AND user_id=$2', [req.params.id, req.user.sub]);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 8787;
initSchema()
  .then(() => app.listen(PORT, () => console.log('svenska-api listening on :' + PORT)))
  .catch((e) => {
    console.error('schema init failed:', e.message);
    process.exit(1);
  });
