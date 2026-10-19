import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { Crumb, SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ProductPhoto } from "@/components/Visuals";
import { categoryHref } from "@/lib/copy";
import { getSeries } from "@/lib/api";

type Props = { params: Promise<{ slug: string }> };

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { series } = await getSeries(slug);
  return { title: series.name, description: series.summary ?? undefined };
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const { series } = await getSeries(slug);
  const portrait = series.image ?? series.products.find((product) => product.image)?.image;

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <section className="bg-night text-cream">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-8">
            <div>
              <Crumb
                tone="dark"
                items={[
                  { href: "/", label: "Home" },
                  { href: categoryHref(series.category.slug), label: series.category.slug === "led" ? "LED walls" : series.category.name },
                  { label: series.name },
                ]}
              />
              <h1 className="mt-6 text-4xl text-cream sm:text-6xl lg:text-7xl">{series.name}</h1>
              <p className="mt-4 max-w-xl text-lg text-haze">{series.summary}</p>
              <p className="mt-6 text-sm font-semibold tracking-[0.16em] text-copper">{series.products.length} PRODUCTS · SAMPLE PRICE</p>
            </div>
            <div className="stage-glow">
              <ProductPhoto src={portrait} alt={series.name} fallback={series.category.slug} fill className="boost min-h-[360px] rounded-3xl" />
            </div>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-5 py-14 md:py-20">
          <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {series.products.map((product) => (
              <Reveal key={product.slug} className="h-full">
                <ProductCard product={{ ...product, series: { name: series.name, slug: series.slug } }} fallback={series.category.slug} />
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
