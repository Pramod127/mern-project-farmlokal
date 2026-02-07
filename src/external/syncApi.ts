import { config } from "../config/index.js";
import { fetchWithRetry } from "../utils/http.js";
import { CircuitBreaker } from "../utils/circuitBreaker.js";
import { getCollection } from "../db/mongo.js";
import { getAccessToken } from "../auth/oauthClient.js";

const breaker = new CircuitBreaker({
  failuresThreshold: config.CIRCUIT_BREAKER_FAILURES,
  windowSeconds: config.CIRCUIT_BREAKER_WINDOW_SECONDS,
  cooldownSeconds: config.CIRCUIT_BREAKER_COOLDOWN_SECONDS
});

export async function fetchSupplierStatus(productId: number) {
  if (breaker.isOpen()) {
    throw new Error("circuit_open");
  }

  const url = `${config.EXTERNAL_SYNC_BASE_URL}/suppliers/status?productId=${productId}`;
  const start = Date.now();

  try {
    const token = await getAccessToken();
    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      timeoutMs: 3500,
      retries: 2
    });

    const duration = Date.now() - start;
    const requestKey = `supplier:${productId}:${start}`;

    const collection = await getCollection("outbound_requests");
    await collection.insertOne({
      request_key: requestKey,
      target: "supplier_status",
      status_code: response.status,
      response_time_ms: duration,
      created_at: new Date()
    });

    if (!response.ok) {
      breaker.recordFailure();
      throw new Error(`supplier_status_failed:${response.status}`);
    }

    const data = await response.json();
    breaker.recordSuccess();
    return data;
  } catch (err) {
    breaker.recordFailure();
    throw err;
  }
}
