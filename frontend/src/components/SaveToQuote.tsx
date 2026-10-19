"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, sessionUser } from "@/lib/client";

export function SaveToQuote({ productId, productName }: { productId: number; productName: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function save(type: "quote" | "wishlist") {
    if (!sessionUser()) {
      router.push("/login");
      return;
    }
    setPending(type);
    setMessage(null);
    try {
      const body = await api<{ quote: { id: number } }>("/api/v1/quotes", {
        method: "POST",
        body: JSON.stringify({ name: productName, type, product_id: productId, quantity: 1 }),
      });
      router.push(`/quotes/${body.quote.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The product was not added.");
      setPending(null);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" onClick={() => save("quote")} disabled={pending !== null} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60">
        {pending === "quote" ? "Adding…" : "Add to quote"}
      </button>
      <button type="button" onClick={() => save("wishlist")} disabled={pending !== null} className="rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold hover:border-ink disabled:opacity-60">
        {pending === "wishlist" ? "Saving…" : "Save to wishlist"}
      </button>
      {message ? <p className="basis-full text-sm text-copper">{message}</p> : null}
    </div>
  );
}
