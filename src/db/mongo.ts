import { MongoClient, type Db } from "mongodb";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const client = new MongoClient(config.MONGO_URL);
let database: Db | null = null;

async function getDb() {
  if (!database) {
    await client.connect();
    database = client.db(config.MONGO_DB);
  }
  return database;
}

export async function verifyDatabase() {
  const db = await getDb();
  await db.command({ ping: 1 });
  logger.info("MongoDB connection ready");
}

export async function getCollection<T>(name: string) {
  const db = await getDb();
  return db.collection<T>(name);
}
