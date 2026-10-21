"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { Banner, EmptyState, Metric, SkeletonBlock, StatusBadge } from "@/components/ui";
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
        <EmptyState title="Sign in" body="This workspace keeps your quotes, payments, and notes in one place." action={<Link href="/login" className="btn btn-primary">Sign in</Link>} />
      ) : null}
      {error ? <div className="mb-4"><Banner tone="error">{error}</Banner></div> : null}
      {user && quotes === null ? <AccountSkeleton /> : null}
      {user && quotes ? (
        <div className="rise grid grid-cols-12 gap-4 md:gap-5">
          <section className="col-span-12 grid grid-cols-12 gap-4 md:gap-5" aria-label="Quote summary">
            <div className="col-span-12 sm:col-span-6 xl:col-span-3"><Metric label="Open quotes" value={String(open.length)} hint={money(openValue)} /></div>
            <div className="col-span-12 sm:col-span-6 xl:col-span-3"><Metric label="In review" value={String(review.length)} hint="Submitted to JAH" /></div>
            <div className="col-span-12 sm:col-span-6 xl:col-span-3"><Metric label="Ready to pay" value={String(payable.length)} hint="Checkout is open" /></div>
            <div className="col-span-12 sm:col-span-6 xl:col-span-3"><Metric label="Paid" value={String(paid.length)} hint="Completed orders" /></div>
          </section>
          <section className="panel col-span-12 overflow-hidden lg:col-span-8" aria-labelledby="recent-quotes">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 id="recent-quotes" className="text-3xl">Recent quotes</h2>
              <Link href="/account/quotes" className="text-sm font-semibold text-copper">View all</Link>
            </div>
            {rows.length === 0 ? (
              <div className="border-t border-line px-5 py-8">
                <p className="font-semibold">No quotes yet</p>
                <p className="mt-1 text-sm text-mist">Start from the catalog or open a blank quote.</p>
                <Link href="/led" className="btn btn-primary mt-4">Browse LED walls</Link>
              </div>
            ) : (
              <ul>
                {rows.slice(0, 6).map((quote) => (
                  <li key={quote.id} className="border-t border-line">
                    <Link href={`/quotes/${quote.id}`} className="grid min-h-16 items-center gap-2 px-5 py-3 hover:bg-foam sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-4">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{quote.name}</span>
                        <span className="mt-0.5 block text-xs text-mist">{quote.owner ?? "You"} · status {quote.status_code}</span>
                      </span>
                      <StatusBadge status={quote.status} />
                      <span className="text-sm font-semibold tabular-nums sm:text-right">{money(quote.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="col-span-12 grid gap-4 lg:col-span-4">
            <section className="panel p-5" aria-labelledby="quick-actions">
              <h2 id="quick-actions" className="text-3xl">Quick actions</h2>
              <div className="mt-3 grid gap-1">
                <Quick href="/account/quotes" label="New quote" detail="Blank quote in your account" create="quote" />
                <Link href="/account/tickets" className="min-h-11 rounded-xl px-3 py-2 hover:bg-foam">
                  <span className="block text-sm font-semibold">Open a ticket</span>
                  <span className="text-xs text-mist">Service on an install or order</span>
                </Link>
                <Link href="/account/payments" className="min-h-11 rounded-xl px-3 py-2 hover:bg-foam">
                  <span className="block text-sm font-semibold">Payment methods</span>
                  <span className="text-xs text-mist">Card or ACH, last four only</span>
                </Link>
              </div>
            </section>
            <section className="panel p-5" aria-labelledby="recent-activity">
              <h2 id="recent-activity" className="text-3xl">Recent activity</h2>
              {notes.length === 0 ? <p className="mt-3 text-sm text-mist">Activity shows up when a quote, payment, or ticket changes.</p> : null}
              <ul className="mt-2">
                {notes.slice(0, 5).map((note) => (
                  <li key={note.id} className="border-t border-line py-3 first:border-t-0">
                    <p className="text-sm font-semibold">{note.title}</p>
                    <p className="text-xs leading-relaxed text-mist">{note.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}

function AccountSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your workspace</span>
      <SkeletonBlock className="col-span-6 h-32 xl:col-span-3" />
      <SkeletonBlock className="col-span-6 h-32 xl:col-span-3" />
      <SkeletonBlock className="col-span-6 h-32 xl:col-span-3" />
      <SkeletonBlock className="col-span-6 h-32 xl:col-span-3" />
      <SkeletonBlock className="col-span-12 h-80 lg:col-span-8" />
      <SkeletonBlock className="col-span-12 h-80 lg:col-span-4" />
    </div>
  );
}

function Quick({ label, detail, create }: { href: string; label: string; detail: string; create: "quote" | "wishlist" }) {
  return (
    <button
      type="button"
      className="min-h-11 rounded-xl px-3 py-2 text-left hover:bg-foam"
      onClick={() => api<{ quote: { id: number } }>("/api/v1/quotes", { method: "POST", body: JSON.stringify({ name: "New quote", type: create }) }).then((body) => { window.location.href = `/quotes/${body.quote.id}`; })}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className="text-xs text-mist">{detail}</span>
    </button>
  );
}
