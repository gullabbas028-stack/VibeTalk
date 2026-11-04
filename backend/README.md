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
allow members to join the `default` call type. Browser camera and microphone
access requires HTTPS in production (localhost is allowed for development).
Users can start audio or video calls with existing connections; the recipient
can answer or decline while signed in to the app. Call signaling and media are
handled by Stream Video over WebRTC; the caller receives an in-app notification
when the recipient rejects or misses a call.

Chat attachments are uploaded to Stream's CDN. The app allows images,
documents, and common audio/video files up to 25 MB; configure the Stream Chat
upload limit to at least 25 MB in the Stream dashboard.
