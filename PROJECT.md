# Svenska — Project Overview & Decisions

A living high-level reference so any new coding session (or collaborator) can pick up
where we left off. For day-to-day Claude Code guidance, see `CLAUDE.md`.

---

## 1. What we're building
An interactive **iOS app to learn Swedish**, CEFR **A1 → C1**, that teaches grammar +
vocabulary so the learner can build *real* sentences — via bite-size lessons, word games,
reading, and an AI conversation partner. Built for one learner (the owner) first, with
App Store potential later. The owner is a **non-coder product owner**; Claude builds and
explains in plain language.

## 2. Core learning principle
Most apps drill phrases but leave you unable to *produce* sentences. Our spine is
**production**: every lesson ends with the learner constructing Swedish, with grammar
taught explicitly. The lesson loop:

> grammar note → guided practice → vocabulary (spaced repetition) → word games →
> reading → produce sentences (AI-checked) → review

## 3. Curriculum & sources (the "book" we follow)
- **Sequence / backbone:** the **Rivstart** series chapter order (Natur & Kultur —
  *A1+A2*, *B1+B2*, *B2+C1*) + **CEFR can-do statements**. Rivstart is copyrighted — we use
  it ONLY as a *scope-and-sequence blueprint*. **All in-app text is original** (authored, or
  AI-generated then checked). **Do not copy Rivstart content.**
- **Vocabulary:** driven by the **Swedish Kelly list** (openly available, CEFR-tagged
  ~8k-word frequency list).
- **Grammar progression** modeled on **Form i fokus (A/B/C)**.
- **Reading** modeled on easy-Swedish sources (*8 Sidor*, *lättläst*) — original graded
  texts per level.

## 4. App structure
- **Levels** A1–C1 → **modules** → **lessons**. A lesson = one loop (see §2).
- Content lives as **data** in `src/data/courseData.js` (each lesson: grammar note, vocab,
  sentence-builder items). Adding lessons = adding data, no UI changes.
- **Games:** *Sentence Builder* (tap words into the right order — teaches Swedish V2 word
  order) is the core. Planned: en/ett gender sort, ending match, conjugation, cloze,
  listening dictation.
- **Spaced repetition (SRS)** for vocabulary — planned (FSRS algorithm).

## 5. Screens (current)
- `HomeScreen` — the A1→C1 path, lesson list, and a "Talk in Swedish" entry.
- `LessonScreen` — steps: grammar note → vocabulary → Sentence Builder rounds → done.
  Tap-to-hear 🔊 on words, examples, and solved sentences.
- `ConversationScreen` — the AI conversation partner (scene picker + chat).
- Navigation is simple state in `App.js` (`home | lesson | conversation`). Move to a router
  (Expo Router / React Navigation) when it grows.

## 6. Tech stack
- **Expo (React Native)**, **pinned to SDK 54** — the owner's App Store **Expo Go only
  supports ≤ 54** (SDK 56 showed "incompatible"). Do not bump the SDK without re-checking.
- **expo-speech** — on-device Swedish TTS (tap-to-hear pronunciation).
- **AI backend:** a **Cloudflare Worker** (`worker/`) that proxies to **Claude Opus 4.8**.
- State is in-memory for now (no DB). Progress persistence (AsyncStorage) is a TODO.

## 7. AI architecture
- The app **never holds the Anthropic API key.** It calls the **Cloudflare Worker**, which
  holds the key and calls Claude.
- The Worker builds a **level-aware system prompt** (CEFR level + the learner's unlocked
  vocab/grammar) and returns **structured JSON** the app renders directly.
- **Default model: Claude Opus 4.8** (`claude-opus-4-8`). Owner chose Opus everywhere; Haiku
  is a cost option for later (owner's decision, not a silent default).
- First AI feature shipped: **Conversation partner**. Planned (same backend, different prompt
  persona): sentence checker, grammar tutor, infinite practice.
- Code: `worker/src/index.ts` (backend) and `src/api/chat.js` + `src/aiConfig.js` (app).

## 8. Dev & deploy workflow — IMPORTANT (owner is behind a locked corporate VPN)
The owner's machine is behind **Palo Alto GlobalProtect** (always-on, full-tunnel) — so
Expo Go over LAN/tunnel does **not** work. Everything must be HTTPS-to-cloud or localhost.
- **Local dev loop:** `npx expo start --web` (web preview at `localhost:8081`) **+**
  `npm --prefix worker run dev` (Worker at `localhost:8787`). All localhost → VPN-safe.
- **On the iPhone:** via **EAS Build → TestFlight** (cloud build; HTTPS to Apple/Expo →
  VPN-safe).
  - **JS / content changes** → `eas update` (OTA, lands in ~30–60s, no rebuild).
  - **New native modules / app-version bumps** → full `eas build` + `eas submit`
    (~15 min, batch these).
- Backend goes live with `wrangler deploy`; then swap `src/aiConfig.js` `BACKEND_URL` to the
  deployed `*.workers.dev` URL and set prod secrets with `wrangler secret put`.

## 9. Credentials & secrets (where they live — never in the app/git)
- **Anthropic API key** — `worker/.dev.vars` (local, git-ignored) + a Cloudflare Worker
  secret (prod). Never in the app or git.
- **APP_SECRET** = `svenska-kr-2026` — a weak shared gate the app sends as `x-app-secret`.
  It ships in the app (not truly secret). Real per-user auth is a TODO.
- **Expo/EAS:** project `@kamra34/swedish-app`; iOS bundle id `com.nosrati.svenska`.
- **Apple:** App Store Connect app id `6783824683`; distribution via an App Store Connect
  **API key** at `~/Downloads/AuthKey_F8SR492WR6.p8` (git-ignored) — see `eas.json`.
- Per-session tokens (Expo token, Cloudflare token, etc.) are provided by the owner, are
  revocable, and are not stored in git.

## 10. Repo layout
- `App.js`, `src/` — the Expo app (`screens/`, `components/`, `data/`, `api/`).
- `worker/` — the Cloudflare Worker AI backend (git-ignored: `.dev.vars`, `node_modules/`).
- `eas.json`, `app.json` — build & runtime config.
- `PROJECT.md` (this), `CLAUDE.md`, `AGENTS.md` — docs.

## 11. Status & roadmap
**Done:** A1 Lesson 1 (greetings, en/ett intro, word order) + Sentence Builder game •
tap-to-hear pronunciation • app on the iPhone via TestFlight • AI Conversation partner
(working locally) • this documentation.

**Next:** see §12 — the product is evolving into a coached school with accounts.

---

## 12. Product direction — decided 2026-06-25
Evolving from "app + AI chat" into a **structured Swedish school**:
- **Coaches hub:** the home becomes a hub of specialized AI coaches — 🗣️ **Talking** (continuous
  voice), 📖 **Grammar**, 🎧 **Listening** (passage → questions → score), 📚 **Reading**. The existing
  lessons/games are one track too. (Coaches can get names/characters when we polish.)
- **Accounts + DB → Supabase (all-in):** auth + Postgres + **Edge Functions** for the Claude calls
  (decided to consolidate — migrate the Cloudflare Worker logic into a Supabase Edge Function). The
  app uses the **anon** key; the **service_role** key + the **Anthropic key** stay server-side (Edge
  Function secrets / env).
- **Levels & certification:** an **Examiner** coach runs a **placement test** (sets start level) and
  **level exams** (listening / reading / grammar / speaking, AI-graded). Pass → **certificate** →
  unlock the next level (A1→C1). Speaking is graded via transcript + rubric (approximate; refine later).
- **Voice goal — full real-time, phone-call style** (owner's choice). Pipeline = mic → speech-to-text
  → Claude → text-to-speech → auto-listen. Claude is text-only (no native voice mode), so we BUILD UP
  TO full-duplex in stages: a solid push-to-talk auto-loop first, then add interruption/barge-in.
  Best on the native iPhone; browser for dev.
- **Data model (planned):** `profiles` (level, name), `progress` (lessons/exercises + scores),
  `vocab_srs` (review state), `exam_attempts` (per-skill scores, pass/fail), `certificates`.

**Phased build:**
1. **Foundation** — Supabase accounts + DB + the coaches hub + persisted progress/level. *(current)*
2. **Full real-time voice** for the Talking coach (auto-loop → barge-in).
3. **Listening coach.**  4. **Grammar coach.**  5. **Examiner** (placement + level exams + certificates
   + level unlocking).  Ongoing: more lessons, SRS, and visual polish.
