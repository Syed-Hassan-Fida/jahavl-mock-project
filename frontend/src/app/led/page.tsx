import type { Metadata } from "next";
import { SeriesGrid } from "@/components/SeriesGrid";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { WallPlanner } from "@/components/WallPlanner";
import { sortSeries } from "@/lib/copy";
import { getCatalog, getSeries } from "@/lib/api";

export const instant = false;

export const metadata: Metadata = {
  title: "LED walls",
  description: "Plan a JAH LED wall from the cabinet lines in this sample catalog.",
};

const cabinetLines = ["j-series", "je-series", "jhd-series"];

export default async function LedPage() {
  const [{ categories }, priced] = await Promise.all([
    getCatalog(),
    Promise.all(cabinetLines.map((slug) => getSeries(slug).catch(() => null))),
  ]);
  const lines = sortSeries("led", categories.find((category) => category.slug === "led")?.series ?? []);
  const cabinetPrices = priced
    .flatMap((row) => row?.series.products ?? [])
    .filter((product) => !/frame|clamp|stabil/i.test(product.name))
    .map((product) => Number(product.list_price))
    .filter((price) => price > 0);
  const minCabinet = cabinetPrices.length ? Math.min(...cabinetPrices) : 0;
  const maxCabinet = cabinetPrices.length ? Math.max(...cabinetPrices) : 0;
  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-night text-cream">
        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-copper">LED WALLS</p>
            <h1 className="mt-3 text-4xl leading-none sm:text-6xl">Choose the wall, then the cabinet count.</h1>
            <p className="mt-4 max-w-xl text-haze">JAH builds the cabinet, the receiving card path, and the quote in one place. Start with the series, then size the wall in feet.</p>
          </div>
          <img src="/catalog/1_J_Series.png" alt="J Series LED cabinet" className="aspect-[4/3] w-full rounded-3xl bg-[#2a313b] object-contain p-4" />
        </section>
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <SeriesGrid series={lines} fallback="led" />
        </section>
        <section className="bg-cream text-ink">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
            <h2 className="text-4xl sm:text-5xl">Size the wall</h2>
            <p className="mt-2 max-w-2xl text-mist">The planner suggests columns, rows, and cabinets for a 500 mm module, then a sample minimum and maximum from the catalog. Dealer net stays behind sign-in.</p>
            <div className="mt-8"><WallPlanner minCabinet={minCabinet} maxCabinet={maxCabinet} /></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
