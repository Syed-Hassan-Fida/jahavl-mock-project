import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ProductPhoto } from "@/components/Visuals";

export const metadata: Metadata = { title: "Dealers" };

const points = [
  { title: "List stays public", detail: "Anyone can see list price. Dealer cost is only on an approved account." },
  { title: "Quotes have a status", detail: "Added, requested, approved, rejected, or paid. The client can follow it." },
  { title: "Checkout is gated", detail: "A quote cannot be paid until JAH turns checkout on for that quote." },
];

export default function DealersPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <section className="bg-night text-cream">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-8">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-copper">DEALERS</p>
              <h1 className="mt-3 max-w-3xl text-4xl text-cream sm:text-6xl lg:text-7xl">Net pricing after JAH approves the account.</h1>
              <p className="mt-5 max-w-xl text-lg text-haze">
                Approved dealers build quotes for their clients and turn an accepted quote into a purchase order. Applications are reviewed before the login is activated.
              </p>
              <Link href="/dealers/apply" className="press mt-8 inline-flex rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink hover:bg-white">
                Apply to be a dealer
              </Link>
            </div>
            <div className="stage-glow">
              <ProductPhoto src="/catalog/1_JLA208_Pro_Front.png" alt="JLA line array" fallback="audio" fill className="min-h-[360px] rounded-3xl" />
            </div>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-5 py-14 md:py-20">
          <div className="grid gap-4 md:grid-cols-3">
            {points.map((point, index) => (
              <Reveal key={point.title}>
                <article className="h-full rounded-3xl bg-paper p-6 ring-1 ring-line">
                  <p className="display text-3xl text-copper">{String(index + 1).padStart(2, "0")}</p>
                  <h2 className="mt-3 text-3xl">{point.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-mist">{point.detail}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
