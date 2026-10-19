"use client";

import { FormEvent, useEffect, useState } from "react";
import { IconButton } from "@/components/Icons";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { api, sessionUser } from "@/lib/client";

type Person = { id: number; name: string; email: string; role: string; company_name: string | null; sales_tax_percent: string; tax_status: string; monthly_target?: number | null; yearly_target?: number | null; bio?: string | null };
type Assignments = { sales_clients: { sales_user_id: number; client_user_id: number }[]; dealer_clients: { dealer_user_id: number; client_user_id: number }[]; sales_dealers: { sales_user_id: number; dealer_user_id: number }[] };

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [links, setLinks] = useState<Assignments | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  function load() {
    const current = sessionUser()?.role ?? null;
    setRole(current);
    api<{ users: Person[] }>("/api/v1/people").then((body) => setPeople(body.users)).catch((reason: Error) => setError(reason.message));
    if (current === "admin" || current === "sales" || current === "dealer") {
      api<Assignments>("/api/v1/assignments").then(setLinks).catch(() => undefined);
    }
  }

  useEffect(() => { load(); }, []);

  async function onAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/v1/assignments", { method: "POST", body: JSON.stringify({ kind: form.get("kind"), from_id: Number(form.get("from_id")), to_id: Number(form.get("to_id")) }) });
      load();
      setError("Assignment saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The assignment was not saved.");
    }
  }

  return (
    <WorkspaceShell title="People" description="Sales sees assigned clients and dealers. Dealers see their clients. Admin sees every account.">
          {error ? <p className="mt-4 text-sm text-copper">{error}</p> : null}
          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-paper">
            {people.map((person) => (
              <li key={person.id} className="grid gap-1 px-5 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <span><span className="font-semibold">{person.name}</span><span className="ml-2 text-sm text-mist">{person.email}</span></span>
                <span className="flex flex-wrap items-center gap-3 text-sm capitalize text-mist">
                  <span>{person.role} · tax {person.sales_tax_percent}% · {person.tax_status}{person.role === "sales" && person.yearly_target ? ` · target $${person.yearly_target}/yr` : ""}</span>
                  {role === "admin" && person.role !== "admin" ? <IconButton label={`Remove ${person.name}`} name="trash" tone="danger" onClick={async () => { await api(`/api/v1/people/${person.id}`, { method: "DELETE" }); setPeople((rows) => rows.filter((row) => row.id !== person.id)); }} /> : null}
                </span>
              </li>
            ))}
          </ul>
          {role === "admin" ? (
            <form className="mt-6 grid gap-3 rounded-3xl border border-line bg-paper p-5 sm:grid-cols-2" onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              try {
                await api("/api/v1/people", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
                load();
                event.currentTarget.reset();
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : "The account was not created.");
              }
            }}>
              <h2 className="text-3xl sm:col-span-2">Create an account</h2>
              <input name="name" required placeholder="Name" className="field font-normal" />
              <input name="email" type="email" required placeholder="Email" className="field font-normal" />
              <input name="password" type="password" required placeholder="Password" className="field font-normal" />
              <input name="company_name" placeholder="Company" className="field font-normal" />
              <select name="role" className="field font-normal"><option value="client">Client</option><option value="dealer">Dealer</option><option value="sales">Sales</option></select>
              <input name="sales_tax_percent" placeholder="Sales tax percent" className="field font-normal" />
              <button className="w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Create</button>
            </form>
          ) : null}
          {role === "admin" ? (
            <form className="mt-6 grid gap-3 rounded-3xl border border-line bg-paper p-5 sm:grid-cols-2" onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              try {
                await api(`/api/v1/people/${form.get("user_id")}/target`, { method: "PATCH", body: JSON.stringify({ monthly_target: Number(form.get("monthly_target")), yearly_target: Number(form.get("yearly_target")), bio: form.get("bio") }) });
                load();
                setError("Sales target saved.");
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : "The target was not saved.");
              }
            }}>
              <h2 className="text-3xl sm:col-span-2">Sales target</h2>
              <select name="user_id" className="field font-normal">{people.filter((person) => person.role === "sales").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
              <input name="monthly_target" type="number" min="0" placeholder="Monthly target" className="field font-normal" />
              <input name="yearly_target" type="number" min="0" placeholder="Yearly target" className="field font-normal" />
              <input name="bio" placeholder="Specialist bio" className="field font-normal" />
              <button className="w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Save target</button>
            </form>
          ) : null}
          <form className="mt-6 grid gap-3 rounded-3xl border border-line bg-paper p-5 sm:grid-cols-3" onSubmit={onAssign}>
            <h2 className="text-3xl sm:col-span-3">Assignment</h2>
            <select name="kind" className="field font-normal">
              <option value="sales_client">Sales → client</option>
              <option value="dealer_client">Dealer → client</option>
              <option value="sales_dealer">Sales → dealer</option>
            </select>
            <select name="from_id" className="field font-normal">{people.map((person) => <option key={person.id} value={person.id}>{person.role}: {person.name}</option>)}</select>
            <select name="to_id" className="field font-normal">{people.map((person) => <option key={person.id} value={person.id}>{person.role}: {person.name}</option>)}</select>
            <button className="w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Save assignment</button>
            {links ? <p className="text-sm text-mist sm:col-span-3">{links.sales_clients.length} sales-client, {links.dealer_clients.length} dealer-client, {links.sales_dealers.length} sales-dealer.</p> : null}
          </form>
    </WorkspaceShell>
  );
}
