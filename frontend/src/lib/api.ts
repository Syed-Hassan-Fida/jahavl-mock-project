export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type SeriesSummary = {
  name: string;
  slug: string;
  summary: string | null;
  product_count: number;
  image?: string | null;
};

export type CategorySummary = {
  name: string;
  slug: string;
  series: SeriesSummary[];
};

export type ProductSummary = {
  id?: number;
  name: string;
  slug: string;
  list_price: string;
  dealer_price?: string;
  refresh_hz: number | null;
  image?: string | null;
  pitch?: string | null;
  brightness?: string | null;
  specs?: { name: string; value: string }[];
  description?: string;
  series?: { name: string; slug: string };
  category?: { name: string; slug: string };
};

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getCatalog() {
  return readJson<{ categories: CategorySummary[] }>("/api/v1/catalog");
}

export function getSeries(slug: string) {
  return readJson<{ series: SeriesSummary & { category: { name: string; slug: string }; products: ProductSummary[] } }>(
    `/api/v1/series/${slug}`,
  );
}

export function getProduct(slug: string) {
  return readJson<{ product: ProductSummary }>(`/api/v1/products/${slug}`);
}

export function money(value: string | number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}
