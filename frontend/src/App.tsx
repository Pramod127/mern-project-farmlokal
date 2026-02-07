import { useEffect, useMemo, useState } from "react";
import { fetchProducts, type ProductParams } from "./api";
import type { Product } from "./types";

const DEFAULT_PARAMS: ProductParams = {
  limit: 20,
  sort: "created_at",
  order: "desc"
};

type FormState = {
  q: string;
  category_id: string;
  price_min: string;
  price_max: string;
  active: "all" | "true" | "false";
  sort: "created_at" | "price" | "name";
  order: "asc" | "desc";
  limit: string;
  in_stock_only: boolean;
  currency: string;
};

const INITIAL_FORM: FormState = {
  q: "",
  category_id: "",
  price_min: "",
  price_max: "",
  active: "all",
  sort: "created_at",
  order: "desc",
  limit: "20",
  in_stock_only: false,
  currency: ""
};

export default function App() {
  const [items, setItems] = useState<Product[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [params, setParams] = useState<ProductParams>(DEFAULT_PARAMS);
  const [selected, setSelected] = useState<Product | null>(null);
  const [clientFilters, setClientFilters] = useState({ inStockOnly: false, currency: "" });
  const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? window.location.origin;

  const summary = useMemo(() => {
    if (loading) return "Loading products...";
    if (error) return error;
    if (!items.length) return "No products yet. Try a broader search.";
    return `${items.length} products loaded`;
  }, [loading, error, items.length]);

  useEffect(() => {
    const controller = new AbortController();
    loadProducts(DEFAULT_PARAMS, undefined, false, controller.signal);
    return () => controller.abort();
  }, []);

  const visibleItems = useMemo(() => {
    return items.filter((product) => {
      if (clientFilters.inStockOnly && product.stock <= 0) {
        return false;
      }
      if (clientFilters.currency && product.currency !== clientFilters.currency) {
        return false;
      }
      return true;
    });
  }, [items, clientFilters]);

  async function loadProducts(
    nextParams: ProductParams,
    cursor?: string,
    append = false,
    signal?: AbortSignal
  ) {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchProducts({ ...nextParams, cursor }, signal);
      setItems((prev) => (append ? [...prev, ...payload.items] : payload.items));
      setNextCursor(payload.next_cursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function buildParams(nextForm: FormState): ProductParams {
    return {
      limit: Number(nextForm.limit) || 20,
      sort: nextForm.sort,
      order: nextForm.order,
      q: nextForm.q.trim() ? nextForm.q.trim() : undefined,
      category_id: nextForm.category_id ? Number(nextForm.category_id) : undefined,
      price_min: nextForm.price_min ? Number(nextForm.price_min) : undefined,
      price_max: nextForm.price_max ? Number(nextForm.price_max) : undefined,
      active: nextForm.active === "all" ? undefined : nextForm.active === "true"
    };
  }

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const nextParams = buildParams(form);
    setParams(nextParams);
    setNextCursor(null);
    setClientFilters({ inStockOnly: form.in_stock_only, currency: form.currency.trim() });
    await loadProducts(nextParams, undefined, false);
  }

  async function handleLoadMore() {
    if (!nextCursor) return;
    await loadProducts(params, nextCursor, true);
  }

  function formatPrice(product: Product) {
    const value = product.price_cents / 100;
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: product.currency || "INR",
        maximumFractionDigits: 2
      }).format(value);
    } catch {
      return `${product.currency} ${value.toFixed(2)}`;
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">FarmLokal Market Ops</p>
          <h1>Fresh inventory, faster decisions.</h1>
          <p className="subhead">
            Search, filter, and inspect product listings with cursor pagination. Built for high-traffic catalog ops.
          </p>
        </div>
        <div className="hero-card">
          <p className="label">Live status</p>
          <div className="stat">{summary}</div>
          <p className="hint">Connected to your local API at {apiBase}.</p>
        </div>
      </header>

      <section className="panel">
        <form className="filters" onSubmit={handleSearch}>
          <div className="field wide">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by name or description"
              value={form.q}
              onChange={(event) => handleChange("q", event.target.value)}
            />
          </div>
          <div className="field">
            <label>In stock only</label>
            <select
              value={form.in_stock_only ? "true" : "false"}
              onChange={(event) => handleChange("in_stock_only", event.target.value === "true")}
            >
              <option value="false">All stock</option>
              <option value="true">In stock</option>
            </select>
          </div>
          <div className="field">
            <label>Currency</label>
            <input
              type="text"
              placeholder="INR"
              value={form.currency}
              onChange={(event) => handleChange("currency", event.target.value.toUpperCase())}
            />
          </div>
          <div className="field">
            <label>Category</label>
            <input
              type="number"
              placeholder="ID"
              value={form.category_id}
              onChange={(event) => handleChange("category_id", event.target.value)}
            />
          </div>
          <div className="field">
            <label>Min price</label>
            <input
              type="number"
              placeholder="0"
              value={form.price_min}
              onChange={(event) => handleChange("price_min", event.target.value)}
            />
          </div>
          <div className="field">
            <label>Max price</label>
            <input
              type="number"
              placeholder="9999"
              value={form.price_max}
              onChange={(event) => handleChange("price_max", event.target.value)}
            />
          </div>
          <div className="field">
            <label>Active</label>
            <select value={form.active} onChange={(event) => handleChange("active", event.target.value as FormState["active"])}>
              <option value="all">All</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
          </div>
          <div className="field">
            <label>Sort by</label>
            <select value={form.sort} onChange={(event) => handleChange("sort", event.target.value as FormState["sort"])}>
              <option value="created_at">Created</option>
              <option value="price">Price</option>
              <option value="name">Name</option>
            </select>
          </div>
          <div className="field">
            <label>Order</label>
            <select value={form.order} onChange={(event) => handleChange("order", event.target.value as FormState["order"])}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
          <div className="field">
            <label>Limit</label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.limit}
              onChange={(event) => handleChange("limit", event.target.value)}
            />
          </div>
          <div className="actions">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setForm(INITIAL_FORM);
                const next = DEFAULT_PARAMS;
                setParams(next);
                setNextCursor(null);
                setClientFilters({ inStockOnly: false, currency: "" });
                loadProducts(next, undefined, false);
              }}
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="grid">
        {visibleItems.map((product) => (
          <article className="card" key={product.id} onClick={() => setSelected(product)}>
            <div className="card-top">
              <div>
                <p className="sku">SKU {product.sku}</p>
                <h3>{product.name}</h3>
              </div>
              <span className={product.is_active ? "badge success" : "badge muted"}>
                {product.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="description">{product.description || "No description provided."}</p>
            <div className="meta">
              <span className="price">{formatPrice(product)}</span>
              <span>Stock: {product.stock}</span>
              <span>Category: {product.category_id}</span>
            </div>
            <div className="chips">
              <span className={product.stock > 0 ? "chip good" : "chip warn"}>
                {product.stock > 0 ? "In stock" : "Out of stock"}
              </span>
              <span className="chip">{product.currency || "INR"}</span>
            </div>
            <button className="link">View details</button>
          </article>
        ))}
      </section>

      <footer className="footer">
        <button className="primary" onClick={handleLoadMore} disabled={loading || !nextCursor}>
          {nextCursor ? "Load more" : "No more results"}
        </button>
      </footer>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="sku">SKU {selected.sku}</p>
                <h2>{selected.name}</h2>
              </div>
              <button className="ghost" type="button" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <div className="modal-hero">
              <div className="image-placeholder">
                <div className="image-ring" />
                <span>{selected.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="badges">
                <span className={selected.is_active ? "badge success" : "badge muted"}>
                  {selected.is_active ? "Active" : "Inactive"}
                </span>
                <span className={selected.stock > 0 ? "badge success" : "badge muted"}>
                  {selected.stock > 0 ? "In stock" : "Out of stock"}
                </span>
                <span className="badge muted">{selected.currency || "INR"}</span>
              </div>
            </div>
            <p className="description">{selected.description || "No description provided."}</p>
            <div className="modal-grid">
              <div>
                <p className="label">Price</p>
                <p className="stat">{formatPrice(selected)}</p>
              </div>
              <div>
                <p className="label">Stock</p>
                <p className="stat">{selected.stock}</p>
              </div>
              <div>
                <p className="label">Category</p>
                <p className="stat">{selected.category_id}</p>
              </div>
              <div>
                <p className="label">Created</p>
                <p className="stat">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="label">Status</p>
                <p className="stat">{selected.is_active ? "Active" : "Inactive"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
