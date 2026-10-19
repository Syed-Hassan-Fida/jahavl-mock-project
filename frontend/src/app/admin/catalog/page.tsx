"use client";

import { FormEvent, useEffect, useState } from "react";
import { IconButton } from "@/components/Icons";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { api } from "@/lib/client";

type Row = {
  id: number;
  name: string;
  slug: string;
  series: string | null;
  list_price: string;
  dealer_price: string;
  cost: string;
  weight: string | null;
  shipping_amount: string;
  tariff: string;
  markup_percent: string;
  dealer_markup_percent: string;
  featured: boolean;
  image: string | null;
  documents: { id: number; name: string }[];
};

export default function CatalogAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function load(query = "") {
    api<{ products: Row[] }>(`/api/v1/admin/products?q=${encodeURIComponent(query)}`).then((body) => setRows(body.products));
  }

  useEffect(() => { load(); }, []);

  async function save(event: FormEvent<HTMLFormElement>, id: number) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      list_price: form.get("list_price"),
      dealer_price: form.get("dealer_price"),
      cost: form.get("cost"),
      weight: form.get("weight") || null,
      shipping_amount: form.get("shipping_amount"),
      tariff: form.get("tariff"),
      markup_percent: form.get("markup_percent"),
      dealer_markup_percent: form.get("dealer_markup_percent"),
      featured: form.get("featured") === "on",
    };
    await api(`/api/v1/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    setNotice(`${form.get("name")} saved.`);
  }

  return (
    <WorkspaceShell title="Pricing" description="Cost, tariff, markup, and dealer markup stay here. Public pages label the list price as a sample.">
          {notice ? <p className="mt-4 text-sm text-copper">{notice}</p> : null}
          <form className="mt-6 flex flex-wrap gap-3" onSubmit={async (event) => {
            event.preventDefault();
            const file = new FormData(event.currentTarget).get("file");
            const body = new FormData();
            if (file instanceof File) body.append("file", file);
            const result = await api<{ updated: number; skipped: number }>("/api/v1/admin/products/import", { method: "POST", body });
            setNotice(`Updated ${result.updated}. Skipped ${result.skipped}.`);
            load();
          }}>
            <input name="file" type="file" accept=".csv,.xlsx" required className="text-sm" />
            <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Import CSV or Excel</button>
          </form>
          <input className="field mt-4 max-w-sm font-normal" placeholder="Search products" onChange={(event) => load(event.target.value)} />
          <div className="mt-6 space-y-4">
            {rows.map((row) => (
              <form key={row.id} className="rounded-3xl border border-line bg-paper p-5" onSubmit={(event) => save(event, row.id)}>
                <input type="hidden" name="name" value={row.name} />
                <p className="font-semibold">{row.name}</p>
                <p className="text-xs text-mist">{row.series} · {row.slug}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <Field name="list_price" label="MSRP" value={row.list_price} />
                  <Field name="dealer_price" label="Dealer" value={row.dealer_price} />
                  <Field name="cost" label="Cost" value={row.cost} />
                  <Field name="weight" label="Weight" value={row.weight ?? ""} />
                  <Field name="shipping_amount" label="Shipping" value={row.shipping_amount} />
                  <Field name="tariff" label="Tariff" value={row.tariff} />
                  <Field name="markup_percent" label="Markup %" value={row.markup_percent} />
                  <Field name="dealer_markup_percent" label="Dealer markup %" value={row.dealer_markup_percent} />
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm"><input name="featured" type="checkbox" defaultChecked={row.featured} /> Featured</label>
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  <IconButton label={`Save ${row.name}`} name="check" type="submit" tone="solid" />
                  {row.image ? <IconButton label={`Remove image for ${row.name}`} name="x" tone="danger" onClick={async () => { await api(`/api/v1/admin/products/${row.id}/image`, { method: "DELETE" }); setRows((current) => current.map((item) => item.id === row.id ? { ...item, image: null } : item)); }} /> : null}
                  <IconButton label={`Delete ${row.name}`} name="trash" tone="danger" onClick={async () => { try { await api(`/api/v1/admin/products/${row.id}`, { method: "DELETE" }); setRows((current) => current.filter((item) => item.id !== row.id)); } catch (reason) { setNotice(reason instanceof Error ? reason.message : "The product was not removed."); } }} />
                  <label className="text-sm text-mist">
                    Document
                    <input type="file" className="ml-2" onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const body = new FormData();
                      body.append("file", file);
                      await api(`/api/v1/admin/products/${row.id}/documents`, { method: "POST", body });
                      setNotice(`Document added to ${row.name}.`);
                    }} />
                  </label>
                  {row.documents.map((document) => <span key={document.id} className="text-xs text-mist">{document.name}</span>)}
                </div>
              </form>
            ))}
          </div>
    </WorkspaceShell>
  );
}

function Field({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-mist">
      {label}
      <input name={name} defaultValue={value} className="field font-normal text-ink" />
    </label>
  );
}
