import { config } from "../config/index.js";
import { redis } from "../redis/client.js";
import { fetchWithRetry } from "../utils/http.js";
import { logger } from "../utils/logger.js";
import { setTimeout as sleep } from "node:timers/promises";

const TOKEN_KEY = "oauth:client_credentials";
const LOCK_KEY = "oauth:lock";
const LOCK_TTL_MS = 5000;
const SAFETY_WINDOW_SECONDS = 30;

export type AccessToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

type StoredToken = {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_at: number;
};

async function fetchToken(): Promise<StoredToken> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.OAUTH_CLIENT_ID,
    client_secret: config.OAUTH_CLIENT_SECRET
  });

  if (config.OAUTH_SCOPE) {
    body.set("scope", config.OAUTH_SCOPE);
  }

  const response = await fetchWithRetry(config.OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString(),
    timeoutMs: 5000,
    retries: 2
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth token request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as AccessToken;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + data.expires_in;

  return {
    access_token: data.access_token,
    token_type: data.token_type,
    scope: data.scope,
    expires_at: expiresAt
  };
}

async function getCachedToken(): Promise<StoredToken | null> {
  const raw = await redis.get(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null;
  }
}

async function setCachedToken(token: StoredToken) {
  const ttl = Math.max(1, token.expires_at - Math.floor(Date.now() / 1000));
  await redis.set(TOKEN_KEY, JSON.stringify(token), "EX", ttl);
}

export async function getAccessToken(): Promise<string> {
  const cached = await getCachedToken();
  const now = Math.floor(Date.now() / 1000);

  if (cached && cached.expires_at - SAFETY_WINDOW_SECONDS > now) {
    return cached.access_token;
  }

  const lock = await redis.set(LOCK_KEY, "1", "NX", "PX", LOCK_TTL_MS);

  if (lock === "OK") {
    try {
      const token = await fetchToken();
      await setCachedToken(token);
      return token.access_token;
    } finally {
      await redis.del(LOCK_KEY);
    }
  }

  for (let i = 0; i < 5; i += 1) {
    await sleep(200);
    const retry = await getCachedToken();
    if (retry && retry.expires_at - SAFETY_WINDOW_SECONDS > now) {
      return retry.access_token;
    }
  }

  logger.warn("OAuth token lock wait exceeded, forcing refresh");
  const token = await fetchToken();
  await setCachedToken(token);
  return token.access_token;
}
