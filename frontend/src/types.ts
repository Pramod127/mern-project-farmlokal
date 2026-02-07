export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category_id: number;
  price_cents: number;
  currency: string;
  stock: number;
  is_active: boolean | number;
  created_at: string;
};

export type ProductsResponse = {
  items: Product[];
  next_cursor: string | null;
};
