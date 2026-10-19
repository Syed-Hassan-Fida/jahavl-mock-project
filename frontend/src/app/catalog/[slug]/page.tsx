import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SeriesGrid } from "@/components/SeriesGrid";
import { Crumb, SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ProductPhoto } from "@/components/Visuals";
import { lineFor, sortSeries } from "@/lib/copy";
import { getCatalog } from "@/lib/api";

type Props = { params: Promise<{ slug: string }> };

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = lineFor(slug);
  const titles: Record<string, string> = { led: "LED walls", lighting: "Lighting", audio: "Audio" };
  return { title: titles[slug] ?? story.headline, description: story.line };
}

export default async function CatalogPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "led") redirect("/led");
  const { categories } = await getCatalog();
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

  const story = lineFor(slug);

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <section className="bg-night text-cream">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 lg:grid-cols-[1fr_1fr] lg:py-8">
            <div>
              <Crumb tone="dark" items={[{ href: "/", label: "Home" }, { label: category.name }]} />
              <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-copper">{story.kicker.toUpperCase()}</p>
              <h1 className="mt-3 text-4xl text-cream sm:text-6xl lg:text-7xl">{story.headline}</h1>
              <p className="mt-4 max-w-xl text-lg text-haze">{story.line}</p>
            </div>
            <div className="stage-glow">
              <ProductPhoto src={category.series.find((item) => item.image)?.image} alt={category.name} fallback={slug} fill className="boost min-h-[380px] rounded-3xl" />
            </div>
          </div>
        </section>
        <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
          <SeriesGrid series={sortSeries(slug, category.series)} fallback={slug} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
