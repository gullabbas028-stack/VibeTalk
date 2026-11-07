# Backend

## Notification email delivery

In-app notifications work without additional provider configuration. To enable
email delivery through Resend, configure these variables in the backend
environment:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (a sender address verified with Resend)

Email delivery attempts are recorded on each notification and retried
automatically for transient provider or network failures. Failed messages can
also be retried from notification history. SMS delivery is currently
unavailable; its preference control stays disabled until an SMS provider is
configured.

## Audio/video calls and chat files

Calls and chat uploads use the existing Stream app credentials
(`STREAM_API_KEY` and `STREAM_API_SECRET`). Enable Stream Video for that app and
allow members to join the `default` call type. The backend returns user-scoped
tokens from the authenticated `/api/chat/token` endpoint. Keep
`STREAM_API_SECRET` backend-only; do not put it in a frontend environment
variable. Browser camera, microphone, and screen capture require HTTPS in
production (localhost is allowed for development).

Call signaling, WebRTC negotiation, TURN relay, media delivery, reconnects,
and adaptive media quality are managed by Stream Video. The Vercel Express
function only issues credentials and serves API requests; it does not host a
persistent signaling socket. Set `CLIENT_URL` to a comma-separated list of
allowed browser origins only when the frontend calls the backend cross-origin.
The same-origin `/api` Vercel rewrite does not require CORS configuration.
`CRIENT_URL` is still accepted as a legacy alias.

Users can start audio or video calls with existing connections; the recipient
can answer or decline while signed in. Call participants publish microphone
and (for video calls) camera tracks after joining. Use the in-call controls to
mute, disable video, or share/stop sharing a screen; the SDK restores camera
video when screen sharing ends.

Chat attachments are uploaded to Stream's CDN. The app allows images,
documents, and common audio/video files up to 25 MB; configure the Stream Chat
upload limit to at least 25 MB in the Stream dashboard.
