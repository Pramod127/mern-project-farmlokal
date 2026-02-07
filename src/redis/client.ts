import Redis from "ioredis";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

type StoredValue = {
  value: string;
  expiresAt: number | null;
};

class InMemoryRedis {
  private store = new Map<string, StoredValue>();
  private buckets = new Map<string, { tokens: number; timestamp: number }>();

  on() {
    return this;
  }

  defineCommand() {
    return this;
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ...args: Array<string | number>) {
    const parsed = parseSetArgs(args);
    const existing = this.store.get(key);
    if (parsed.nx && existing && !(existing.expiresAt && existing.expiresAt <= Date.now())) {
      return null;
    }
    const expiresAt = parsed.ttlMs ? Date.now() + parsed.ttlMs : null;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(key: string) {
    return this.store.delete(key) ? 1 : 0;
  }

  async tokenBucket(key: string, rate: number, burst: number, nowSeconds: number, ttlSeconds: number) {
    const bucket = this.buckets.get(key) ?? { tokens: burst, timestamp: nowSeconds };
    const delta = Math.max(0, nowSeconds - bucket.timestamp);
    const refill = delta * rate;
    const current = Math.min(burst, bucket.tokens + refill);
    const allowed = current >= 1;
    const nextTokens = allowed ? current - 1 : current;
    this.buckets.set(key, { tokens: nextTokens, timestamp: nowSeconds });

    if (ttlSeconds > 0) {
      setTimeout(() => {
        const entry = this.buckets.get(key);
        if (entry && entry.timestamp <= nowSeconds) {
          this.buckets.delete(key);
        }
      }, ttlSeconds * 1000).unref?.();
    }

    return [allowed ? 1 : 0, nextTokens] as [number, number];
  }
}

function parseSetArgs(args: Array<string | number>) {
  let ttlMs: number | null = null;
  let nx = false;
  for (let i = 0; i < args.length; i += 1) {
    const token = String(args[i]).toUpperCase();
    if (token === "EX") {
      const ttl = Number(args[i + 1]);
      ttlMs = Number.isFinite(ttl) ? ttl * 1000 : null;
      i += 1;
      continue;
    }
    if (token === "PX") {
      const ttl = Number(args[i + 1]);
      ttlMs = Number.isFinite(ttl) ? ttl : null;
      i += 1;
      continue;
    }
    if (token === "NX") {
      nx = true;
    }
  }
  return { ttlMs, nx };
}

const redisEnabled = !config.REDIS_DISABLED && Boolean(config.REDIS_URL);

export const redis = redisEnabled
  ? new Redis(config.REDIS_URL as string, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    })
  : new InMemoryRedis();

if (redisEnabled) {
  (redis as Redis).on("connect", () => logger.info("Redis connected"));
  (redis as Redis).on("error", (err) => logger.error({ err }, "Redis error"));
} else {
  logger.warn("Redis disabled. Using in-memory fallback.");
}
