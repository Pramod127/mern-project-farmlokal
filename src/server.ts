import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { productsRouter } from "./routes/products.js";
import { healthRouter } from "./routes/health.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { externalRouter } from "./routes/external.js";
import { verifyDatabase } from "./db/mongo.js";

const app = express();
app.set("trust proxy", 1);

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors());

app.use(
  express.json({
    limit: "1mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.use(rateLimit());

app.use("/health", healthRouter);
app.use("/products", productsRouter);
app.use("/external", externalRouter);
app.use("/webhooks", webhooksRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "internal_error" });
});

const server = app.listen(config.PORT, async () => {
  logger.info({ port: config.PORT }, "Server listening");
  await verifyDatabase();
});

const shutdown = () => {
  logger.info("Shutting down");
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
