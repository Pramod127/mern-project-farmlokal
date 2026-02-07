import crypto from "node:crypto";
import { redis } from "../redis/client.js";
import { config } from "../config/index.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { getCollection } from "../db/mongo.js";

export type ProductQuery = {
  limit: number;
  cursor?: string;
  sort?: "created_at" | "price" | "name";
  order?: "asc" | "desc";
  q?: string;
  categoryId?: number;
  priceMin?: number;
  priceMax?: number;
  active?: boolean;
};

const SORT_MAP: Record<string, { sql: string; column: string }> = {
  created_at: { sql: "created_at", column: "created_at" },
  price: { sql: "price_cents", column: "price_cents" },
  name: { sql: "name", column: "name" }
};

export async function listProducts(query: ProductQuery) {
  const cacheKey = buildCacheKey(query);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const limit = Math.min(100, Math.max(1, query.limit));
  const order = query.order === "asc" ? 1 : -1;
  const sortConfig = SORT_MAP[query.sort ?? "created_at"] ?? SORT_MAP.created_at;

  const cursor = decodeCursor(query.cursor);

  const filter: Record<string, any> = {};

  if (query.categoryId) {
    filter.category_id = query.categoryId;
  }

  if (query.active !== undefined) {
    filter.is_active = query.active;
  }

  if (query.priceMin !== undefined) {
    filter.price_cents = { ...(filter.price_cents ?? {}), $gte: query.priceMin };
  }

  if (query.priceMax !== undefined) {
    filter.price_cents = { ...(filter.price_cents ?? {}), $lte: query.priceMax };
  }

  if (query.q) {
    const escaped = escapeRegex(query.q);
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } }
    ];
  }

  if (cursor) {
    const comparator = order === 1 ? "$gt" : "$lt";
    const sortValue = toSortValue(sortConfig.column, cursor.sortValue);
    filter.$or = [
      { [sortConfig.sql]: { [comparator]: sortValue } },
      { [sortConfig.sql]: sortValue, id: { [comparator]: cursor.id } }
    ];
  }

  const collection = await getCollection<any>("products");
  const resultRows = await collection
    .find(filter)
    .sort({ [sortConfig.sql]: order, id: order })
    .limit(limit + 1)
    .toArray();

  const hasMore = resultRows.length > limit;
  const items = hasMore ? resultRows.slice(0, limit) : resultRows;
  const last = items[items.length - 1];

  const nextCursor = hasMore && last
    ? encodeCursor({
        sortValue: fromSortValue(sortConfig.column, last[sortConfig.column as keyof typeof last]),
        id: last.id
      })
    : null;

  const normalized = items.map((item) => ({
    ...item,
    created_at: item.created_at ? new Date(item.created_at).toISOString() : null
  }));

  const payload = {
    items: normalized,
    next_cursor: nextCursor
  };

  await redis.set(cacheKey, JSON.stringify(payload), "EX", config.CACHE_TTL_SECONDS);
  return payload;
}

function buildCacheKey(query: ProductQuery) {
  const stable = {
    ...query,
    q: query.q ?? null
  };
  const hash = crypto.createHash("sha1").update(JSON.stringify(stable)).digest("hex");
  return `products:list:${hash}`;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toSortValue(column: string, value: string | number) {
  if (column === "created_at") {
    return new Date(Number(value));
  }
  if (column === "price_cents") {
    return Number(value);
  }
  return String(value);
}

function fromSortValue(column: string, value: any) {
  if (column === "created_at") {
    return value instanceof Date ? value.getTime() : new Date(value).getTime();
  }
  if (column === "price_cents") {
    return Number(value);
  }
  return String(value);
}
