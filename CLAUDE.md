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
- JS/content only → `eas update` (OTA). New native module / version bump → `eas build` + `eas submit`.
- The TestFlight build is **stale** (early A1 lesson only). Getting the current app on the phone needs:
  deploy `server/` to Railway, point `src/aiConfig.js` `BACKEND_URL` at it, then `eas build` + `eas submit`.

## Don't
- Don't put the Anthropic key (or any secret) in the app or git. Secrets live in `server/.env`
  (git-ignored) and Railway env vars.
- Don't copy Rivstart content — sequence blueprint only; author original content.

@AGENTS.md
