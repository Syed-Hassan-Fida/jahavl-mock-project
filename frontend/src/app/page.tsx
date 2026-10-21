import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ProductPhoto } from "@/components/Visuals";
import { lineFor, sortSeries, viewLabel } from "@/lib/copy";
import { getCatalog, getSeries, type ProductSummary } from "@/lib/api";

export const instant = false;

const facts = [
  { title: "Native 16:9", detail: "Common wall sizes land on 1080 or 4K without scaling." },
  { title: "On camera", detail: "Refresh rates chosen for IMAG, broadcast, and stream." },
  { title: "One catalog", detail: "LED, lighting, and audio specified together." },
  { title: "Sample prices", detail: "Every public price is a sample for this demo. It is not the live jahavl.com list." },
];

const rooms = [
  {
    title: "Houses of worship",
    detail: "A wall that is filmed as often as it is watched, specified with the lights and the arrays.",
    href: "/led",
    image: "/catalog/1_J_Series.png",
    alt: "J Series LED cabinet",
  },
  {
    title: "Venues",
    detail: "Wash, profile, and color from the lighting lines, quoted with the same system as the wall.",
    href: "/catalog/lighting",
    image: "/catalog/1_Intelligent_Hybrid_Front.png",
    alt: "Intelligent hybrid moving light",
  },
  {
    title: "Touring",
    detail: "Line arrays and stage monitors from the same maker, ready for a quote rather than a scavenger hunt.",
    href: "/catalog/audio",
    image: "/catalog/1_JLA208_Pro_Front.png",
    alt: "JLA208 line array",
  },
];

const steps = [
  { n: "01", title: "Specify", detail: "Pick a series, or sketch a wall in the planner." },
  { n: "02", title: "Quote", detail: "A specialist prices the system and you follow the status." },
  { n: "03", title: "Order", detail: "Checkout opens only after JAH allows it on that quote." },
];

const flagship = ["j-series", "jhd-series", "versa-series", "intelligent-series", "jla-series", "hl-series"];

async function featuredProducts(): Promise<ProductSummary[]> {
  const rows = await Promise.all(flagship.map((slug) => getSeries(slug).catch(() => null)));
  return rows.flatMap((row) => {
    if (!row) return [];
    const product = row.series.products.find((item) => item.image);
    if (!product) return [];
    return [{ ...product, series: { name: row.series.name, slug: row.series.slug }, category: row.series.category }];
  });
}

export default async function HomePage() {
  const [{ categories: loaded }, featured] = await Promise.all([getCatalog(), featuredProducts()]);
  const order = ["led", "lighting", "audio"];
  const categories = [...loaded].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="relative overflow-hidden bg-night">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:py-8">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-copper">HOUSES OF WORSHIP · VENUES · TOURING</p>
              <h1 className="mt-4 max-w-2xl text-5xl text-cream sm:text-6xl lg:text-7xl">Equipment built for the room and the camera.</h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-haze">
                JAH designs its own LED, lighting, and audio so a ministry or integrator can specify one system and quote it without hunting across brands.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/led" className="press rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink hover:bg-white">
                  Explore LED walls
                </Link>
                <Link href="/contact" className="press rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-cream hover:border-white/50">
                  Request a quote
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl bg-[#2a313b] ring-1 ring-white/10">
              <img src="/catalog/1_J_Series.png" alt="J Series LED cabinet" className="h-[min(62vh,480px)] w-full object-contain p-4" />
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#08090c]">
          <ul className="mx-auto grid max-w-7xl md:grid-cols-4">
            {facts.map((fact) => (
              <li key={fact.title} className="border-white/10 px-5 py-7 md:border-l first:md:border-l-0">
                <p className="display text-2xl text-cream">{fact.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-haze">{fact.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-cream text-ink">
          <div className="mx-auto max-w-7xl px-5 py-16 md:py-24">
            <Reveal>
              <p className="text-xs font-semibold tracking-[0.22em] text-copper">CATALOG</p>
              <h2 className="mt-3 max-w-xl text-5xl md:text-7xl">Three lines. One quote.</h2>
            </Reveal>
            <div className="mt-12 grid gap-6">
              {categories.map((category, index) => {
                const story = lineFor(category.slug);
                const image = category.series.find((item) => item.image)?.image;
                const flip = index % 2 === 1;
                return (
                  <Reveal key={category.slug}>
                    <article className="grid overflow-hidden rounded-3xl bg-night text-cream lg:grid-cols-2">
                      <div className={flip ? "lg:order-2" : ""}>
                        <ProductPhoto src={image} alt={category.name} fallback={category.slug} fill className="boost min-h-[340px] lg:min-h-[460px]" />
                      </div>
                      <div className="flex flex-col justify-center px-6 py-10 md:px-10">
                        <p className="text-xs font-semibold tracking-[0.18em] text-copper">{story.kicker.toUpperCase()}</p>
                        <h3 className="mt-3 text-4xl sm:text-5xl md:text-6xl">{story.headline}</h3>
                        <p className="mt-4 max-w-md text-base leading-relaxed text-haze">{story.line}</p>
                        <ul className="mt-6 flex flex-wrap gap-2">
                          {sortSeries(category.slug, category.series).map((series) => (
                            <li key={series.slug}>
                              <Link href={`/series/${series.slug}`} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:border-white/40">
                                {series.name.replace(" Series", "")}
                              </Link>
                            </li>
                          ))}
                        </ul>
              <Link href={category.slug === "led" ? "/led" : `/catalog/${category.slug}`} className="press mt-8 w-fit rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink hover:bg-white">
                {viewLabel(category.slug, category.name)}
              </Link>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {featured.length ? (
          <section className="bg-paper text-ink">
            <div className="mx-auto max-w-7xl px-5 py-16 md:py-24">
              <Reveal className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.22em] text-copper">IN THE CATALOG</p>
                  <h2 className="mt-3 text-5xl md:text-6xl">Start with a flagship.</h2>
                </div>
                <Link href="/led" className="text-sm font-semibold underline decoration-line underline-offset-4 hover:decoration-ink">
                  Browse LED walls
                </Link>
              </Reveal>
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((product) => (
                  <ProductCard key={product.slug} product={product} fallback={product.category?.slug ?? "led"} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-night text-cream">
          <div className="mx-auto max-w-7xl px-5 py-16 md:py-24">
            <Reveal>
              <p className="text-xs font-semibold tracking-[0.22em] text-copper">WHERE IT GOES</p>
              <h2 className="mt-3 max-w-2xl text-5xl md:text-6xl">Specified for the room it has to survive.</h2>
            </Reveal>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {rooms.map((room) => (
                <Reveal key={room.title}>
                  <Link href={room.href} className="group block overflow-hidden rounded-3xl bg-[#101216] ring-1 ring-white/10">
                    <ProductPhoto src={room.image} alt={room.alt} className="rounded-none" />
                    <div className="p-6">
                      <h3 className="text-4xl">{room.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-haze">{room.detail}</p>
                      <p className="mt-5 text-sm font-semibold text-cream">See the line</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-cream text-ink">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[0.8fr_1.2fr] md:py-24">
            <Reveal>
              <p className="text-xs font-semibold tracking-[0.22em] text-copper">HOW ORDERING WORKS</p>
              <h2 className="mt-3 text-5xl md:text-6xl">A quote you can follow.</h2>
            </Reveal>
            <ol className="grid gap-2">
              {steps.map((step) => (
                <li key={step.n} className="grid grid-cols-[auto_1fr] gap-5 border-t border-line py-5">
                  <span className="display text-3xl text-copper">{step.n}</span>
                  <div>
                    <p className="display text-3xl">{step.title}</p>
                    <p className="mt-1 text-mist">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#08090c]">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 md:grid-cols-[1fr_auto] md:py-16">
            <div>
              <h2 className="text-5xl text-cream md:text-6xl">Sell JAH from your shop.</h2>
              <p className="mt-4 max-w-lg text-haze">Approved dealers see net pricing, build quotes, and submit a purchase order when the client accepts.</p>
            </div>
            <Link href="/dealers" className="press w-fit rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink hover:bg-white">
              Dealer access
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
