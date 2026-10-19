"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { money } from "@/lib/api";
import { api } from "@/lib/client";

type Quote = { id: number; name: string; type: string; status: string; status_code: number; total: string; checkout_allowed: boolean; owner: string | null };

export default function QuotesPage() {
  return (
    <Suspense fallback={<WorkspaceShell title="Quotes"><p className="text-sm text-mist">Loading quotes…</p></WorkspaceShell>}>
      <QuoteList />
    </Suspense>
  );
}

function QuoteList() {
  const params = useSearchParams();
  const wishlist = params.get("type") === "wishlist";
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ quotes: Quote[] }>("/api/v1/quotes")
      .then((body) => setQuotes(body.quotes))
      .catch((reason: Error) => { setError(reason.message); setQuotes([]); });
  }, []);

  const rows = (quotes ?? []).filter((quote) => quote.type === (wishlist ? "wishlist" : "quote"));

  async function create() {
    const body = await api<{ quote: { id: number } }>("/api/v1/quotes", {
      method: "POST",
      body: JSON.stringify({ name: wishlist ? "New wishlist" : "New quote", type: wishlist ? "wishlist" : "quote" }),
    });
    window.location.href = `/quotes/${body.quote.id}`;
  }

  return (
    <WorkspaceShell title={wishlist ? "Wishlists" : "Quotes"} description={wishlist ? "Save products, then convert a list into a quote when you are ready." : "Every quote you can see, with status and checkout."}>
      {error ? <p className="mb-4 text-sm text-copper">{error}</p> : null}
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={create} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">
          <Icon name="plus" />
          {wishlist ? "New wishlist" : "New quote"}
        </button>
      </div>
      {quotes === null ? <p className="text-sm text-mist">Loading…</p> : null}
      {quotes && rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper px-5 py-10">
          <p className="font-semibold">{wishlist ? "No wishlists" : "No quotes in this view"}</p>
          <p className="mt-1 text-sm text-mist">Add a product from the catalog, or start a blank {wishlist ? "wishlist" : "quote"}.</p>
        </div>
      ) : null}
      {rows.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
          {rows.map((quote) => (
            <li key={quote.id}>
              <Link href={`/quotes/${quote.id}`} className="grid gap-1 px-4 py-3 hover:bg-foam sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{quote.name}</span>
                  <span className="mt-0.5 block text-sm capitalize text-mist">{quote.owner ?? "You"} · {quote.status} · {quote.status_code}{quote.checkout_allowed ? " · checkout open" : ""}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums sm:text-right">{money(quote.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </WorkspaceShell>
  );
}
