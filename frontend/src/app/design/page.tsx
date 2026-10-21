"use client";

import { useCallback, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Banner, EmptyState, Metric, Modal, SkeletonBlock, StatusBadge } from "@/components/ui";

const swatches = [
  { name: "Ink", value: "#14161c", className: "bg-ink" },
  { name: "Night", value: "#0e1014", className: "bg-night" },
  { name: "Cream", value: "#f7f4ee", className: "bg-cream" },
  { name: "Copper", value: "#9a4510", className: "bg-copper" },
  { name: "Ember", value: "#e8b48a", className: "bg-ember" },
  { name: "Canvas", value: "#f3f0e8", className: "bg-canvas" },
];

export default function DesignPage() {
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-canvas text-ink">
        <section className="bg-night text-cream">
          <div className="mx-auto max-w-7xl px-5 py-16 md:py-24">
            <p className="text-xs font-semibold tracking-[0.2em] text-copper">COMPONENT LIBRARY</p>
            <h1 className="mt-4 max-w-3xl text-5xl sm:text-7xl">The pieces the product is built from.</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-haze">
              One radius, one elevation, and one accent. These atoms are what the catalog, the workspace, and the quote list share.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16">
          <section aria-labelledby="type-specimen">
            <h2 id="type-specimen" className="text-4xl">Type</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist">Instrument Serif for titles. Inter for interface text, prices, and tables. Serif carries the brand. Sans carries the data.</p>
            <div className="panel mt-6 p-6 sm:p-8">
              <p className="font-display text-5xl sm:text-6xl">Equipment for the room.</p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-mist">Body copy stays in Inter at a comfortable size, with mist used only for secondary information that still clears contrast.</p>
            </div>
          </section>

          <section aria-labelledby="color-specimen">
            <h2 id="color-specimen" className="text-4xl">Color</h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {swatches.map((swatch) => (
                <li key={swatch.name} className="panel overflow-hidden">
                  <div className={`h-16 ${swatch.className}`} />
                  <p className="px-3 py-3 text-sm font-semibold">{swatch.name}</p>
                  <p className="px-3 pb-3 text-xs text-mist">{swatch.value}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="button-specimen">
            <h2 id="button-specimen" className="text-4xl">Buttons</h2>
            <div className="panel mt-6 flex flex-wrap items-center gap-3 p-6">
              <button type="button" className="btn btn-primary">Primary action</button>
              <button type="button" className="btn btn-secondary">Secondary</button>
              <button type="button" className="btn btn-ghost">Quiet</button>
              <button type="button" className="btn btn-primary" disabled>Disabled</button>
            </div>
          </section>

          <section aria-labelledby="field-specimen">
            <h2 id="field-specimen" className="text-4xl">Inputs</h2>
            <form className="panel mt-6 grid max-w-lg gap-4 p-6" onSubmit={(event) => {
              event.preventDefault();
              const email = String(new FormData(event.currentTarget).get("email") ?? "");
              setInvalid(!email.includes("@"));
            }}>
              <label className="grid gap-1.5 text-sm font-semibold">
                Email
                <input name="email" className="field font-normal" type="email" placeholder="you@studio.com" aria-invalid={invalid || undefined} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Note
                <textarea className="field min-h-24 font-normal" placeholder="What should JAH know?" />
              </label>
              {invalid ? <Banner tone="error">Enter a valid email before sending.</Banner> : <Banner tone="info">Fields are 44px tall, with a visible focus ring.</Banner>}
              <button type="submit" className="btn btn-primary w-fit">Check validation</button>
            </form>
          </section>

          <section aria-labelledby="badge-specimen">
            <h2 id="badge-specimen" className="text-4xl">Badges</h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {["draft", "requested", "approved", "paid", "open"].map((status) => <StatusBadge key={status} status={status} />)}
            </div>
          </section>

          <section aria-labelledby="card-specimen">
            <h2 id="card-specimen" className="text-4xl">Cards and metrics</h2>
            <div className="mt-6 grid grid-cols-12 gap-4">
              <div className="col-span-12 sm:col-span-4"><Metric label="Open pipeline" value="$128,400" hint="Quotes that are not paid" /></div>
              <div className="col-span-12 sm:col-span-4"><Metric label="Paid" value="$42,900" hint="Processed quotes" /></div>
              <div className="col-span-12 sm:col-span-4"><Metric label="Quotes" value="18" hint="In this workspace" /></div>
            </div>
          </section>

          <section aria-labelledby="state-specimen" className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7">
              <h2 id="state-specimen" className="text-4xl">Empty and loading</h2>
              <div className="mt-6">
                <EmptyState title="No quotes yet" body="Start from the catalog, or open a blank quote when the room is specified." action={<button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>Open a dialog</button>} />
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <h2 className="text-4xl">Skeleton</h2>
              <div className="mt-6 grid gap-3" aria-hidden>
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-16" />
                <SkeletonBlock className="h-16" />
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
      <Modal open={open} title="Confirm the quote" onClose={close}>
        <p>Dialogs fade in, trap attention on the task, and close with Escape or the close control. On a phone they sit at the bottom of the screen, inside the thumb zone.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={close}>Confirm</button>
          <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
        </div>
      </Modal>
    </>
  );
}
