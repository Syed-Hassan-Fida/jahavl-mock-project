"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { money } from "@/lib/api";
import { api, sessionUser } from "@/lib/client";
import type { LiveEvent } from "@/lib/live";

type Analytics = {
  pipeline_total: number;
  paid_total: number;
  quote_count: number;
  by_status: { status: string; quotes: number; pipeline: string }[];
  by_category: { name: string; amount: string }[];
};

type Quote = { id: number; name: string; status: string; total: string; owner: string | null };
type Note = { id: number; title: string; body: string };

export default function AdminPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const name = sessionUser()?.name?.split(" ")[0];

  useEffect(() => {
    if (!localStorage.getItem("jah_token")) {
      setError("Sign in as admin or sales to open the pipeline.");
      return;
    }
    Promise.all([
      api<Analytics>("/api/v1/admin/analytics"),
      api<{ quotes: Quote[] }>("/api/v1/quotes"),
      api<{ notifications: Note[] }>("/api/v1/notifications"),
    ])
      .then(([analytics, quoteBody, noteBody]) => {
        setData(analytics);
        setQuotes(quoteBody.quotes.filter((quote) => quote.status !== undefined).slice(0, 6));
        setNotes(noteBody.notifications.slice(0, 5));
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    function onLive(event: Event) {
      const detail = (event as CustomEvent<LiveEvent>).detail;
      const note = detail.payload.notification;
      if (detail.name !== "notification" || !note) return;
      setNotes((rows) => (rows.some((row) => row.id === note.id) ? rows : [note, ...rows].slice(0, 5)));
    }
    window.addEventListener("jah-live", onLive);
    return () => window.removeEventListener("jah-live", onLive);
  }, []);

  const max = Math.max(...(data?.by_category.map((row) => Number(row.amount)) ?? [1]), 1);

  return (
    <WorkspaceShell title={name ? `Hello, ${name}` : "Pipeline"} description="Open quote value, what has been paid, and the work sitting in this book of business.">
      {error ? (
        <div className="max-w-lg rounded-2xl border border-line bg-paper p-6">
          <p>{error}</p>
          <Link href="/login" className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Sign in</Link>
        </div>
      ) : null}
      {!data && !error ? <p className="text-sm text-mist">Loading the pipeline…</p> : null}
      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Metric label="Open pipeline" value={money(data.pipeline_total)} hint="Quotes that are not paid" />
            <Metric label="Paid" value={money(data.paid_total)} hint="Processed quotes" />
            <Metric label="Quotes" value={String(data.quote_count)} hint="In this workspace" />
          </section>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/people" className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold hover:bg-foam">People</Link>
            <Link href="/admin/approvals" className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold hover:bg-foam">Approvals</Link>
            <Link href="/admin/catalog" className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold hover:bg-foam">Pricing</Link>
            <Link href="/account/quotes" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">All quotes</Link>
          </div>
          <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-line bg-paper p-5">
              <h2 className="text-2xl">By line</h2>
              {data.by_category.length === 0 ? <p className="mt-3 text-sm text-mist">No quoted product value yet.</p> : null}
              <div className="mt-4 space-y-4">
                {data.by_category.map((row) => (
                  <div key={row.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{row.name}</span>
                      <span className="tabular-nums">{money(row.amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-foam">
                      <div className="h-1.5 rounded-full bg-ink" style={{ width: `${Math.max(4, (Number(row.amount) / max) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-paper">
              <h2 className="px-5 pt-5 text-2xl">By status</h2>
              <table className="mt-3 w-full text-left text-sm">
                <tbody>
                  {data.by_status.map((row) => (
                    <tr key={row.status} className="border-t border-line">
                      <td className="px-5 py-3 font-semibold capitalize">{row.status}</td>
                      <td className="px-5 py-3 tabular-nums">{row.quotes}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{money(row.pipeline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-line bg-paper">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="text-2xl">Recent quotes</h2>
                <Link href="/account/quotes" className="text-sm font-semibold text-copper">View all</Link>
              </div>
              {quotes.length === 0 ? <p className="border-t border-line px-5 py-6 text-sm text-mist">No quotes in this book.</p> : null}
              <ul>
                {quotes.map((quote) => (
                  <li key={quote.id} className="border-t border-line">
                    <Link href={`/quotes/${quote.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-foam">
                      <span>
                        <span className="font-semibold">{quote.name}</span>
                        <span className="mt-0.5 block text-xs text-mist">{quote.owner}</span>
                      </span>
                      <span className="text-right capitalize">{quote.status}<span className="mt-0.5 block tabular-nums text-mist">{money(quote.total)}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-paper p-5">
              <h2 className="text-2xl">Recent activity</h2>
              {notes.length === 0 ? <p className="mt-3 text-sm text-mist">Notifications appear when quotes, dealers, or tickets change.</p> : null}
              <ul>
                {notes.map((note) => (
                  <li key={note.id} className="border-t border-line py-3 first:border-t-0">
                    <p className="text-sm font-semibold">{note.title}</p>
                    <p className="text-xs text-mist">{note.body}</p>
                  </li>
                ))}
              </ul>
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
