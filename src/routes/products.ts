import { Router } from "express";
import { z } from "zod";
import { listProducts } from "../services/products.js";

export const productsRouter = Router();

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sort: z.enum(["created_at", "price", "name"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  q: z.string().min(1).optional(),
  category_id: z.coerce.number().optional(),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  active: z.enum(["true", "false"]).optional()
});

productsRouter.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const data = parsed.data;
  const result = await listProducts({
    limit: data.limit,
    cursor: data.cursor,
    sort: data.sort,
    order: data.order,
    q: data.q,
    categoryId: data.category_id,
    priceMin: data.price_min,
    priceMax: data.price_max,
    active: data.active ? data.active === "true" : undefined
  });

  res.json(result);
});
