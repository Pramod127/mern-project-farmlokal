import { redis } from "../redis/client.js";
import { config } from "../config/index.js";

const script = `
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local burst = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'timestamp')
local tokens = tonumber(data[1])
local timestamp = tonumber(data[2])

if tokens == nil then
  tokens = burst
  timestamp = now
end

local delta = math.max(0, now - timestamp)
local refill = delta * rate
local current = math.min(burst, tokens + refill)
local allowed = current >= 1

if allowed then
  current = current - 1
end

redis.call('HMSET', key, 'tokens', current, 'timestamp', now)
redis.call('EXPIRE', key, ttl)

return { allowed and 1 or 0, current }
`;

redis.defineCommand("tokenBucket", {
  numberOfKeys: 1,
  lua: script
});

export function rateLimit() {
  return async (req: any, res: any, next: any) => {
    const key = `rl:${req.ip}`;
    const nowSeconds = Math.floor(Date.now() / 1000);

    const [allowed, remaining] = (await (redis as any).tokenBucket(
      key,
      config.RATE_LIMIT_RPS,
      config.RATE_LIMIT_BURST,
      nowSeconds,
      60
    )) as [number, number];

    res.setHeader("X-RateLimit-Remaining", Math.max(0, Math.floor(remaining)));

    if (!allowed) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }

    next();
  };
}
