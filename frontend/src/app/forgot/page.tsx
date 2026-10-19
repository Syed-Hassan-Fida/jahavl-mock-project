"use client";

import { FormEvent, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { api } from "@/lib/client";

export default function ForgotPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-cream text-ink">
        <div className="mx-auto max-w-lg px-5 py-14">
          <h1 className="text-5xl">Reset password</h1>
          <form className="mt-6 grid gap-3" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const nextEmail = String(form.get("email"));
            const body = await api<{ message: string; reset_token?: string }>("/api/v1/auth/forgot", { method: "POST", body: JSON.stringify({ email: nextEmail }) });
            setEmail(nextEmail);
            setToken(body.reset_token ?? null);
            setMessage(body.message);
          }}>
            <input name="email" type="email" required placeholder="Email" className="field font-normal" />
            <button className="w-fit rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream">Send reset code</button>
          </form>
          {message ? <p className="mt-4 text-sm text-mist">{message}</p> : null}
          {token ? <p className="mt-2 text-sm">Local reset code: <span className="font-semibold">{token}</span></p> : null}
          {email ? (
            <form className="mt-6 grid gap-3" onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const body = await api<{ message: string }>("/api/v1/auth/reset", { method: "POST", body: JSON.stringify({ email, token: form.get("token"), password: form.get("password") }) });
              setMessage(body.message);
            }}>
              <input name="token" required defaultValue={token ?? ""} placeholder="Reset code" className="field font-normal" />
              <input name="password" type="password" required minLength={8} placeholder="New password" className="field font-normal" />
              <button className="w-fit rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold">Update password</button>
            </form>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
