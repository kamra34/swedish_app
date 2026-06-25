// Where the app talks to its backend API (the Railway Node service).
//
// Default = the LIVE Railway service. This works on the iPhone *and* in the web
// preview, so you don't need to run the local server just to use the app.
//
// Developing the backend itself? Start it with `npm --prefix server start`, then
// change the export below from RAILWAY to LOCAL to hit your local API instead.
// (Both talk to the same Railway Postgres, so there's only ever one database.)
const RAILWAY = 'https://svenska-api-production.up.railway.app';
const LOCAL = 'http://localhost:8787';

export const BACKEND_URL = RAILWAY;
