import type { Metadata } from "next";
import Link from "next/link";
import { SaveToQuote } from "@/components/SaveToQuote";
import { Crumb, SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ProductPhoto } from "@/components/Visuals";
import { categoryHref } from "@/lib/copy";
import { getProduct, money } from "@/lib/api";

type Props = { params: Promise<{ slug: string }> };

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getProduct(slug);
  return { title: product.name, description: product.description };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const { product } = await getProduct(slug);
  const category = product.category?.slug ?? "led";
  const chips = [product.pitch, product.brightness, product.refresh_hz ? `${product.refresh_hz.toLocaleString()} Hz refresh` : null].filter(Boolean);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: "JAH Audio" },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: product.list_price,
      availability: "https://schema.org/PreOrder",
    },
  };

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <section className="bg-night">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.15fr_0.85fr]">
            <div className="stage-glow px-5 py-8 lg:px-8 lg:py-10">
              <ProductPhoto src={product.image} alt={product.name} fallback={category} fill className="boost min-h-[420px] rounded-3xl lg:min-h-[640px]" />
            </div>
            <article className="bg-cream px-5 py-10 lg:px-10 lg:py-14">
              <Crumb
                items={[
                  { href: "/", label: "Home" },
                  { href: categoryHref(product.category?.slug ?? "led"), label: product.category?.slug === "led" ? "LED walls" : product.category?.name ?? "Catalog" },
                  { href: `/series/${product.series?.slug}`, label: product.series?.name ?? "Series" },
                  { label: product.name },
                ]}
              />
              <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-copper">{(product.series?.name ?? "JAH").toUpperCase()}</p>
              <h1 className="mt-3 text-4xl sm:text-5xl md:text-6xl">{product.name}</h1>
              <p className="mt-5 text-lg leading-relaxed text-mist">{product.description}</p>
              {chips.length ? (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <li key={chip} className="rounded-full bg-foam px-3 py-1 text-sm font-semibold">
                      {chip}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-8 text-[11px] font-semibold tracking-[0.18em] text-mist">SAMPLE PRICE</p>
              <p className="mt-1 text-5xl tabular-nums">{money(product.list_price)}</p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-mist">Sample catalog price for this demo. It is not the live jahavl.com list. Dealer net stays behind an approved login.</p>
              {product.id ? <SaveToQuote productId={product.id} productName={product.name} /> : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/contact?interest=${encodeURIComponent(product.category?.name ?? "LED")}&note=${encodeURIComponent(`Quote request for ${product.name}.`)}`} className="press rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold hover:border-ink">
                  Request a quote
                </Link>
                <Link href={`/series/${product.series?.slug}`} className="rounded-full px-2 py-3 text-sm font-semibold underline decoration-line underline-offset-4 hover:decoration-ink">
                  More in this series
                </Link>
              </div>
            </article>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-14 md:py-20">
          <h2 className="text-4xl">Specifications</h2>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            <Spec label="Sample price" value={money(product.list_price)} />
            <Spec label="Series" value={product.series?.name ?? "—"} />
            {(product.specs ?? []).slice(0, 16).map((spec) => (
              <Spec key={spec.name} label={spec.name} value={spec.value} />
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[240px_1fr] sm:items-baseline sm:gap-6">
      <dt className="text-sm text-mist">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
