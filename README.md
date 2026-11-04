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

Email notifications are optional. To enable them, also set `RESEND_API_KEY` and
`RESEND_FROM_EMAIL`.
