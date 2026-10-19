import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Sales and refunds",
  description: "Shipping, warranty, returns, and payment terms for JAH Audio equipment.",
};

const policies = [
  {
    title: "Shipping and delivery",
    body: "Shipping may be included on some items. Report a shortage within five business days of receipt.",
  },
  {
    title: "Warranty",
    body: "JAH-manufactured hardware is warranted against defects in materials and workmanship for three years from purchase when used as specified.",
  },
  {
    title: "Returns and cancellation",
    body: "JAH does not accept returns. Special-order items cannot be cancelled once the initial payment is made. Report a wrong or failed-on-arrival product immediately.",
  },
  {
    title: "Payment",
    body: "Orders are paid in full before production. Accepted methods include bank check, ACH, and wire.",
  },
];

export default function PoliciesPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <section className="bg-night text-cream">
          <div className="mx-auto max-w-3xl px-5 py-16">
            <p className="text-xs font-semibold tracking-[0.2em] text-copper">POLICIES</p>
            <h1 className="mt-3 text-4xl text-cream sm:text-6xl lg:text-7xl">Sales and refunds</h1>
            <p className="mt-4 text-lg text-haze">The commercial terms behind a JAH quote. Read these before you ask for production.</p>
          </div>
        </section>
        <div className="mx-auto max-w-3xl px-5 py-14 md:py-20">
          <div className="space-y-4">
            {policies.map((policy) => (
              <section key={policy.title} className="rounded-2xl border border-line bg-paper p-6">
                <h2 className="text-3xl">{policy.title}</h2>
                <p className="mt-3 leading-relaxed text-mist">{policy.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
