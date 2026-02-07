import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(8080),
  LOG_LEVEL: z.string().default("info"),

  MONGO_URL: z.string().default("mongodb://localhost:27017"),
  MONGO_DB: z.string().default("farmlokal"),

  REDIS_URL: z.string().optional(),
  REDIS_DISABLED: z
    .string()
    .default("false")
    .transform((value) => value === "true" || value === "1"),

  OAUTH_TOKEN_URL: z.string().url(),
  OAUTH_CLIENT_ID: z.string(),
  OAUTH_CLIENT_SECRET: z.string(),
  OAUTH_SCOPE: z.string().optional(),

  EXTERNAL_SYNC_BASE_URL: z.string().url(),
  EXTERNAL_WEBHOOK_SECRET: z.string(),

  CACHE_TTL_SECONDS: z.coerce.number().default(60),
  RATE_LIMIT_RPS: z.coerce.number().default(20),
  RATE_LIMIT_BURST: z.coerce.number().default(40),

  CIRCUIT_BREAKER_FAILURES: z.coerce.number().default(5),
  CIRCUIT_BREAKER_WINDOW_SECONDS: z.coerce.number().default(30),
  CIRCUIT_BREAKER_COOLDOWN_SECONDS: z.coerce.number().default(30)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
