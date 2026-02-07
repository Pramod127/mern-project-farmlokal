import { setTimeout as sleep } from "node:timers/promises";

export type HttpOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  retryOn?: number[];
};

export async function fetchWithRetry(url: string, options: HttpOptions = {}) {
  const {
    method = "GET",
    headers,
    body,
    timeoutMs = 4000,
    retries = 2,
    retryDelayMs = 250,
    retryOn = [408, 429, 500, 502, 503, 504]
  } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      });

      if (!retryOn.includes(response.status)) {
        return response;
      }

      lastError = new Error(`Retryable response status ${response.status}`);
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < retries) {
      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError ?? new Error("Request failed");
}
