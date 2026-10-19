"use client";

import { FormEvent, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { api } from "@/lib/client";

export default function DealerApplyPage() {
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/v1/dealer-applications", { method: "POST", body: new FormData(event.currentTarget) });
      setMessage("Application received. JAH will approve or reject it before a dealer login exists.");
      event.currentTarget.reset();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The application was not sent.");
    }
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <form onSubmit={onSubmit} className="mx-auto max-w-lg px-5 py-14">
          <p className="text-xs font-semibold tracking-[0.2em] text-copper">DEALERS</p>
          <h1 className="mt-3 text-5xl">Apply for a dealer account</h1>
          <div className="mt-6 grid gap-3">
            <input name="contact_name" required placeholder="Contact name" className="field font-normal" />
            <input name="company_name" required placeholder="Company" className="field font-normal" />
            <input name="email" type="email" required placeholder="Email" className="field font-normal" />
            <input name="phone" placeholder="Phone" className="field font-normal" />
            <input name="ein" placeholder="EIN" className="field font-normal" />
            <input name="years_in_business" type="number" placeholder="Years in business" className="field font-normal" />
            <input name="anticipated_sales" placeholder="Anticipated annual sales" className="field font-normal" />
            <label className="text-sm font-semibold">Resale or business document<input name="file" type="file" className="mt-2 block font-normal" /></label>
          </div>
          {message ? <p className="mt-4 text-sm">{message}</p> : null}
          <button className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream">Submit application</button>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}
