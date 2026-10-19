"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { api, saveSession, type SessionUser } from "@/lib/client";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const body = await api<{ token: string; user: SessionUser }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      saveSession(body.token, body.user);
      router.push("/account");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The account was not created.");
    }
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <form onSubmit={onSubmit} className="mx-auto max-w-lg px-5 py-14">
          <h1 className="text-5xl">Create an account</h1>
          <p className="mt-3 text-mist">Clients and companies can register here. Dealer accounts start as an application and stay closed until JAH approves them.</p>
          <div className="mt-6 grid gap-3">
            <select name="account_type" className="field font-normal"><option value="client">Client</option><option value="company">Company</option></select>
            <input name="name" required placeholder="Your name" className="field font-normal" />
            <input name="company_name" placeholder="Company name" className="field font-normal" />
            <input name="phone" placeholder="Phone" className="field font-normal" />
            <input name="email" type="email" required placeholder="Email" className="field font-normal" />
            <input name="password" type="password" required minLength={8} placeholder="Password" className="field font-normal" />
          </div>
          {error ? <p className="mt-4 text-sm text-copper">{error}</p> : null}
          <button className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream">Create account</button>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}
