// Where the app talks to the Claude-powered backend (the Cloudflare Worker).
//
// LOCAL DEV: the worker runs on your computer via `wrangler dev` at port 8787,
// so the web preview (also on your computer) can reach it.
// ON THE iPHONE: localhost won't work — after we deploy the worker we swap
// BACKEND_URL to the public https://svenska-ai.<your>.workers.dev URL.
export const BACKEND_URL = 'http://localhost:8787';

// A weak shared gate so random people who find the URL can't burn your credits.
// (It ships in the app, so it's not truly secret — real per-user auth comes later.)
export const APP_SECRET = 'svenska-kr-2026';
