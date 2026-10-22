"use client";

import { FormEvent, useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { Banner, EmptyState } from "@/components/ui";
import { api } from "@/lib/client";

type Method = {
  id: number;
  type: string;
  brand: string | null;
  last4: string;
  holder_name: string;
  exp_month?: number | null;
  exp_year?: number | null;
  bank_name?: string | null;
};

export default function PaymentsPage() {
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");
  const [kind, setKind] = useState<"card" | "ach">("card");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ payment_methods: Method[] }>("/api/v1/account")
      .then((body) => setMethods(body.payment_methods))
      .catch((reason: Error) => {
        setTone("error");
        setMessage(reason.message);
        setMethods([]);
      });
  }, []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);
    const form = event.currentTarget;
    const payload = Object.fromEntries(
      [...new FormData(form).entries()].filter(([, value]) => String(value).trim() !== ""),
    );
    try {
      const body = await api<{ payment_method: Method }>("/api/v1/account/payment-methods", {
        method: "POST",
        body: JSON.stringify({ ...payload, type: kind }),
      });
      setMethods((rows) => [body.payment_method, ...(rows ?? [])]);
      form.reset();
      setKind("card");
      setTone("success");
      setMessage("Payment method saved.");
    } catch (reason) {
      setTone("error");
      setMessage(reason instanceof Error ? reason.message : "The method was not saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    try {
      await api(`/api/v1/account/payment-methods/${id}`, { method: "DELETE" });
      setMethods((rows) => (rows ?? []).filter((row) => row.id !== id));
      setTone("success");
      setMessage("Payment method removed.");
    } catch (reason) {
      setTone("error");
      setMessage(reason instanceof Error ? reason.message : "Could not remove that method.");
    }
  }

  return (
    <WorkspaceShell
      title="Payments"
      description="Cards and bank accounts on file for quote checkout. We store brand and last four digits only."
    >
      {message ? (
        <div className="mb-5">
          <Banner tone={tone}>{message}</Banner>
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-4 md:gap-5">
        <section className="col-span-12 lg:col-span-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Saved methods</h2>
              <p className="mt-0.5 text-sm text-mist">Used when you pay an approved quote.</p>
            </div>
            {methods && methods.length > 0 ? (
              <span className="text-sm tabular-nums text-mist">{methods.length}</span>
            ) : null}
          </div>

          {methods === null ? <p className="text-sm text-mist">Loading payment methods…</p> : null}

          {methods && methods.length === 0 ? (
            <EmptyState
              title="No methods yet"
              body="Add a card or ACH account before checkout. Only the brand and last four digits are kept."
            />
          ) : null}

          {methods && methods.length > 0 ? (
            <ul className="panel divide-y divide-line overflow-hidden">
              {methods.map((method) => (
                <li key={method.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-foam text-[10px] font-semibold tracking-wide text-ink"
                    aria-hidden
                  >
                    {method.type === "ach" ? "ACH" : (method.brand ?? "CARD").slice(0, 4).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold capitalize text-ink">
                      {method.type === "ach"
                        ? method.bank_name || method.brand || "Bank account"
                        : method.brand || "Card"}{" "}
                      ···· {method.last4}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-mist">
                      {method.holder_name}
                      {method.type === "card" && method.exp_month && method.exp_year
                        ? ` · Exp ${String(method.exp_month).padStart(2, "0")}/${method.exp_year}`
                        : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="min-h-11 shrink-0 px-2 text-sm font-semibold text-copper"
                    onClick={() => remove(method.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="col-span-12 lg:col-span-7">
          <form onSubmit={add} className="panel p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-ink">Add a method</h2>
            <p className="mt-0.5 text-sm text-mist">For checkout only — we never store a full card number here.</p>

            <div className="mt-5 inline-flex rounded-full border border-line bg-foam p-1" role="group" aria-label="Method type">
              {(
                [
                  ["card", "Card"],
                  ["ach", "Bank (ACH)"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`min-h-9 rounded-full px-4 text-sm font-semibold transition-colors ${
                    kind === value ? "bg-ink text-cream" : "text-mist hover:text-ink"
                  }`}
                  aria-pressed={kind === value}
                  onClick={() => setKind(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
                Name on account
                <input name="holder_name" required autoComplete="cc-name" className="field font-normal" placeholder="Jordan Hardison" />
              </label>

              {kind === "card" ? (
                <>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    Card brand
                    <input name="brand" className="field font-normal" placeholder="Visa, Mastercard…" />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    Last 4 digits
                    <input
                      name="last4"
                      required
                      inputMode="numeric"
                      pattern="\d{4}"
                      maxLength={4}
                      autoComplete="off"
                      className="field font-normal"
                      placeholder="4242"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    Exp. month
                    <input
                      name="exp_month"
                      required
                      inputMode="numeric"
                      min={1}
                      max={12}
                      className="field font-normal"
                      placeholder="08"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    Exp. year
                    <input
                      name="exp_year"
                      required
                      inputMode="numeric"
                      min={2024}
                      max={2100}
                      className="field font-normal"
                      placeholder="2028"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    Bank name
                    <input name="bank_name" required className="field font-normal" placeholder="Chase, Wells Fargo…" />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    Account last 4
                    <input
                      name="last4"
                      required
                      inputMode="numeric"
                      pattern="\d{4}"
                      maxLength={4}
                      className="field font-normal"
                      placeholder="1234"
                    />
                  </label>
                  <input type="hidden" name="brand" value="ACH" />
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save method"}
              </button>
              <p className="text-xs text-mist">Secure checkout uses these tokens — full PAN is never collected on this form.</p>
            </div>
          </form>
        </section>
      </div>
    </WorkspaceShell>
  );
}
