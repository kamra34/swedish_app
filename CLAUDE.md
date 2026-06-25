# Svenska — Swedish learning app

**Read `PROJECT.md` first — especially §13 (CURRENT STATE), which has the ▶ NEXT STEP.** Then §14 (the
AI practice engine) and §15 (the teacher-led course system). The vision, curriculum (Rivstart + Kelly,
A1→C1), and roadmap live there.

> **▶ NEXT STEP:** author the full A1 teacher-led course — the 51 remaining sessions from
> `src/data/curriculum/a1/A1_SESSION_MAP.md` (template `a1-s11.js`; register in `index.js`; native-Swedish
> verify each; ships OTA). The session SYSTEM is built + live on `a1-s11`; this is the content build-out.

## Quick facts
- **Expo (React Native), pinned to SDK 54** — do NOT bump it (the owner's App Store Expo Go only
  supports ≤ 54).
- **Backend = `server/`** (Node/Express) → **Railway Postgres** + **Claude Opus 4.8**. The app NEVER
  holds the API key. The old `worker/` (Cloudflare) folder is **legacy/unused**.
- **Accounts:** email + password (JWT). The app is gated behind login.
- Owner is a **non-coder behind an always-on corporate VPN** → develop in the **web preview**; ship to
  the iPhone via **EAS Build / TestFlight** (PROJECT.md §8). Build & explain plainly.

## Run locally (both needed for the AI to work)
- App (web preview): `npx expo start --web`  → http://localhost:8081
- API: `npm --prefix server start`  → http://localhost:8787
  (reads git-ignored `server/.env`; plain Node — **restart it after editing `server/` code**)
- Test account: `test@example.com` / `test1234`.

## Ship changes to the iPhone
- **Backend is LIVE** at `https://svenska-api-production.up.railway.app` (Railway service `svenska-api`);
  the app's `src/aiConfig.js` `BACKEND_URL` points at it. **Latest TestFlight build: `1.1.0 (3)`**
  (on-device voice + silent-mode audio + keyboard fix; confirm its Apple processing is VALID). Note:
  adding native modules needs a **`version` bump** (runtimeVersion) so OTAs stay segregated by build.
- JS/content only → `eas update` (OTA, no rebuild). New native module / version bump → bump `buildNumber`
  in `app.json`, then `eas build -p ios --profile production --auto-submit`.
- **After adding ANY native module, run `npx expo-doctor` BEFORE building.** A JS bundle check passes even
  when native deps are wrong. 1.1.0(2) crashed on launch because `expo-audio`'s `expo-asset: "*"` peer dep
  let npm install SDK-56 `expo-asset`/`expo-constants` next to the SDK-54 ones. Fix was
  `npx expo install <pkg>` to pin SDK-54 versions + `npm dedupe`.
- **Both CLIs need a token in git-ignored `deploy.env`** (`RAILWAY_TOKEN` = a Railway **project** token —
  account tokens are rejected; `EXPO_TOKEN`) and **`CI=1`** set (eas-cli's startup check hangs behind the VPN).
- **Redeploy the backend:** `cd server && railway up --service svenska-api -c` (env vars live as Railway
  service vars: `ANTHROPIC_API_KEY`, `JWT_SECRET`, `DATABASE_URL=${{Postgres.DATABASE_URL}}`).

## Don't
- Don't put the Anthropic key (or any secret) in the app or git. Secrets live in `server/.env`
  (git-ignored) and Railway env vars.
- Don't copy Rivstart content — sequence blueprint only; author original content.

@AGENTS.md
