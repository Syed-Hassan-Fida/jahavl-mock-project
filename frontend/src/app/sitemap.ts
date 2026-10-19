import type { MetadataRoute } from "next";

const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
const api = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ["", "/led", "/resources", "/catalog/lighting", "/catalog/audio", "/dealers", "/dealers/apply", "/contact", "/policies", "/login", "/register"];
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({ url: `${origin}${path}`, changeFrequency: "weekly", priority: path === "" ? 1 : 0.7 }));

  try {
    const response = await fetch(`${api}/api/v1/catalog`, { next: { revalidate: 3600 } });
    if (!response.ok) return entries;
    const body = (await response.json()) as { categories: { series: { slug: string; products?: { slug: string }[] }[] }[] };
    for (const category of body.categories ?? []) {
      for (const series of category.series ?? []) {
        entries.push({ url: `${origin}/series/${series.slug}`, changeFrequency: "weekly", priority: 0.6 });
      }
    }
  } catch {
    return entries;
  }

  try {
    const response = await fetch(`${api}/api/v1/resources`, { next: { revalidate: 3600 } });
    if (!response.ok) return entries;
    const body = (await response.json()) as { products: { slug: string }[] };
    for (const product of body.products ?? []) {
      entries.push({ url: `${origin}/products/${product.slug}`, changeFrequency: "weekly", priority: 0.5 });
    }
  } catch {
    return entries;
  }

  return entries;
}
