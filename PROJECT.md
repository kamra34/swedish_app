# Svenska — Project Overview & Decisions

A living high-level reference so any new coding session (or collaborator) can pick up
where we left off. For day-to-day Claude Code guidance, see `CLAUDE.md`.

> **🆕 New session? Read §13 (CURRENT STATE) first** — it's the authoritative snapshot of
> what's built, how to run it, and what to do next. §§1–12 are the background and decisions.

---

## 1. What we're building
An interactive **iOS app to learn Swedish**, CEFR **A1 → C1**, that teaches grammar +
vocabulary so the learner can build *real* sentences — via bite-size lessons, word games,
reading, and a team of AI coaches. Built for one learner (the owner) first, with App Store
potential later. The owner is a **non-coder product owner**; Claude builds and explains in
plain language.

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
- **Reading** modeled on easy-Swedish sources (*8 Sidor*, *lättläst*) — original graded texts.

## 4. App structure
- **Levels** A1–C1 → **modules** → **lessons**. A lesson = one loop (see §2).
- Content lives as **data** in `src/data/courseData.js` (each lesson: grammar note, vocab,
  sentence-builder items). Adding lessons = adding data, no UI changes.
- **Games:** *Sentence Builder* (tap words into the right order — teaches Swedish V2 word
  order) is the core. Planned: en/ett gender sort, ending match, conjugation, cloze, listening.
- **Spaced repetition (SRS)** for vocabulary — planned (FSRS algorithm).
- **Progress persists** to the account (Railway DB) — completed lessons + level.

## 5. Screens (current)
- `AuthScreen` — email + password **login / sign-up**. The whole app is gated behind it.
- `HubScreen` — the **coaches hub** (home): greeting + level + sign-out; coaches (🗣️ Talking
  active; Grammar / Listening / Reading "coming soon"); and the A1 **lessons** with ✓ from the DB.
- `LessonScreen` — steps: grammar note → vocabulary → Sentence Builder rounds → done.
  Tap-to-hear 🔊 on words, examples, and solved sentences.
- `ConversationScreen` — the **Talking coach**: scene picker (**Free talk / Småprat**,
  **Make-your-own**, **Saved**, **Suggested**) + chat (level-aware **and scene-aware** structured
  reply with English + gentle correction), 🔊 pronunciation, 🎤 voice input (**on-device STT on the
  phone** via expo-speech-recognition; browser SpeechRecognition on web; typing always works), and a
  ⭐ Save-scene button.
- Navigation is simple state in `App.js` (`home | lesson | conversation`) inside `AuthProvider`.
  Move to a router (Expo Router / React Navigation) when it grows.

## 6. Tech stack
- **Expo (React Native)**, **pinned to SDK 54** — the owner's App Store **Expo Go only
  supports ≤ 54** (SDK 56 showed "incompatible"). Do not bump the SDK without re-checking.
- **Native modules added** (each needs a fresh `eas build` to reach the iPhone): `expo-speech`
  (Swedish TTS), `@react-native-async-storage/async-storage` (auth token), `expo-audio`
  (`setAudioModeAsync({ playsInSilentMode: true })` so TTS plays with the iPhone mute switch on),
  `expo-speech-recognition` (on-device Swedish speech-to-text for the mic).
- **Backend = `server/`** — a Node/**Express** API on **Railway** + **Railway Postgres**, calling
  **Claude Opus 4.8**. (The old `worker/` Cloudflare folder is **legacy/unused** — see §7.)
- **Accounts:** email + password, JWT. State + progress live in the DB.

## 7. AI / backend architecture
- The app **never holds the Anthropic API key.** It calls the **Railway Node API** (`server/`),
  which holds the key + DB creds and calls Claude. The app talks to it over **HTTPS only**.
- Auth: **email + password** → bcrypt-hashed, JWT (60-day). The app sends `Authorization: Bearer`.
- The API builds a **level-aware system prompt** (CEFR level + the learner's unlocked
  vocab/grammar) and returns **structured JSON** the app renders directly.
- **Default model: Claude Opus 4.8** (`claude-opus-4-8`). Owner chose Opus everywhere; Haiku is a
  cost option for later (owner's decision, not a silent default).
- **Endpoints** (all except `/auth/*` need a Bearer JWT): `POST /auth/signup`, `POST /auth/login`,
  `GET /me`, `POST /progress`, `POST /level`, `POST /chat`, `POST /scenes` (topic-driven),
  `POST /scene/custom`, `GET /scenes/saved`, `POST /scenes/saved`, `DELETE /scenes/saved/:id`.
- **DB tables** (auto-created on boot by `server/src/db.js`): `users`, `progress`, `saved_scenes`.
- Code: `server/src/{index,db,claude}.js` (backend); `src/api/chat.js` + `src/aiConfig.js` +
  `src/AuthContext.js` (app). `worker/` is legacy — ignore it.

## 8. Dev & deploy workflow — IMPORTANT (owner is behind a locked corporate VPN)
The owner's machine is behind **Palo Alto GlobalProtect** (always-on, full-tunnel) — so
Expo Go over LAN/tunnel does **not** work. Everything must be HTTPS-to-cloud or localhost.
- **Local dev loop (two servers, both needed for the AI):**
  - `npx expo start --web` → app at `http://localhost:8081`
  - `npm --prefix server start` → API at `http://localhost:8787` (reads `server/.env`; **plain
    Node — restart it after editing `server/` code**, it does not auto-reload)
  - The local API connects to **Railway Postgres over its public proxy** (reachable through the VPN).
- **On the iPhone:** via **EAS Build → TestFlight** (cloud build; HTTPS to Apple/Expo → VPN-safe).
  - **JS / content changes** → `eas update` (OTA, no rebuild).
  - **New native modules / version bumps** → full `eas build` + `eas submit` (~15 min, batch these).
- **Backend goes live** by deploying `server/` to Railway (`railway up` with the `svenska-cli`
  token), setting its env vars (use the **internal** `DATABASE_URL`, plus `ANTHROPIC_API_KEY`,
  `JWT_SECRET`), then pointing `src/aiConfig.js` `BACKEND_URL` at the public Railway URL.

## 9. Credentials & secrets (where they live — never in the app/git)
- **`server/.env`** (git-ignored, local dev): `DATABASE_URL` (the **public** Railway proxy),
  `ANTHROPIC_API_KEY`, `JWT_SECRET`, `PORT`. On Railway (prod) set the same as service env vars
  but with the **internal** `DATABASE_URL`.
- **Railway:** project **"Svenska"** + a Postgres DB. A `svenska-cli` account token exists for CLI
  deploy. (Token + DB URL are secret — never in git.)
- **Expo/EAS:** project `@kamra34/swedish-app`; iOS bundle id `com.nosrati.svenska`.
- **Apple:** App Store Connect app id `6783824683`; distribution via an App Store Connect **API key**
  at `~/Downloads/AuthKey_F8SR492WR6.p8` (git-ignored) — see `eas.json`.
- Per-session tokens (Expo token, Railway token, etc.) are provided by the owner, revocable, not in git.
- **Test account:** `test@example.com` / `test1234`.

## 10. Repo layout
- `App.js`, `src/` — the Expo app (`screens/`, `components/`, `data/`, `api/`, `AuthContext.js`, `storage.js`).
- `server/` — the **Railway Node API** (git-ignored: `.env`, `node_modules/`). **This is the live backend.**
- `worker/` — **legacy** Cloudflare Worker (no longer used; safe to delete).
- `eas.json`, `app.json` — build & runtime config.
- `PROJECT.md` (this), `CLAUDE.md`, `AGENTS.md` — docs.

## 11. Status & roadmap
**Done:** **A1 lessons 1–6** (Rivstart sequence: greetings → countries/languages → en/ett → definite →
plural/numbers → family; native-Swedish-verified) + Sentence Builder game • **hands-free real-time voice
(call mode)** • tap-to-hear pronunciation • **accounts (email+password)
+ Railway Postgres + Node API** • **coaches hub** • Talking coach with **generated/custom/saved
scenes**, voice input, and gentle corrections • **progress synced to the account** • **backend
deployed live to Railway** (`svenska-api`) • **current app shipped to TestFlight** (v1.0.0 build 2,
2026-06-25) • this documentation.

**Next:** see §12 and §13.

---

## 12. Product direction — decided 2026-06-25
Evolving from "app + AI chat" into a **structured Swedish school**:
- **Coaches hub:** the home is a hub of specialized AI coaches — 🗣️ **Talking** (continuous
  voice), 📖 **Grammar**, 🎧 **Listening** (passage → questions → score), 📚 **Reading**. The lessons/
  games are one track too. (Coaches can get names/characters when we polish.)
- **Accounts + DB → Railway (all-in):** Railway Postgres + a Node/Express API (auth, progress,
  Claude proxy). The app talks to it over HTTPS only. **Login = email + password** (JWT).
- **Levels & certification:** an **Examiner** coach runs a **placement test** (sets start level) and
  **level exams** (listening / reading / grammar / speaking, AI-graded). Pass → **certificate** →
  unlock the next level (A1→C1). Speaking is graded via transcript + rubric (approximate; refine later).
- **Login methods:** email+password now; **Google** (free OAuth) + **Sign in with Apple** (required by
  the App Store if Google is offered; also free) to be added later.
- **Voice goal — full real-time, phone-call style** (owner's choice). Pipeline = mic → speech-to-text
  → Claude → text-to-speech → auto-listen. Claude is text-only (no native voice mode), so BUILD UP TO
  full-duplex in stages: a solid push-to-talk auto-loop first, then interruption/barge-in. Best on the
  native iPhone; browser for dev.
- **Data model (planned beyond current):** `vocab_srs` (review state), `exam_attempts` (per-skill
  scores, pass/fail), `certificates`. (Current tables: `users`, `progress`, `saved_scenes`.)

**Phased build:**
1. **Foundation** — Railway accounts + DB + the coaches hub + persisted progress/level. **✅ DONE.**
2. **Full real-time voice** for the Talking coach — **✅ V1 auto-loop DONE** (hands-free "call mode":
   listen→reply→speak→auto-listen, shipped OTA). **Next: interruption / barge-in** (let the user cut in
   while the AI is speaking).
3. **Listening coach.**  4. **Grammar coach.**  5. **Examiner** (placement + level exams + certificates
   + level unlocking).  Ongoing: more lessons, SRS, visual polish (deferred on purpose).

---

## 13. CURRENT STATE — read this first to continue (updated 2026-06-25)

**What works (end-to-end, live):** accounts, the coaches hub, **six A1 lessons** (a1-1…a1-6, greetings→
family — Rivstart sequence, native-verified; a1-7/a1-8 are locked "coming next" stubs) with saved
progress, and the Talking coach — **scene-aware + free-talk** chat (level-aware, English + gentle
correction; its known vocab now tracks **completed** lessons), Swedish TTS
(plays even on silent), **on-device voice input**, and **hands-free "call mode"** (continuous
listen→reply→speak→auto-listen) — all backed by the deployed Railway API. **Latest native TestFlight build:
`1.1.0 (3)`** (launches; verified VALID); **call mode shipped on top via OTA** (runtime 1.1.0, commit
`109495b`) — reopen the app twice to get the newest JS.

**Run it locally:**
```
npx expo start --web          # app → http://localhost:8081  (talks to the LIVE Railway API by default)
npm --prefix server start     # API → http://localhost:8787  (ONLY if changing the backend; then flip
                              #   src/aiConfig.js BACKEND_URL to LOCAL and RESTART node after each edit)
```
Log in with **test@example.com / test1234**, or sign up.

**Backend is the Railway Node API in `server/` — now DEPLOYED & LIVE** at
**`https://svenska-api-production.up.railway.app`** (Railway project "Svenska", service
**`svenska-api`**, `production` env). Postgres is reached internally via the reference var
`DATABASE_URL = ${{Postgres.DATABASE_URL}}`. `worker/` (Cloudflare) is **legacy/unused**.
Secrets: git-ignored `server/.env` (local dev) **and** Railway service env vars (prod) —
`ANTHROPIC_API_KEY`, `JWT_SECRET`, `DATABASE_URL`. **Redeploy the backend** with
`cd server && railway up --service svenska-api -c` (needs a Railway **project** token in git-ignored
`deploy.env` as `RAILWAY_TOKEN`; the CLI rejects *account* tokens — only project tokens/`railway login` work).

**Getting the current app on the iPhone — status (2026-06-25):**
1. ✅ **Backend deployed to Railway** (live URL above; `/`, `/auth/login`, `/chat` all verified in prod).
2. ✅ **App pointed at it:** `src/aiConfig.js` `BACKEND_URL` → the Railway URL (commit `ecfe3f4`);
   iOS `buildNumber` bumped 1→2.
3. ✅ **iOS rebuilt + submitted to TestFlight (2026-06-25):** `eas build -p ios --profile production
   --auto-submit` built **v1.0.0 (build 2)** and uploaded it to App Store Connect (build id
   `88689880`). After Apple finishes processing (~5–10 min), install it via TestFlight:
   https://appstoreconnect.apple.com/apps/6783824683/testflight/ios . Build needs an Expo token in
   `deploy.env` as `EXPO_TOKEN`, and **run eas with `CI=1`** (its startup check otherwise hangs behind
   the VPN). JS/content-only changes after this → `eas update` (OTA, no full rebuild); native/version
   changes → another `eas build` + bump `buildNumber`.

**On-device feedback round #1 (2026-06-25)** — after installing build 2, the owner reported 4 things:
1. **No sound when the phone is on silent** → `expo-audio` `setAudioModeAsync({ playsInSilentMode: true })`
   in `App.js`. Native → ships in **build 1.1.0** (below).
2. **Mic didn't work on the phone** → native voice never actually ran on iOS (browser STT is web-only).
   Added real on-device STT (`expo-speech-recognition`, `sv-SE`) in `ConversationScreen`; web keeps the
   browser path. Native → **build 1.1.0**.
3. **Keyboard hid the chat** → FIRST tried scroll-to-end on `keyboardWillShow` (OTA) — insufficient.
   Real root cause (found via review): RN `KeyboardAvoidingView` mis-measures the notch top inset inside
   the legacy `SafeAreaView`, so the input bar was clipped. Proper fix in **build 1.1.0(2)**: replaced KAV
   with direct keyboard-frame padding (`keyboardWillChangeFrame`/`Show`/`Hide` → `paddingBottom`) + pin via
   `onContentSizeChange`.
4. ✅ **Replies ignored the scene / wanted free chat** → rewrote the backend chat prompt (scene-rooted
   from turn 1, no default "jag heter"; added open small-talk mode) + a **Free talk / Småprat** card.
   Backend redeployed; app shipped **OTA**.

OTA for #4 is on branch `production` at runtime **1.0.0** (reaches build 2). Native fixes (#1, #2) + the
real keyboard fix (#3) ride in the **1.1.0** build line (version bumped so `runtimeVersion` segregates OTAs:
a voice-using update can never reach a build without the module). Build with
`eas build -p ios --profile production --auto-submit`.

**Build history:** `1.0.0(2)` = first full app on TestFlight. `1.1.0(1)` = **rejected by Apple** (90683:
missing `NSPhotoLibraryUsageDescription` — a linked media module references Photos). `1.1.0(2)` = added
the photo string + real keyboard fix + review fixes (mic `startingRef` guard; `isGeneral = !scene`) — but
**crashed on launch.** `1.1.0(3)` = **current.** Fixes the crash + carries everything.

⚠️ **The 1.1.0(2) launch crash — IMPORTANT lesson:** `expo-audio@1.1.1` declares `expo-asset: "*"` as a
peer dep, so npm pulled the **latest `expo-asset@56` + `expo-constants@56` (SDK 56)** to the top level,
duplicated against the SDK-54 versions. Two copies of `expo-constants` (loaded at app init) → instant
crash on open. Fix: `npx expo install expo-asset expo-constants` (pins SDK-54 `12.0.13`/`18.0.13`) +
`npm dedupe`. **After adding ANY native module, run `npx expo-doctor` — it catches duplicate/wrong-SDK
native modules that a JS bundle check never will.** Install **1.1.0(3)** to get everything (voice,
silent-mode audio, keyboard, scene-aware, free-talk).

**Immediate next options (owner picks):** ① ~~deploy to Railway + rebuild~~ ✅ **DONE** • ② ~~Phase-2
real-time voice (auto-loop)~~ ✅ **DONE** → next is **barge-in** (interrupt the AI mid-speech) • ③ next
coach (Listening / Grammar / Reading) • ④ Examiner (placement + level exams + certificates) • ⑤ more A1
lessons • ⑥ SRS. Visual polish is intentionally deferred.

**Conventions:** commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
Never put secrets in the app or git. Don't bump the Expo SDK off 54. The owner is a non-coder — build
and explain plainly; do the credential/setup steps for them where possible.
