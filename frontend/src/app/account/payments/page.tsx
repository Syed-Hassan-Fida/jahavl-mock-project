"use client";

import { FormEvent, useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { api } from "@/lib/client";

type Method = { id: number; type: string; brand: string | null; last4: string; holder_name: string };

export default function PaymentsPage() {
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api<{ payment_methods: Method[] }>("/api/v1/account").then((body) => setMethods(body.payment_methods)).catch((reason: Error) => setMessage(reason.message));
  }, []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const payload = Object.fromEntries([...new FormData(event.currentTarget).entries()].filter(([, value]) => String(value) !== ""));
    try {
      const body = await api<{ payment_method: Method }>("/api/v1/account/payment-methods", { method: "POST", body: JSON.stringify(payload) });
      setMethods((rows) => [body.payment_method, ...(rows ?? [])]);
      event.currentTarget.reset();
      setMessage("Payment method saved.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The method was not saved.");
    }
  }

  return (
    <WorkspaceShell title="Payments" description="Stored cards and bank accounts. Only the brand and last four digits are kept.">
      {message ? <p className="mb-4 text-sm text-copper">{message}</p> : null}
      {methods === null && !message ? <p className="text-sm text-mist">Loading payment methods…</p> : null}
      {methods && methods.length === 0 ? <p className="mb-4 text-sm text-mist">No method saved yet. Add one before paying a quote.</p> : null}
      <ul className="max-w-xl space-y-2">
        {methods?.map((method) => (
          <li key={method.id} className="flex items-center justify-between rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
            <span className="capitalize">{method.type} · {method.brand ?? method.holder_name} · {method.last4}</span>
            <button type="button" className="text-copper" onClick={() => api(`/api/v1/account/payment-methods/${method.id}`, { method: "DELETE" }).then(() => setMethods(methods.filter((row) => row.id !== method.id)))}>Remove</button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 max-w-xl rounded-2xl border border-line bg-paper p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="type" className="field font-normal"><option value="card">Card</option><option value="ach">ACH</option></select>
          <input name="holder_name" required placeholder="Name on account" className="field font-normal" />
          <input name="brand" placeholder="Visa or bank" className="field font-normal" />
          <input name="last4" required pattern="\d{4}" placeholder="Last 4" className="field font-normal" />
          <input name="exp_month" placeholder="Exp month" className="field font-normal" />
          <input name="exp_year" placeholder="Exp year" className="field font-normal" />
          <input name="bank_name" placeholder="Bank, for ACH" className="field font-normal" />
          <input name="provider_id" placeholder="Stripe pm_ id, optional" className="field font-normal" />
        </div>
        <button className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Save method</button>
      </form>
    </WorkspaceShell>
  );
}
