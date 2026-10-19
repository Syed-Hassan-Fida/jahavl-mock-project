"use client";

import { FormEvent, useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { api, sessionUser, type SessionUser } from "@/lib/client";

export default function PreferencesPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tax, setTax] = useState("taxable");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setUser(sessionUser());
    api<{ user: { tax_status: string; sales_tax_percent: string; phone: string | null; company_name: string | null } }>("/api/v1/account")
      .then((body) => setTax(`${body.user.tax_status} · ${body.user.sales_tax_percent}%`))
      .catch((reason: Error) => setMessage(reason.message));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const payload = Object.fromEntries([...new FormData(event.currentTarget).entries()].filter(([, value]) => String(value) !== ""));
    try {
      await api("/api/v1/account", { method: "PATCH", body: JSON.stringify(payload) });
      setMessage("Preferences saved.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Those preferences were not saved.");
    }
  }

  return (
    <WorkspaceShell title="Preferences" description="Company details, password, and sales-tax exemption.">
      {message ? <p className="mb-4 text-sm text-copper">{message}</p> : null}
      {!user ? <p className="text-sm text-mist">Sign in to change preferences.</p> : null}
      {user ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={save} className="rounded-2xl border border-line bg-paper p-5">
            <label className="grid gap-1 text-sm font-semibold">Company<input name="company_name" defaultValue={user.company_name ?? ""} className="field font-normal" /></label>
            <label className="mt-3 grid gap-1 text-sm font-semibold">Phone<input name="phone" defaultValue={user.phone ?? ""} className="field font-normal" /></label>
            <label className="mt-3 grid gap-1 text-sm font-semibold">Current password<input name="current_password" type="password" autoComplete="current-password" className="field font-normal" /></label>
            <label className="mt-3 grid gap-1 text-sm font-semibold">New password<input name="password" type="password" autoComplete="new-password" className="field font-normal" /></label>
            <button className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Save preferences</button>
          </form>
          <form className="rounded-2xl border border-line bg-paper p-5" onSubmit={async (event) => {
            event.preventDefault();
            await api("/api/v1/account/tax-exemption", { method: "POST", body: new FormData(event.currentTarget) });
            setTax("pending");
            setMessage("Exemption request sent.");
          }}>
            <h2 className="text-2xl">Sales tax</h2>
            <p className="mt-2 text-sm text-mist">Status: {tax}. An approved exemption removes tax from later quotes. JAH sets the rate.</p>
            <textarea name="note" placeholder="Certificate details" className="field mt-4 min-h-24 font-normal" />
            <input name="file" type="file" className="mt-3 block text-sm" />
            <button className="mt-4 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold">Request exemption</button>
          </form>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
