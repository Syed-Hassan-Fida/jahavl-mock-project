"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    let body: { message?: string; token?: string; user?: { role?: string } } = {};
    try {
      body = await response.json();
    } catch {
      setPending(false);
      setError("Sign-in did not return a usable response. Try again.");
      return;
    }
    if (!response.ok || !body.token || !body.user) {
      setPending(false);
      setError(body.message ?? "Those credentials were not recognized.");
      return;
    }
    localStorage.setItem("jah_token", body.token);
    localStorage.setItem("jah_user", JSON.stringify(body.user));
    const next = new URLSearchParams(window.location.search).get("next");
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    router.push(safe ?? (body.user.role === "admin" || body.user.role === "sales" ? "/admin" : "/account"));
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl md:grid-cols-2">
          <div className="relative hidden overflow-hidden bg-night md:block">
            <img src="/catalog/1_J_Series.png" alt="J Series LED cabinet" className="absolute inset-0 h-full w-full bg-[#2a313b] object-contain p-8" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night via-night/80 to-transparent p-10">
              <p className="display text-5xl leading-none text-cream">Your quotes, net price, and pipeline.</p>
              <p className="mt-3 max-w-sm text-haze">Clients follow quote status. Dealers see cost. Admin and sales see the pipeline.</p>
            </div>
          </div>
          <div className="flex items-center px-5 py-14 md:px-12">
            <form method="post" action="/login" onSubmit={onSubmit} className="w-full max-w-md">
              <h1 className="text-5xl">Sign in</h1>
              <p className="mt-3 text-sm text-mist">Use the account you were given for this demo.</p>
              <label className="mt-6 grid gap-1.5 text-sm font-semibold">
                Email
                <input name="email" type="email" required autoComplete="username" aria-invalid={error ? true : undefined} className="field font-normal" />
              </label>
              <label className="mt-4 grid gap-1.5 text-sm font-semibold">
                Password
                <input name="password" type="password" required autoComplete="current-password" aria-invalid={error ? true : undefined} className="field font-normal" />
              </label>
              {error ? <p className="mt-4 text-sm text-copper" role="alert">{error}</p> : null}
              <button type="submit" disabled={pending} className="btn btn-primary mt-6">
                {pending ? "Signing in…" : "Continue"}
              </button>
              <p className="mt-5 text-sm text-mist">
                <Link href="/register" className="font-semibold text-ink">Create a client account</Link>
                <span> · </span>
                <Link href="/forgot" className="font-semibold text-ink">Reset a password</Link>
              </p>
            </form>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
