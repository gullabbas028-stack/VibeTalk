import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "delivered",
        "pending",
        "sending",
        "sent",
        "failed",
        "not_configured",
        "not_requested",
      ],
      default: "not_requested",
    },
    attempts: { type: Number, default: 0 },
    error: { type: String, default: "" },
    sentAt: { type: Date, default: null },
    nextAttemptAt: { type: Date, default: null },
  },
  { _id: false },
);

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "friend_request",
        "friend_request_accepted",
        "new_message",
        "account_update",
        "promotional_offer",
        "system_alert",
        "event_reminder",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: "" },
      image: { type: String, default: "" },
    },
    link: { type: String, default: "" },
    channels: {
      inApp: { type: deliverySchema, default: () => ({}) },
      email: { type: deliverySchema, default: () => ({}) },
      sms: { type: deliverySchema, default: () => ({}) },
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;
