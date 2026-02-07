import { MongoClient } from "mongodb";
import { config } from "../src/config/index.js";

async function run() {
  const client = new MongoClient(config.MONGO_URL);
  await client.connect();
  const db = client.db(config.MONGO_DB);
  const products = db.collection("products");
  const webhooks = db.collection("webhook_events");
  const outbound = db.collection("outbound_requests");

  await products.createIndex({ id: 1 }, { unique: true, name: "uniq_id" });
  await products.createIndex({ created_at: -1, id: -1 }, { name: "created_desc" });
  await products.createIndex({ price_cents: 1, id: 1 }, { name: "price_asc" });
  await products.createIndex({ name: 1 }, { name: "name_asc" });
  await products.createIndex({ category_id: 1, price_cents: 1 }, { name: "category_price" });
  await products.createIndex({ is_active: 1, id: 1 }, { name: "active_id" });

  await webhooks.createIndex({ provider: 1, event_id: 1 }, { unique: true, name: "uniq_webhook_event" });
  await outbound.createIndex({ target: 1, created_at: -1 }, { name: "outbound_target_created" });

  await client.close();
  console.log("Indexes created.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
