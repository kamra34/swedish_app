// Where the app talks to its backend API (the Railway Node service).
// LOCAL DEV: the API runs at localhost:8787 (see server/).
// ON THE iPHONE: after we deploy to Railway, swap this to the public
// https://<service>.up.railway.app URL.
export const BACKEND_URL = 'http://localhost:8787';
