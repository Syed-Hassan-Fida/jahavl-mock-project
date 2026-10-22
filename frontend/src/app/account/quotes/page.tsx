"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { Banner, EmptyState, Pager, SkeletonBlock, StatusBadge } from "@/components/ui";
import { money } from "@/lib/api";
import { api } from "@/lib/client";

type Quote = { id: number; name: string; type: string; status: string; status_code: number; total: string; checkout_allowed: boolean; owner: string | null };

export default function QuotesPage() {
  return (
    <Suspense fallback={<WorkspaceShell title="Quotes"><SkeletonBlock className="h-64" /></WorkspaceShell>}>
      <QuoteList />
    </Suspense>
  );
}

function QuoteList() {
  const params = useSearchParams();
  const wishlist = params.get("type") === "wishlist";
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    api<{ quotes: Quote[] }>("/api/v1/quotes")
      .then((body) => setQuotes(body.quotes))
      .catch((reason: Error) => { setError(reason.message); setQuotes([]); });
  }, []);

  const rows = (quotes ?? []).filter((quote) => quote.type === (wishlist ? "wishlist" : "quote"));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  async function create() {
    const body = await api<{ quote: { id: number } }>("/api/v1/quotes", {
      method: "POST",
      body: JSON.stringify({ name: wishlist ? "New wishlist" : "New quote", type: wishlist ? "wishlist" : "quote" }),
    });
    window.location.href = `/quotes/${body.quote.id}`;
  }

  return (
    <WorkspaceShell title={wishlist ? "Wishlists" : "Quotes"} description={wishlist ? "Save products, then convert a list into a quote when you are ready." : "Every quote you can see, with status and checkout."}>
      {error ? <div className="mb-4"><Banner tone="error">{error}</Banner></div> : null}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mist">{quotes === null ? "Loading…" : `${rows.length} ${wishlist ? "wishlist" : "quote"}${rows.length === 1 ? "" : "s"}`}</p>
        <button type="button" onClick={create} className="btn btn-primary">
          <Icon name="plus" />
          {wishlist ? "New wishlist" : "New quote"}
        </button>
      </div>
      {quotes === null ? (
        <div className="grid gap-2" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading quotes</span>
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
        </div>
      ) : null}
      {quotes && rows.length === 0 ? (
        <EmptyState
          title={wishlist ? "No wishlists" : "No quotes yet"}
          body={`Add a product from the catalog, or start a blank ${wishlist ? "wishlist" : "quote"}.`}
          action={<Link href="/led" className="btn btn-secondary">Browse the catalog</Link>}
        />
      ) : null}
      {rows.length ? (
        <ul className="panel divide-y divide-line overflow-hidden">
          {visible.map((quote) => (
            <li key={quote.id}>
              <Link href={`/quotes/${quote.id}`} className="grid min-h-16 items-center gap-2 px-4 py-3 hover:bg-foam sm:grid-cols-[minmax(0,1.3fr)_auto_auto] sm:gap-4 sm:px-5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{quote.name}</span>
                  <span className="mt-0.5 block text-sm text-mist">{quote.owner ?? "You"}{quote.checkout_allowed ? " · checkout open" : ""}</span>
                </span>
                <StatusBadge status={quote.status} />
                <span className="text-sm font-semibold tabular-nums sm:text-right">{money(quote.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {quotes && rows.length ? <Pager page={page} pageSize={pageSize} total={rows.length} onPage={setPage} onPageSize={setPageSize} /> : null}
    </WorkspaceShell>
  );
}
