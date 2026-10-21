"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, Fragment, useEffect, useState } from "react";
import { Icon, IconButton } from "@/components/Icons";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { ConfirmDialog, toast } from "@/components/ui";
import { API_URL, money } from "@/lib/api";
import { api, authHeaders } from "@/lib/client";

type Line = {
  id: number;
  parent_id: number | null;
  kind: string;
  label: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
};

type Quote = {
  id: number;
  name: string;
  type: string;
  status: string;
  status_code: number;
  shipping: string;
  discount: string;
  tax: string;
  total: string;
  commission: string | null;
  checkout_allowed: boolean;
  purchased_at: string | null;
  charge_id: string | null;
  notes: string | null;
  owner: { id?: number; name: string; role: string } | null;
  assigned_to: { id: number; name: string; role: string } | null;
  sales: { id: number; name: string; role: string } | null;
  dealer: { id: number; name: string; role: string } | null;
  items: Line[];
  payments: { id: number; amount: string; kind: string; status: string; note: string | null }[];
  permissions: Record<string, boolean>;
};

type Hit = { id: number; name: string; list_price: string };

const tones: Record<string, string> = {
  added: "bg-foam text-ink",
  requested: "bg-amber-100 text-amber-950",
  approved: "bg-emerald-100 text-emerald-950",
  rejected: "bg-rose-100 text-rose-950",
  paid: "bg-sky-100 text-sky-950",
  expired: "bg-stone-200 text-stone-800",
};

type Person = { id: number; name: string; role: string };

export default function QuotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<Hit[]>([]);
  const [methods, setMethods] = useState<{ id: number; type: string; brand: string | null; last4: string }[]>([]);
  const [packageLines, setPackageLines] = useState<{ product_id: number; quantity: number; name: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function load() {
    const body = await api<{ quote: Quote }>(`/api/v1/quotes/${params.id}`);
    setQuote(body.quote);
  }

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
    api<{ payment_methods: { id: number; type: string; brand: string | null; last4: string }[] }>("/api/v1/account")
      .then((body) => setMethods(body.payment_methods))
      .catch(() => setMethods([]));
  }, [params.id]);

  async function act(path: string, payload?: unknown, method = "POST") {
    setError(null);
    try {
      const body = await api<{ quote: Quote }>(path, { method, body: payload === undefined ? undefined : JSON.stringify(payload) });
      setQuote(body.quote);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That change was not saved.");
    }
  }

  async function search(query: string) {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const body = await api<{ products: Hit[] }>(`/api/v1/catalog/search?q=${encodeURIComponent(query)}`);
    setHits(body.products);
  }

  async function openPdf() {
    const response = await fetch(`${API_URL}/api/v1/quotes/${params.id}/pdf`, { headers: authHeaders(false) });
    if (!response.ok) {
      setError("The PDF could not be opened.");
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    window.open(url, "_blank", "noopener");
  }

  const parents = quote?.items.filter((item) => item.parent_id === null) ?? [];

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-5xl">
          {error ? <p className="mb-4 rounded-2xl bg-paper px-4 py-3 text-sm text-copper">{error}</p> : null}
          {!quote ? <p className="text-mist">Loading the quote…</p> : null}
          {quote ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.2em] text-copper">{quote.type.toUpperCase()} · STATUS {quote.status_code}</p>
                  <h1 className="mt-2 text-3xl break-words sm:text-5xl">{quote.name}</h1>
                  <p className="mt-2 text-sm text-mist">{quote.owner ? `${quote.owner.name} · ${quote.owner.role}` : "Your quote"}{quote.assigned_to ? ` · assigned to ${quote.assigned_to.name}` : ""}{quote.sales ? ` · sales ${quote.sales.name}` : ""}{quote.dealer ? ` · dealer ${quote.dealer.name}` : ""}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${tones[quote.status] ?? "bg-foam"}`}>{quote.status}</span>
              </div>

              <section className="mt-8 overflow-x-auto rounded-3xl border border-line bg-paper">
                <table className="w-full min-w-[20rem] text-left text-sm">
                  <thead className="text-mist">
                    <tr>
                      <th className="px-5 py-3 font-medium">Line</th>
                      <th className="px-5 py-3 font-medium">Qty</th>
                      <th className="px-5 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parents.map((item) => (
                      <Fragment key={item.id}>
                        <tr className="border-t border-line">
                          <td className="px-5 py-3">
                            <p className="font-semibold">{item.label}</p>
                            <p className="text-xs capitalize text-mist">{item.kind}</p>
                          </td>
                          <td className="px-5 py-3">
                            {quote.permissions.edit && item.kind !== "package" ? (
                              <input
                                className="field w-20 font-normal"
                                type="number"
                                min={1}
                                defaultValue={item.quantity}
                                onBlur={(event) => act(`/api/v1/quotes/${quote.id}/items/${item.id}`, { quantity: Number(event.target.value) }, "PATCH")}
                              />
                            ) : (
                              item.quantity
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="inline-flex items-center justify-end gap-1">
                              <span className="tabular-nums">{money(item.line_total)}</span>
                              {quote.permissions.edit ? (
                                <IconButton label={`Remove ${item.label ?? "line"}`} name="trash" tone="danger" onClick={() => act(`/api/v1/quotes/${quote.id}/items/${item.id}`, undefined, "DELETE")} />
                              ) : null}
                            </span>
                          </td>
                        </tr>
                        {quote.items
                          .filter((child) => child.parent_id === item.id)
                          .map((child) => (
                            <tr key={child.id} className="border-t border-line bg-cream/60">
                              <td className="px-5 py-2 pl-10 text-mist">{child.label}</td>
                              <td className="px-5 py-2">{child.quantity}</td>
                              <td className="px-5 py-2 text-right text-mist">{money(child.line_total)}</td>
                            </tr>
                          ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                <dl className="grid gap-2 border-t border-line px-5 py-4 text-sm sm:grid-cols-4">
                  <div><dt className="text-mist">Shipping</dt><dd className="font-semibold tabular-nums">{money(quote.shipping)}</dd></div>
                  <div><dt className="text-mist">Discount</dt><dd className="font-semibold tabular-nums">{money(quote.discount)}</dd></div>
                  <div><dt className="text-mist">Tax</dt><dd className="font-semibold tabular-nums">{money(quote.tax)}</dd></div>
                  <div><dt className="text-mist">Total</dt><dd className="text-lg font-semibold tabular-nums">{money(quote.total)}</dd></div>
                </dl>
              </section>

              {quote.permissions.edit ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <form
                    className="rounded-3xl border border-line bg-paper p-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      act(`/api/v1/quotes/${quote.id}`, {
                        name: form.get("name"),
                        shipping: form.get("shipping"),
                        discount: form.get("discount"),
                        notes: form.get("notes"),
                        ...(quote.commission !== null ? { commission: form.get("commission") } : {}),
                      }, "PATCH");
                    }}
                  >
                    <h2 className="text-3xl">Header</h2>
                    <label className="mt-4 grid gap-1 text-sm font-semibold">Name<input name="name" defaultValue={quote.name} className="field font-normal" /></label>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="grid gap-1 text-sm font-semibold">Shipping<input name="shipping" defaultValue={quote.shipping} className="field font-normal" /></label>
                      <label className="grid gap-1 text-sm font-semibold">Discount<input name="discount" defaultValue={quote.discount} className="field font-normal" /></label>
                    </div>
                    {quote.commission !== null ? (
                      <label className="mt-3 grid gap-1 text-sm font-semibold">Commission<input name="commission" defaultValue={quote.commission} className="field font-normal" /></label>
                    ) : null}
                    <label className="mt-3 grid gap-1 text-sm font-semibold">Notes<textarea name="notes" defaultValue={quote.notes ?? ""} className="field min-h-24 font-normal" /></label>
                    <button className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Save header</button>
                  </form>
                  <div className="rounded-3xl border border-line bg-paper p-5">
                    <h2 className="text-3xl">Add a line</h2>
                    <input className="field mt-4 font-normal" placeholder="Search the catalog" onChange={(event) => search(event.target.value)} />
                    <ul className="mt-3 space-y-2">
                      {hits.map((hit) => (
                        <li key={hit.id}>
                          <button type="button" className="flex w-full justify-between rounded-xl bg-cream px-3 py-2 text-left text-sm" onClick={() => { setHits([]); act(`/api/v1/quotes/${quote.id}/items`, { product_id: hit.id, quantity: 1 }); }}>
                            <span>{hit.name}</span><span>{money(hit.list_price)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <form className="mt-4 grid gap-2" onSubmit={(event: FormEvent<HTMLFormElement>) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      act(`/api/v1/quotes/${quote.id}/expenses`, { label: form.get("label"), amount: form.get("amount"), quantity: 1 });
                      event.currentTarget.reset();
                    }}>
                      <p className="text-sm font-semibold">Manual expense</p>
                      <input name="label" required placeholder="Labor, freight, lift" className="field font-normal" />
                      <input name="amount" required placeholder="Amount" className="field font-normal" />
                      <button className="w-fit rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold">Add expense</button>
                    </form>
                    <form className="mt-4 grid gap-2" onSubmit={(event: FormEvent<HTMLFormElement>) => {
                      event.preventDefault();
                      const name = String(new FormData(event.currentTarget).get("package"));
                      if (!name || packageLines.length === 0) return;
                      act(`/api/v1/quotes/${quote.id}/packages`, { name, lines: packageLines });
                      setPackageLines([]);
                      event.currentTarget.reset();
                    }}>
                      <p className="text-sm font-semibold">Package</p>
                      <input name="package" required placeholder="Package name" className="field font-normal" />
                      <p className="text-xs text-mist">{packageLines.length ? packageLines.map((line) => line.name).join(", ") : "Search above, then add products into this package."}</p>
                      <div className="flex gap-2">
                        <button type="button" className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold" onClick={() => hits[0] && setPackageLines((lines) => [...lines, { product_id: hits[0].id, quantity: 1, name: hits[0].name }])}>
                          Use first search hit
                        </button>
                        <button className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream"><Icon name="check" /> Save package</button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {quote.permissions.submit ? <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream" onClick={() => act(`/api/v1/quotes/${quote.id}/submit`)}>Submit for review</button> : null}
                {quote.permissions.revise ? <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream" onClick={() => act(`/api/v1/quotes/${quote.id}/revise`)}>Revise and reopen</button> : null}
                {quote.permissions.review ? (
                  <>
                    <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream" onClick={() => act(`/api/v1/quotes/${quote.id}/review`, { decision: "approved" })}>Approve</button>
                    <button className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold" onClick={() => act(`/api/v1/quotes/${quote.id}/review`, { decision: "rejected" })}>Reject</button>
                  </>
                ) : null}
                {quote.permissions.convert ? <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream" onClick={() => act(`/api/v1/quotes/${quote.id}/convert`)}>Convert wishlist to quote</button> : null}
                {quote.permissions.checkout_toggle ? (
                  <button className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold" onClick={() => act(`/api/v1/quotes/${quote.id}/checkout`, { allowed: !quote.checkout_allowed })}>
                    {quote.checkout_allowed ? "Close checkout" : "Allow checkout"}
                  </button>
                ) : null}
                {quote.permissions.purchased ? <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream" onClick={() => act(`/api/v1/quotes/${quote.id}/purchased`)}>Mark purchased</button> : null}
                {quote.permissions.expire ? <button className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold" onClick={() => act(`/api/v1/quotes/${quote.id}/expire`)}>Mark expired</button> : null}
                {quote.permissions.delete ? <button type="button" className="btn btn-secondary text-copper" onClick={() => setConfirmDelete(true)}><Icon name="trash" /> Delete quote</button> : null}
                <button type="button" className="btn btn-secondary" onClick={openPdf}><Icon name="download" /> Open PDF</button>
                <Link href="/account/quotes" className="btn btn-secondary">Back to quotes</Link>
              </div>

              {quote.permissions.assign ? (
                <form className="panel mt-4 p-5" onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  if (people.length === 0) {
                    api<{ users: Person[] }>("/api/v1/people").then((body) => setPeople(body.users)).catch((reason: Error) => setError(reason.message));
                  }
                  const value = (key: string) => {
                    const raw = String(form.get(key) ?? "");
                    return raw === "" ? null : Number(raw);
                  };
                  act(`/api/v1/quotes/${quote.id}/assign`, {
                    assigned_user_id: value("assigned_user_id"),
                    sales_user_id: value("sales_user_id"),
                    dealer_user_id: value("dealer_user_id"),
                  });
                }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-3xl">Assign</h2>
                    {people.length === 0 ? <button type="button" className="btn btn-secondary" onClick={() => api<{ users: Person[] }>("/api/v1/people").then((body) => setPeople(body.users))}>Load accounts</button> : null}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1 text-sm font-semibold">Client or dealer
                    <select name="assigned_user_id" className="field font-normal" defaultValue={quote.assigned_to?.id ?? ""}>
                      <option value="">Unassigned</option>
                      {people.filter((person) => person.role === "client" || person.role === "dealer").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">Sales
                    <select name="sales_user_id" className="field font-normal" defaultValue={quote.sales?.id ?? ""}>
                      <option value="">None</option>
                      {people.filter((person) => person.role === "sales").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">Dealer
                    <select name="dealer_user_id" className="field font-normal" defaultValue={quote.dealer?.id ?? ""}>
                      <option value="">None</option>
                      {people.filter((person) => person.role === "dealer").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </label>
                  </div>
                  <button className="btn btn-primary mt-4">Save assignment</button>
                </form>
              ) : null}

              {quote.permissions.pay ? (
                <form className="mt-6 rounded-3xl border border-line bg-paper p-5" onSubmit={(event) => {
                  event.preventDefault();
                  const id = Number(new FormData(event.currentTarget).get("method"));
                  act(`/api/v1/quotes/${quote.id}/pay`, { payment_method_id: id });
                }}>
                  <h2 className="text-3xl">Pay</h2>
                  <p className="mt-2 text-sm text-mist">Checkout is open. The charge uses a stored card or bank account. Full account numbers are not kept here. If Stripe is not configured, the payment is recorded in this workspace and nothing is sent to a bank.</p>
                  <select name="method" className="field mt-4 font-normal" required>
                    <option value="">Choose a saved method</option>
                    {methods.map((method) => (
                      <option key={method.id} value={method.id}>{method.type} · {method.brand ?? "Account"} · {method.last4}</option>
                    ))}
                  </select>
                  <button className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Pay {money(quote.total)}</button>
                  {methods.length === 0 ? <p className="mt-3 text-sm text-mist">Add a card or ACH account on the account page first.</p> : null}
                </form>
              ) : null}

              {quote.permissions.manual_pay ? (
                <form className="panel mt-4 p-5" onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  act(`/api/v1/quotes/${quote.id}/manual-payment`, { amount: form.get("amount"), note: form.get("note") });
                }}>
                  <h2 className="text-3xl">Manual payment</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-semibold">Amount<input name="amount" required type="number" min="0.01" step="0.01" className="field font-normal" /></label>
                    <label className="grid gap-1 text-sm font-semibold">Note<input name="note" placeholder="Check or wire" className="field font-normal" /></label>
                  </div>
                  <button className="btn btn-secondary mt-4">Record payment</button>
                </form>
              ) : null}

              {quote.payments.length ? (
                <section className="mt-6 rounded-3xl border border-line bg-paper p-5">
                  <h2 className="text-3xl">Payments</h2>
                  <ul className="mt-3 space-y-3 text-sm">
                    {quote.payments.map((payment) => (
                      <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                        <span>{payment.kind} · {payment.status} · {money(payment.amount)}</span>
                        {quote.permissions.refund && payment.status !== "refunded" ? (
                          <button className="text-copper" onClick={() => act(`/api/v1/payments/${payment.id}/refund`, { amount: payment.amount, reason: "Refund from workspace" })}>Refund</button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {quote.charge_id ? <p className="mt-3 text-xs text-mist">Charge {quote.charge_id}</p> : null}
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      <ConfirmDialog open={confirmDelete} title="Delete this quote?" body="The quote and its lines will be removed. This cannot be undone." confirmLabel="Delete quote" onClose={() => setConfirmDelete(false)} onConfirm={async () => { if (!quote) return; setConfirmDelete(false); await api(`/api/v1/quotes/${quote.id}`, { method: "DELETE" }); toast("Quote deleted.", "success"); router.push("/account/quotes"); }} />
    </WorkspaceShell>
  );
}
