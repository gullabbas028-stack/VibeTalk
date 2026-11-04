import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const notificationCategories = {
  friend_request: "friendRequests",
  friend_request_accepted: "acceptedRequests",
  new_message: "messages",
  account_update: "accountUpdates",
  promotional_offer: "promotions",
  system_alert: "accountUpdates",
  event_reminder: "events",
};

const defaultPreferences = {
  channels: { inApp: true, email: true, sms: false },
  types: {
    friendRequests: { inApp: true, email: true, sms: false },
    acceptedRequests: { inApp: true, email: true, sms: false },
    messages: { inApp: true, email: true, sms: false },
    accountUpdates: { inApp: true, email: true, sms: false },
    promotions: { inApp: false, email: false, sms: false },
    events: { inApp: true, email: true, sms: false },
  },
};

export const normalizeNotificationPreferences = (preferences) => {
  const stored = preferences?.toObject?.() ?? preferences ?? {};
  return {
    channels: {
      inApp: stored.channels?.inApp ?? defaultPreferences.channels.inApp,
      email: stored.channels?.email ?? defaultPreferences.channels.email,
      sms: false,
    },
    types: Object.fromEntries(
      Object.entries(defaultPreferences.types).map(([type, defaults]) => {
        const storedType = stored.types?.[type];
        return [
          type,
          {
            inApp:
              typeof storedType === "boolean"
                ? storedType
                : storedType?.inApp ?? defaults.inApp,
            email:
              typeof storedType === "boolean"
                ? storedType
                : storedType?.email ?? defaults.email,
            sms: false,
          },
        ];
      }),
    ),
  };
};

export const isEmailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

const processEmailNotification = async (notificationId) => {
  if (!isEmailConfigured()) {
    await Notification.updateOne(
      { _id: notificationId, "channels.email.status": "pending" },
      {
        $set: {
          "channels.email.status": "not_configured",
          "channels.email.error": "Email delivery is not configured",
        },
      },
    );
    return;
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      "channels.email.status": "pending",
      "channels.email.attempts": { $lt: 3 },
      $or: [
        { "channels.email.nextAttemptAt": null },
        { "channels.email.nextAttemptAt": { $lte: new Date() } },
      ],
    },
    {
      $set: {
        "channels.email.status": "sending",
        "channels.email.error": "",
        "channels.email.nextAttemptAt": null,
      },
      $inc: { "channels.email.attempts": 1 },
    },
    { new: true },
  ).populate("recipient", "email notificationPreferences");

  if (!notification) return;

  const category = notificationCategories[notification.type];
  const preferences = normalizeNotificationPreferences(
    notification.recipient.notificationPreferences,
  );
  if (
    !preferences.channels.email ||
    !preferences.types[category]?.email
  ) {
    await Notification.updateOne(
      { _id: notification._id, "channels.email.status": "sending" },
      {
        $set: {
          "channels.email.status": "not_requested",
          "channels.email.error": "",
          "channels.email.nextAttemptAt": null,
        },
      },
    );
    return;
  }

  const attempt = notification.channels.email.attempts;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 10_000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [notification.recipient.email],
        subject: notification.title,
        text: notification.message,
      }),
      signal: abortController.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      const shouldRetry = retryable && attempt < 3;
      await Notification.updateOne(
        { _id: notification._id, "channels.email.status": "sending" },
        {
          $set: {
            "channels.email.status": shouldRetry ? "pending" : "failed",
            "channels.email.error": `Email provider returned HTTP ${response.status}`,
            "channels.email.nextAttemptAt": shouldRetry
              ? new Date(Date.now() + 15_000 * attempt)
              : null,
          },
        },
      );
      return;
    }

    await Notification.updateOne(
      { _id: notification._id, "channels.email.status": "sending" },
      {
        $set: {
          "channels.email.status": "sent",
          "channels.email.error": "",
          "channels.email.sentAt": new Date(),
          "channels.email.nextAttemptAt": null,
        },
      },
    );
  } catch (error) {
    clearTimeout(timeout);
    console.error("Email notification delivery failed:", error);
    const shouldRetry = attempt < 3;
    await Notification.updateOne(
      { _id: notification._id, "channels.email.status": "sending" },
      {
        $set: {
          "channels.email.status": shouldRetry ? "pending" : "failed",
          "channels.email.error": "Email delivery could not reach the provider",
          "channels.email.nextAttemptAt": shouldRetry
            ? new Date(Date.now() + 15_000 * attempt)
            : null,
        },
      },
    );
  }
};

const scheduleEmailDelivery = (notificationId) => {
  if (process.env.VERCEL) return;
  setImmediate(() => {
    processEmailNotification(notificationId).catch((error) => {
      console.error("Could not process email notification:", error);
    });
  });
};

export const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  actor,
  link = "",
}) => {
  const recipient = await User.findById(recipientId).select(
    "email fullName notificationPreferences",
  );
  if (!recipient) {
    throw new Error("Notification recipient was not found");
  }

  const preferences = normalizeNotificationPreferences(
    recipient.notificationPreferences,
  );
  const category = notificationCategories[type];
  if (!category) throw new Error(`Unsupported notification type: ${type}`);

  const wantsInApp =
    preferences.channels.inApp && preferences.types[category].inApp;
  const wantsEmail =
    preferences.channels.email && preferences.types[category].email;
  if (!wantsInApp && !wantsEmail) return null;

  const emailStatus = !wantsEmail
    ? "not_requested"
    : isEmailConfigured()
      ? "pending"
      : "not_configured";

  const notification = await Notification.create({
    recipient: recipient._id,
    type,
    title,
    message,
    actor: actor
      ? {
          id: actor._id,
          name: actor.fullName || "",
          image: actor.image || "",
        }
      : undefined,
    link,
    channels: {
      inApp: { status: wantsInApp ? "delivered" : "not_requested" },
      email: {
        status: emailStatus,
        error: emailStatus === "not_configured" ? "Email delivery is not configured" : "",
      },
      sms: { status: "not_requested" },
    },
  });

  if (emailStatus === "pending") scheduleEmailDelivery(notification._id);
  return notification;
};

export const retryNotificationEmail = async (notificationId) => {
  if (!isEmailConfigured()) {
    const error = new Error("Email delivery is not configured");
    error.statusCode = 503;
    throw error;
  }

  await Notification.updateOne(
    { _id: notificationId },
    {
      $set: {
        "channels.email.status": "pending",
        "channels.email.attempts": 0,
        "channels.email.error": "",
        "channels.email.nextAttemptAt": new Date(),
        "channels.email.sentAt": null,
      },
    },
  );
  scheduleEmailDelivery(notificationId);
};

let retryTimer;
let workerRunning = false;

export const processDueNotificationEmails = async () => {
  if (!isEmailConfigured()) {
    return { processed: 0, emailConfigured: false };
  }

  const dueNotifications = await Notification.find({
    "channels.email.status": "pending",
    "channels.email.attempts": { $lt: 3 },
    $or: [
      { "channels.email.nextAttemptAt": null },
      { "channels.email.nextAttemptAt": { $lte: new Date() } },
    ],
  })
    .select("_id")
    .limit(25)
    .lean();

  await Promise.all(
    dueNotifications.map(({ _id }) => processEmailNotification(_id)),
  );
  return { processed: dueNotifications.length, emailConfigured: true };
};

export const startNotificationWorker = () => {
  if (retryTimer) return;
  retryTimer = setInterval(async () => {
    if (workerRunning || !isEmailConfigured()) return;
    workerRunning = true;
    try {
      await processDueNotificationEmails();
    } catch (error) {
      console.error("Notification retry worker failed:", error);
    } finally {
      workerRunning = false;
    }
  }, 10_000);
  retryTimer.unref();
};
