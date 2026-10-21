"use client";

import { FormEvent, useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { Banner } from "@/components/ui";
import { api, sessionUser, type SessionUser } from "@/lib/client";

export default function PreferencesPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tax, setTax] = useState("taxable");
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");

  useEffect(() => {
    setUser(sessionUser());
    api<{ user: { tax_status: string; sales_tax_percent: string; phone: string | null; company_name: string | null } }>("/api/v1/account")
      .then((body) => setTax(`${body.user.tax_status} · ${body.user.sales_tax_percent}%`))
      .catch((reason: Error) => { setTone("error"); setMessage(reason.message); });
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const payload = Object.fromEntries([...new FormData(event.currentTarget).entries()].filter(([, value]) => String(value) !== ""));
    try {
      await api("/api/v1/account", { method: "PATCH", body: JSON.stringify(payload) });
      setTone("success");
      setMessage("Preferences saved.");
    } catch (reason) {
      setTone("error");
      setMessage(reason instanceof Error ? reason.message : "Those preferences were not saved.");
    }
  }

  return (
    <WorkspaceShell title="Preferences" description="Company details, password, and sales-tax exemption.">
      {message ? <div className="mb-4"><Banner tone={tone}>{message}</Banner></div> : null}
      {!user ? <p className="text-sm text-mist">Sign in to change preferences.</p> : null}
      {user ? (
        <div className="grid grid-cols-12 gap-4 md:gap-5">
          <form onSubmit={save} className="panel col-span-12 p-5 sm:p-6 lg:col-span-6">
            <h2 className="text-3xl">Company and password</h2>
            <p className="mt-1 text-sm text-mist">Leave the password fields blank to keep the current one.</p>
            <label className="mt-5 grid gap-1.5 text-sm font-semibold">Company<input name="company_name" defaultValue={user.company_name ?? ""} className="field font-normal" /></label>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold">Phone<input name="phone" defaultValue={user.phone ?? ""} className="field font-normal" /></label>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold">Current password<input name="current_password" type="password" autoComplete="current-password" className="field font-normal" /></label>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold">New password<input name="password" type="password" autoComplete="new-password" className="field font-normal" /></label>
            <button className="btn btn-primary mt-6">Save preferences</button>
          </form>
          <form className="panel col-span-12 p-5 sm:p-6 lg:col-span-6" onSubmit={async (event) => {
            event.preventDefault();
            try {
              await api("/api/v1/account/tax-exemption", { method: "POST", body: new FormData(event.currentTarget) });
              setTax("pending");
              setTone("success");
              setMessage("Exemption request sent.");
            } catch (reason) {
              setTone("error");
              setMessage(reason instanceof Error ? reason.message : "The exemption request was not sent.");
            }
          }}>
            <h2 className="text-3xl">Sales tax</h2>
            <p className="mt-2 text-sm leading-relaxed text-mist">Status: {tax}. An approved exemption removes tax from later quotes. JAH sets the rate.</p>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold">Certificate details
              <textarea name="note" placeholder="Certificate number, state, expiration" className="field min-h-28 font-normal" />
            </label>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold">Certificate file
              <input name="file" type="file" className="text-sm" />
            </label>
            <button className="btn btn-secondary mt-6">Request exemption</button>
          </form>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
