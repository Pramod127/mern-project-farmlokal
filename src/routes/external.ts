import { Router } from "express";
import { fetchSupplierStatus } from "../external/syncApi.js";

export const externalRouter = Router();

externalRouter.get("/supplier/:id", async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) {
    res.status(400).json({ error: "invalid_product_id" });
    return;
  }

  try {
    const data = await fetchSupplierStatus(productId);
    res.json({ status: "ok", data });
  } catch (err: any) {
    if (err?.message === "circuit_open") {
      res.status(503).json({ error: "circuit_open" });
      return;
    }

    res.status(502).json({ error: "external_request_failed" });
  }
});
