# Svenska — Swedish learning app

**Read `PROJECT.md` first.** It has the vision, the curriculum we follow (Rivstart chapter
sequence + Swedish Kelly word list, CEFR A1→C1), the architecture, and the roadmap.

## Quick facts
- **Expo (React Native), pinned to SDK 54** — do NOT bump it (the owner's App Store Expo Go
  only supports ≤ 54).
- **AI backend** lives in `worker/` = a Cloudflare Worker → Claude Opus 4.8. The app NEVER
  holds the API key.
- The owner is a **non-coder behind an always-on corporate VPN** → develop in the **web
  preview**, ship to the iPhone via **EAS Build / TestFlight**. (PROJECT.md §8.)
- Content is data in `src/data/courseData.js`; conversation scenes/personas drive the AI.

## Run locally
- App (web preview): `npx expo start --web`  → http://localhost:8081
- AI backend:        `npm --prefix worker run dev`  → http://localhost:8787
  (reads `worker/.dev.vars`; both servers must run for the AI chat to work locally)

## Ship changes to the iPhone
- JS/content only → `eas update` (OTA). New native module / version bump → `eas build` + `eas submit`.

## Don't
- Don't put the Anthropic API key (or any secret) in the app or in git. Secrets live in
  `worker/.dev.vars` (git-ignored) and Cloudflare Worker secrets.
- Don't copy Rivstart content — it's a sequence blueprint only; author original content.

@AGENTS.md
