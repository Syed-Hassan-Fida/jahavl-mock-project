import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const instant = false;

export const metadata: Metadata = {
  title: "Resources",
  description: "Spec sheets, product photos, and series pages for JAH Audio equipment.",
};

type Product = { name: string; slug: string; image: string | null; series: string | null; documents: { id: number; name: string }[] };

async function load(): Promise<Product[]> {
  const origin = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${origin}/api/v1/resources`, { next: { revalidate: 60 } });
  if (!response.ok) return [];
  const body = (await response.json()) as { products: Product[] };
  return body.products;
}

export default async function ResourcesPage() {
  const products = await load();
  const withDocs = products.filter((product) => product.documents.length > 0);
  const photos = products.filter((product) => product.image);

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold tracking-[0.22em] text-copper">RESOURCES</p>
          <h1 className="mt-3 text-4xl sm:text-6xl">Spec sheets and cabinet photos.</h1>
          <p className="mt-3 max-w-2xl text-mist">Downloads are the documents stored on a published product. Photos are the same studio files used in the catalog.</p>
          {withDocs.length > 0 ? (
            <>
              <h2 className="mt-12 text-4xl">Documents</h2>
              <ul className="mt-4 space-y-3">
                {withDocs.map((product) => (
                  <li key={product.slug} className="rounded-2xl border border-line bg-paper px-4 py-3">
                    <Link href={`/products/${product.slug}`} className="font-semibold">{product.name}</Link>
                    <span className="ml-2 text-sm text-mist">{product.series}</span>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      {product.documents.map((document) => (
                        <a key={document.id} className="text-copper" href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/api/v1/resources/documents/${document.id}`}>{document.name}</a>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <h2 className="mt-12 text-4xl">Photos</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {photos.slice(0, 12).map((product) => (
              <li key={product.slug}>
                <Link href={`/products/${product.slug}`} className="block rounded-3xl bg-[#2a313b] p-3">
                  <img src={product.image ?? ""} alt={product.name} className="aspect-square w-full object-contain" />
                  <span className="mt-3 block text-sm text-cream">{product.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
