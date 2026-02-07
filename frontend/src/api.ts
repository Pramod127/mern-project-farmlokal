import type { ProductsResponse } from "./types";

export type ProductParams = {
  limit: number;
  cursor?: string;
  sort?: "created_at" | "price" | "name";
  order?: "asc" | "desc";
  q?: string;
  category_id?: number;
  price_min?: number;
  price_max?: number;
  active?: boolean;
};

export async function fetchProducts(params: ProductParams, signal?: AbortSignal): Promise<ProductsResponse> {
  const base = import.meta.env.VITE_API_BASE as string | undefined;
  const url = base ? new URL("/products", base) : new URL("/products", window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as ProductsResponse;
}
