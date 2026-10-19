"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { API_URL } from "@/lib/api";
import { company } from "@/lib/copy";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-5 py-16">Loading the form…</div>}>
          <ContactForm />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

function ContactForm() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const interest = params.get("interest") ?? "LED";
  const note = params.get("note") ?? "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${API_URL}/api/v1/inquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        organization: form.get("organization"),
        interest: form.get("interest"),
        message: form.get("message"),
      }),
    });
    let body: { message?: string } = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }
    if (!response.ok) {
      setStatus("error");
      setError(body.message ?? "Check the required fields and try again.");
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 md:grid-cols-[0.9fr_1.1fr] md:py-20">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-copper">CONTACT</p>
        <h1 className="mt-3 text-4xl sm:text-6xl lg:text-7xl">Tell us about the room.</h1>
        <p className="mt-4 text-lg leading-relaxed text-mist">
          Worship hall, venue, or tour. Name the series if you already have one, or describe the size of the platform.
        </p>
        <div className="mt-8 overflow-hidden rounded-3xl bg-night">
          <img src="/catalog/1_Intelligent_Hybrid_Front.png" alt="Intelligent hybrid moving light" className="h-56 w-full object-contain p-6" />
        </div>
        <address className="mt-8 space-y-1 text-sm not-italic text-ink">
          <p className="font-semibold">JAH Audio</p>
          <p>{company.street}</p>
          <p>{company.city}</p>
          <p><a className="underline decoration-line underline-offset-4" href={company.phoneHref}>{company.phone}</a></p>
          <p><a className="underline decoration-line underline-offset-4" href={`mailto:${company.email}`}>{company.email}</a></p>
        </address>
        <ul className="mt-8 space-y-3 text-sm text-mist">
          <li>A person at JAH reads this. It is not an auto-reply checkout.</li>
          <li>Dealer applications use the same form. Choose “Dealer application.”</li>
          <li>Prices on the catalog are samples. Net pricing does not appear here.</li>
        </ul>
      </div>
      {status === "sent" ? (
        <div className="rounded-3xl bg-paper p-8 ring-1 ring-line">
          <h2 className="text-4xl">Message received.</h2>
          <p className="mt-3 text-mist">We have the room notes. A specialist will reply by email.</p>
          <button type="button" className="mt-6 text-sm font-semibold underline" onClick={() => setStatus("idle")}>
            Send another
          </button>
        </div>
      ) : (
        <form method="post" action="/contact" onSubmit={onSubmit} className="grid gap-4 rounded-3xl bg-paper p-6 ring-1 ring-line md:p-8">
          <Field label="Name" name="name" required autoComplete="name" />
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
          <Field label="Church or company" name="organization" autoComplete="organization" />
          <label className="grid gap-1.5 text-sm font-semibold">
            Interest
            <select name="interest" className="field font-normal" defaultValue={interest}>
              <option>LED</option>
              <option>Lighting</option>
              <option>Audio</option>
              <option>Dealer application</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            What are you building?
            <textarea name="message" required defaultValue={note} className="field min-h-36 font-normal" />
          </label>
          <button type="submit" disabled={status === "sending"} className="mt-2 w-fit rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60">
            {status === "sending" ? "Sending…" : "Send to JAH"}
          </button>
          {error ? <p className="text-sm text-copper">{error}</p> : null}
        </form>
      )}
    </div>
  );
}

function Field({ label, name, type = "text", required = false, autoComplete }: { label: string; name: string; type?: string; required?: boolean; autoComplete?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      <input name={name} type={type} required={required} autoComplete={autoComplete} className="field font-normal" />
    </label>
  );
}
