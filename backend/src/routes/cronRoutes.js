import express from "express";
import { connectDB } from "../config/db.js";
import { processDueNotificationEmails } from "../services/notificationService.js";

const cronRouter = express.Router();

cronRouter.get("/email-retries", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(503).json({ message: "Scheduled jobs are not configured" });
  }
  if (req.get("authorization") !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await connectDB();
    const result = await processDueNotificationEmails();
    return res.status(200).json(result);
  } catch (error) {
    console.error("Scheduled email retry job failed:", error);
    return res.status(500).json({ message: "Scheduled email retry job failed" });
  }
});

export default cronRouter;
