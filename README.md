# VibeTalk

## Deploying on Vercel

The root `vercel.json` configures two services on one Vercel project:

- The `backend` Express service receives public requests under `/api/`.
- The `vite-project` frontend service receives all other public paths.

The frontend already uses the same-origin `/api` path in production, so no
service binding is needed: browser API requests enter through the public
rewrite to the backend.

Configure these environment variables in the Vercel project before deploying:

- `MONGO_URI`
- `JWT_SECRET`
- `STREAM_API_KEY`
- `STREAM_API_SECRET`
- `CLIENT_URL` (optional; comma-separated origins for cross-origin clients)

Email notifications are optional. To enable them, also set `RESEND_API_KEY` and
`RESEND_FROM_EMAIL`.

Calls use Stream Video's managed WebRTC signaling, media servers, TURN relay,
and adaptive quality. Keep `STREAM_API_SECRET` only in the backend environment;
the browser receives the public Stream API key and a user-scoped token from the
authenticated `/api/chat/token` endpoint. No custom TURN credentials or
persistent WebSocket server are needed for this architecture.
