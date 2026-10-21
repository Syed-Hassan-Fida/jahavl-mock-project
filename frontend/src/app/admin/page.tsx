"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { Metric, SkeletonBlock, StatusBadge } from "@/components/ui";
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
        <div className="panel max-w-lg p-6">
          <p>{error}</p>
          <Link href="/login" className="btn btn-primary mt-4">Sign in</Link>
        </div>
      ) : null}
      {!data && !error ? <DashboardSkeleton /> : null}
      {data ? (
        <div className="rise grid grid-cols-12 gap-4 md:gap-5">
          <section className="col-span-12 grid grid-cols-12 gap-4 md:gap-5" aria-label="Pipeline totals">
            <div className="col-span-12 md:col-span-4"><Metric label="Open pipeline" value={money(data.pipeline_total)} hint="Quotes that are not paid" /></div>
            <div className="col-span-12 md:col-span-4"><Metric label="Paid" value={money(data.paid_total)} hint="Processed quotes" /></div>
            <div className="col-span-12 md:col-span-4"><Metric label="Quotes" value={String(data.quote_count)} hint="In this workspace" /></div>
          </section>
          <div className="col-span-12 flex flex-wrap gap-2">
            <Link href="/account/quotes" className="btn btn-primary">All quotes</Link>
            <Link href="/admin/people" className="btn btn-secondary">People</Link>
            <Link href="/admin/approvals" className="btn btn-secondary">Approvals</Link>
            <Link href="/admin/catalog" className="btn btn-secondary">Pricing</Link>
          </div>
          <section className="panel col-span-12 p-5 lg:col-span-7" aria-labelledby="pipeline-lines">
            <h2 id="pipeline-lines" className="text-3xl">By line</h2>
            <p className="mt-1 text-sm text-mist">Quoted value across the catalog.</p>
            {data.by_category.length === 0 ? <p className="mt-6 text-sm text-mist">No quoted product value yet.</p> : null}
            <div className="mt-6 space-y-5" role="img" aria-label={data.by_category.map((row) => `${row.name} ${money(row.amount)}`).join(", ") || "No category totals"}>
              {data.by_category.map((row) => (
                <div key={row.name}>
                  <div className="mb-2 flex justify-between gap-3 text-sm">
                    <span className="font-medium">{row.name}</span>
                    <span className="tabular-nums text-mist">{money(row.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-foam">
                    <div className="h-2 rounded-full bg-copper" style={{ width: `${Math.max(4, (Number(row.amount) / max) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="panel col-span-12 p-5 lg:col-span-5" aria-labelledby="pipeline-status">
            <h2 id="pipeline-status" className="text-3xl">By status</h2>
            <p className="mt-1 text-sm text-mist">How the book is distributed.</p>
            <StatusMix rows={data.by_status} />
          </section>
          <section className="panel col-span-12 overflow-hidden lg:col-span-7" aria-labelledby="recent-quotes">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 id="recent-quotes" className="text-3xl">Recent quotes</h2>
              <Link href="/account/quotes" className="text-sm font-semibold text-copper">View all</Link>
            </div>
            {quotes.length === 0 ? <p className="border-t border-line px-5 py-8 text-sm text-mist">No quotes in this book.</p> : null}
            <ul>
              {quotes.map((quote) => (
                <li key={quote.id} className="border-t border-line">
                  <Link href={`/quotes/${quote.id}`} className="grid min-h-16 items-center gap-3 px-5 py-3 hover:bg-foam sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{quote.name}</span>
                      <span className="mt-0.5 block text-xs text-mist">{quote.owner}</span>
                    </span>
                    <StatusBadge status={quote.status} />
                    <span className="text-sm font-semibold tabular-nums sm:text-right">{money(quote.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel col-span-12 p-5 lg:col-span-5" aria-labelledby="recent-activity">
            <h2 id="recent-activity" className="text-3xl">Recent activity</h2>
            {notes.length === 0 ? <p className="mt-4 text-sm text-mist">Notifications appear when quotes, dealers, or tickets change.</p> : null}
            <ul className="mt-2">
              {notes.map((note) => (
                <li key={note.id} className="border-t border-line py-3 first:border-t-0">
                  <p className="text-sm font-semibold">{note.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-mist">{note.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}

const mixColor = ["bg-ink", "bg-copper", "bg-[#c4a574]", "bg-[#8ea0b5]", "bg-[#6e8f78]", "bg-haze"];

function StatusMix({ rows }: { rows: { status: string; quotes: number; pipeline: string }[] }) {
  const total = rows.reduce((sum, row) => sum + row.quotes, 0) || 1;
  let cursor = 0;
  const arcs = rows.map((row, index) => {
    const length = (row.quotes / total) * 100;
    const arc = { key: row.status, length, offset: 25 - cursor, color: mixColor[index % mixColor.length].replace("bg-", "text-") };
    cursor += length;
    return arc;
  });
  return (
    <div className="mt-6">
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 42 42" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label={rows.map((row) => `${row.status} ${row.quotes}`).join(", ")}>
          {arcs.map((arc) => (
            <circle key={arc.key} cx="21" cy="21" r="15.9" fill="none" pathLength={100} stroke="currentColor" className={arc.color} strokeWidth="6" strokeDasharray={`${arc.length} ${100 - arc.length}`} strokeDashoffset={arc.offset} />
          ))}
        </svg>
        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-foam" aria-hidden>
          {rows.map((row, index) => (
            <div key={row.status} className={`inline-block h-2.5 ${mixColor[index % mixColor.length]}`} style={{ width: `${(row.quotes / total) * 100}%` }} />
          ))}
        </div>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((row, index) => (
          <li key={row.status} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-3 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${mixColor[index % mixColor.length]}`} aria-hidden />
            <span className="capitalize">{row.status}</span>
            <span className="tabular-nums text-mist">{row.quotes}</span>
            <span className="tabular-nums">{money(row.pipeline)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the pipeline</span>
      <SkeletonBlock className="col-span-12 h-32 md:col-span-4" />
      <SkeletonBlock className="col-span-12 h-32 md:col-span-4" />
      <SkeletonBlock className="col-span-12 h-32 md:col-span-4" />
      <SkeletonBlock className="col-span-12 h-72 lg:col-span-7" />
      <SkeletonBlock className="col-span-12 h-72 lg:col-span-5" />
    </div>
  );
}
