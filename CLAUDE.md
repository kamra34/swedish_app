# Svenska — Swedish learning app

**Read `PROJECT.md` first — especially §13 (CURRENT STATE).** It has the vision, the curriculum
(Rivstart sequence + Swedish Kelly list, CEFR A1→C1), the architecture, and the roadmap.

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
  the app's `src/aiConfig.js` `BACKEND_URL` points at it. **Latest TestFlight build: `1.1.0 (2)`**
  (on-device voice + silent-mode audio + keyboard fix; confirm its Apple processing is VALID). Note:
  adding native modules needs a **`version` bump** (runtimeVersion) so OTAs stay segregated by build.
- JS/content only → `eas update` (OTA, no rebuild). New native module / version bump → bump `buildNumber`
  in `app.json`, then `eas build -p ios --profile production --auto-submit`.
- **Both CLIs need a token in git-ignored `deploy.env`** (`RAILWAY_TOKEN` = a Railway **project** token —
  account tokens are rejected; `EXPO_TOKEN`) and **`CI=1`** set (eas-cli's startup check hangs behind the VPN).
- **Redeploy the backend:** `cd server && railway up --service svenska-api -c` (env vars live as Railway
  service vars: `ANTHROPIC_API_KEY`, `JWT_SECRET`, `DATABASE_URL=${{Postgres.DATABASE_URL}}`).

## Don't
- Don't put the Anthropic key (or any secret) in the app or git. Secrets live in `server/.env`
  (git-ignored) and Railway env vars.
- Don't copy Rivstart content — sequence blueprint only; author original content.

@AGENTS.md
