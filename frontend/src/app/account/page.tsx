"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { money } from "@/lib/api";
import { api, sessionUser, type SessionUser } from "@/lib/client";
import type { LiveEvent } from "@/lib/live";

type Quote = { id: number; name: string; type: string; status: string; status_code: number; total: string; checkout_allowed: boolean; owner: string | null };
type Note = { id: number; title: string; body: string; read_at: string | null };

export default function AccountPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = sessionUser();
    setUser(current);
    if (!current) {
      setQuotes([]);
      return;
    }
    Promise.all([
      api<{ quotes: Quote[] }>("/api/v1/quotes"),
      api<{ notifications: Note[] }>("/api/v1/notifications"),
    ])
      .then(([quoteBody, noteBody]) => {
        setQuotes(quoteBody.quotes);
        setNotes(noteBody.notifications);
      })
      .catch((reason: Error) => {
        setError(reason.message);
        setQuotes([]);
      });
  }, []);

  useEffect(() => {
    function onLive(event: Event) {
      const detail = (event as CustomEvent<LiveEvent>).detail;
      const note = detail.payload.notification;
      if (detail.name !== "notification" || !note) return;
      setNotes((rows) => (rows.some((row) => row.id === note.id) ? rows : [note, ...rows]));
    }
    window.addEventListener("jah-live", onLive);
    return () => window.removeEventListener("jah-live", onLive);
  }, []);

  const rows = (quotes ?? []).filter((quote) => quote.type === "quote");
  const open = rows.filter((quote) => quote.status !== "paid");
  const review = rows.filter((quote) => quote.status === "requested");
  const payable = rows.filter((quote) => quote.checkout_allowed && quote.status === "approved");
  const paid = rows.filter((quote) => quote.status === "paid");
  const openValue = open.reduce((sum, quote) => sum + Number(quote.total), 0);

  return (
    <WorkspaceShell title={user ? `Hello, ${user.name.split(" ")[0]}` : "Workspace"} description="Quotes in motion, what is waiting on you, and the latest notes from JAH.">
      {!user ? (
        <div className="max-w-md rounded-2xl border border-line bg-paper p-6">
          <p>Sign in to open this workspace.</p>
          <Link href="/login" className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Sign in</Link>
        </div>
      ) : null}
      {error ? <p className="mb-4 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-copper">{error}</p> : null}
      {user && quotes === null ? <p className="text-sm text-mist">Loading your workspace…</p> : null}
      {user && quotes ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Open quotes" value={String(open.length)} hint={money(openValue)} />
            <Metric label="In review" value={String(review.length)} hint="Submitted to JAH" />
            <Metric label="Ready to pay" value={String(payable.length)} hint="Checkout is open" />
            <Metric label="Paid" value={String(paid.length)} hint="Status 5" />
          </section>
          <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="overflow-hidden rounded-2xl border border-line bg-paper">
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-2xl">Recent quotes</h2>
                <Link href="/account/quotes" className="text-sm font-semibold text-copper">View all</Link>
              </div>
              {rows.length === 0 ? (
                <div className="border-t border-line px-4 py-8">
                  <p className="font-semibold">No quotes yet</p>
                  <p className="mt-1 text-sm text-mist">Start from the catalog or open a blank quote.</p>
                  <Link href="/led" className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Browse LED walls</Link>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <tbody>
                    {rows.slice(0, 6).map((quote) => (
                      <tr key={quote.id} className="border-t border-line">
                        <td className="px-4 py-3">
                          <Link href={`/quotes/${quote.id}`} className="font-semibold hover:underline">{quote.name}</Link>
                          <p className="text-xs text-mist">{quote.owner ?? "You"} · status {quote.status_code}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="capitalize">{quote.status}</span>
                          <p className="tabular-nums text-mist">{money(quote.total)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-paper p-4">
                <h2 className="text-2xl">Quick actions</h2>
                <div className="mt-3 grid gap-2">
                  <Quick href="/account/quotes" label="New quote" detail="Blank quote in your account" create="quote" />
                  <Link href="/account/tickets" className="rounded-xl px-3 py-2 hover:bg-foam">
                    <span className="block text-sm font-semibold">Open a ticket</span>
                    <span className="text-xs text-mist">Service on an install or order</span>
                  </Link>
                  <Link href="/account/payments" className="rounded-xl px-3 py-2 hover:bg-foam">
                    <span className="block text-sm font-semibold">Payment methods</span>
                    <span className="text-xs text-mist">Card or ACH, last four only</span>
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-paper p-4">
                <h2 className="text-2xl">Recent activity</h2>
                {notes.length === 0 ? <p className="mt-3 text-sm text-mist">Activity shows up when a quote, payment, or ticket changes.</p> : null}
                <ul className="mt-2">
                  {notes.slice(0, 5).map((note) => (
                    <li key={note.id} className="border-t border-line py-3 first:border-t-0">
                      <p className="text-sm font-semibold">{note.title}</p>
                      <p className="text-xs text-mist">{note.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </WorkspaceShell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-4">
      <p className="text-xs font-semibold tracking-wide text-mist">{label}</p>
      <p className="mt-2 text-3xl tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-mist">{hint}</p>
    </div>
  );
}

function Quick({ label, detail, create }: { href: string; label: string; detail: string; create: "quote" | "wishlist" }) {
  return (
    <button
      type="button"
      className="rounded-xl px-3 py-2 text-left hover:bg-foam"
      onClick={() => api<{ quote: { id: number } }>("/api/v1/quotes", { method: "POST", body: JSON.stringify({ name: "New quote", type: create }) }).then((body) => { window.location.href = `/quotes/${body.quote.id}`; })}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className="text-xs text-mist">{detail}</span>
    </button>
  );
}
