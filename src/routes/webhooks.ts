import { Router } from "express";
import crypto from "node:crypto";
import { config } from "../config/index.js";
import { redis } from "../redis/client.js";
import { getCollection } from "../db/mongo.js";
import { logger } from "../utils/logger.js";

export const webhooksRouter = Router();

function verifySignature(rawBody: Buffer, signature: string | undefined) {
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", config.EXTERNAL_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const digest = `sha256=${hmac.digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

webhooksRouter.post("/external", async (req, res) => {
  const rawBody = (req as any).rawBody as Buffer | undefined;
  const signature = req.header("x-signature");

  if (!rawBody || !verifySignature(rawBody, signature)) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  const eventId = req.body?.event_id || req.header("x-event-id");
  if (!eventId) {
    res.status(400).json({ error: "missing_event_id" });
    return;
  }

  const idempotencyKey = `webhook:external:${eventId}`;
  const already = await redis.set(idempotencyKey, "1", "NX", "EX", 86400);

  if (!already) {
    res.status(200).json({ status: "duplicate_ignored" });
    return;
  }

  try {
    const collection = await getCollection("webhook_events");
    await collection.insertOne({
      provider: "external",
      event_id: eventId,
      payload_json: req.body ?? {},
      received_at: new Date()
    });

    logger.info({ eventId }, "Webhook processed");
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    logger.error({ err }, "Webhook processing failed");
    res.status(500).json({ error: "processing_failed" });
  }
});
