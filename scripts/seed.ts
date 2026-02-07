import { MongoClient } from "mongodb";
import { config } from "../src/config/index.js";

const TOTAL = Number(process.env.SEED_TOTAL ?? "1000000");
const BATCH_SIZE = Number(process.env.SEED_BATCH ?? "5000");
const RESET = process.env.SEED_RESET === "true" || process.env.SEED_RESET === "1";

const currencies = ["INR", "USD", "EUR", "GBP"];
const adjectives = ["Fresh", "Organic", "Premium", "Seasonal", "Local", "Crisp", "Sunlit", "Harvest", "Pure", "Daily"];
const nouns = ["Tomato", "Potato", "Onion", "Mango", "Apple", "Milk", "Rice", "Lentil", "Spinach", "Carrot"];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(list: T[]) {
  return list[randomInt(0, list.length - 1)];
}

function makeProduct(id: number) {
  const name = `${pick(adjectives)} ${pick(nouns)}`;
  const categoryId = randomInt(1, 12);
  const priceCents = randomInt(50, 50000);
  const stock = randomInt(0, 500);
  const createdAt = new Date(Date.now() - randomInt(0, 365) * 24 * 60 * 60 * 1000);

  return {
    id,
    sku: `SKU-${id.toString().padStart(8, "0")}`,
    name,
    description: `${name} - batch ${randomInt(1, 500)} from local farms.`,
    category_id: categoryId,
    price_cents: priceCents,
    currency: pick(currencies),
    stock,
    is_active: stock > 0 && Math.random() > 0.1,
    created_at: createdAt
  };
}

async function run() {
  if (!Number.isFinite(TOTAL) || TOTAL <= 0) {
    throw new Error("SEED_TOTAL must be a positive number.");
  }
  if (!Number.isFinite(BATCH_SIZE) || BATCH_SIZE <= 0) {
    throw new Error("SEED_BATCH must be a positive number.");
  }

  const client = new MongoClient(config.MONGO_URL);
  await client.connect();
  const db = client.db(config.MONGO_DB);
  const collection = db.collection("products");

  if (RESET) {
    await collection.deleteMany({});
  }

  const last = await collection.find({}, { projection: { id: 1 } }).sort({ id: -1 }).limit(1).toArray();
  let currentId = last.length ? Number(last[0].id) : 0;

  let inserted = 0;
  const batches = Math.ceil(TOTAL / BATCH_SIZE);

  for (let i = 0; i < batches; i += 1) {
    const batchCount = Math.min(BATCH_SIZE, TOTAL - inserted);
    const docs = new Array(batchCount);
    for (let j = 0; j < batchCount; j += 1) {
      currentId += 1;
      docs[j] = makeProduct(currentId);
    }
    await collection.insertMany(docs, { ordered: false });
    inserted += batchCount;
    if ((i + 1) % 5 === 0 || inserted === TOTAL) {
      console.log(`Inserted ${inserted}/${TOTAL}`);
    }
  }

  await client.close();
  console.log("Seeding complete.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
