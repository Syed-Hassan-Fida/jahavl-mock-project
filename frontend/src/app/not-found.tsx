import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <div className="mx-auto max-w-xl px-5 py-24">
          <p className="text-xs font-semibold tracking-[0.2em] text-copper">404</p>
          <h1 className="mt-3 text-6xl">That page is not in the catalog.</h1>
          <Link href="/" className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream">
            Back to JAH
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
