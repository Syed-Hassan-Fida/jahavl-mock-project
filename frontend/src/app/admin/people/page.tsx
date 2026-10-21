"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { ConfirmDialog, EmptyState, Metric, Pager, SkeletonBlock, StatusBadge, toast } from "@/components/ui";
import { api, sessionUser } from "@/lib/client";

type Person = { id: number; name: string; email: string; role: string; company_name: string | null; sales_tax_percent: string; tax_status: string; monthly_target?: number | null; yearly_target?: number | null; bio?: string | null; created_at?: string };
type Assignments = { sales_clients: { sales_user_id: number; client_user_id: number }[]; dealer_clients: { dealer_user_id: number; client_user_id: number }[]; sales_dealers: { sales_user_id: number; dealer_user_id: number }[] };

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [links, setLinks] = useState<Assignments | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pending, setPending] = useState<Person | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    const current = sessionUser()?.role ?? null;
    setRole(current);
    setPeople(null);
    api<{ users: Person[] }>("/api/v1/people").then((body) => setPeople(body.users)).catch((reason: Error) => { setError(reason.message); setPeople([]); });
    if (current === "admin" || current === "sales" || current === "dealer") {
      api<Assignments>("/api/v1/assignments").then(setLinks).catch(() => undefined);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (people ?? []).filter((person) => {
      if (roleFilter !== "all" && person.role !== roleFilter) return false;
      if (!needle) return true;
      return `${person.name} ${person.email} ${person.company_name ?? ""}`.toLowerCase().includes(needle);
    });
  }, [people, query, roleFilter]);

  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);
  const counts = {
    total: people?.length ?? 0,
    client: people?.filter((person) => person.role === "client").length ?? 0,
    dealer: people?.filter((person) => person.role === "dealer").length ?? 0,
    sales: people?.filter((person) => person.role === "sales").length ?? 0,
  };

  async function onAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/v1/assignments", { method: "POST", body: JSON.stringify({ kind: form.get("kind"), from_id: Number(form.get("from_id")), to_id: Number(form.get("to_id")) }) });
      load();
      toast("Assignment saved.", "success");
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "The assignment was not saved.", "error");
    }
  }

  return (
    <WorkspaceShell title="People" description="Sales sees assigned clients and dealers. Dealers see their clients. Admin sees every account.">
      {error ? <p role="alert" className="mb-4 rounded-2xl border border-[#e7c4b0] bg-[#fbf3ee] px-4 py-3 text-sm text-[#8c3f0e]">{error}</p> : null}
      <section className="grid grid-cols-12 gap-4" aria-label="Account totals">
        <div className="col-span-6 xl:col-span-3"><Metric label="People" value={people ? String(counts.total) : "—"} hint="Visible to this role" /></div>
        <div className="col-span-6 xl:col-span-3"><Metric label="Clients" value={people ? String(counts.client) : "—"} hint="Buying accounts" /></div>
        <div className="col-span-6 xl:col-span-3"><Metric label="Dealers" value={people ? String(counts.dealer) : "—"} hint="Net pricing" /></div>
        <div className="col-span-6 xl:col-span-3"><Metric label="Sales" value={people ? String(counts.sales) : "—"} hint="Specialists" /></div>
      </section>
      <div className="mt-5 flex flex-wrap items-end gap-2">
        <label className="grid min-w-[16rem] flex-1 gap-1 text-sm font-semibold">Search
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Name, email, or company" className="field font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Role
          <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} className="field w-auto font-normal">
            <option value="all">All roles</option>
            <option value="client">Client</option>
            <option value="dealer">Dealer</option>
            <option value="sales">Sales</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {query || roleFilter !== "all" ? <button type="button" className="btn btn-secondary" onClick={() => { setQuery(""); setRoleFilter("all"); setPage(1); }}>Clear filters</button> : null}
      </div>
      {(query || roleFilter !== "all") ? <p className="mt-2 text-xs font-semibold text-mist">{roleFilter !== "all" ? `Role: ${roleFilter}` : ""}{query ? `${roleFilter !== "all" ? " · " : ""}Search: ${query}` : ""}</p> : null}
      {people === null ? (
        <div className="mt-4 grid gap-2" aria-busy="true">
          <span className="sr-only">Loading people</span>
          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-14" />
        </div>
      ) : null}
      {people && filtered.length === 0 ? <div className="mt-4"><EmptyState title="No accounts match" body="Clear the filters or create an account from the form below." /></div> : null}
      {slice.length ? (
        <ul className="panel mt-4 divide-y divide-line overflow-hidden">
          {slice.map((person) => (
            <li key={person.id} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1.4fr)_auto_auto]">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{person.name}</span>
                <span className="block truncate text-sm text-mist">{person.email}{person.created_at ? ` · joined ${person.created_at.slice(0, 10)}` : ""}</span>
              </span>
              <StatusBadge status={person.role} />
              {role === "admin" && person.role !== "admin" ? (
                <button type="button" className="min-h-11 px-2 text-sm font-semibold text-copper" onClick={() => setPending(person)}>Remove</button>
              ) : <span />}
            </li>
          ))}
        </ul>
      ) : null}
      {people ? <Pager page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={setPageSize} /> : null}
      {role === "admin" ? (
        <form className="panel mt-6 grid gap-3 p-5 sm:grid-cols-2" onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const password = String(data.get("password") ?? "");
          if (password.length < 8) {
            setFormError("Password must be at least 8 characters.");
            return;
          }
          setFormError(null);
          try {
            await api("/api/v1/people", { method: "POST", body: JSON.stringify(Object.fromEntries(data.entries())) });
            load();
            form.reset();
            toast("Account created.", "success");
          } catch (reason) {
            const message = reason instanceof Error ? reason.message : "The account was not created.";
            setFormError(message);
            toast(message, "error");
          }
        }}>
          <h2 className="text-3xl sm:col-span-2">Create an account</h2>
          <label className="grid gap-1 text-sm font-semibold">Name<input name="name" required className="field font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold">Email<input name="email" type="email" required className="field font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold">Password<input name="password" type="password" required minLength={8} className="field font-normal" aria-invalid={formError ? true : undefined} /></label>
          <label className="grid gap-1 text-sm font-semibold">Company<input name="company_name" className="field font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold">Role<select name="role" className="field font-normal"><option value="client">Client</option><option value="dealer">Dealer</option><option value="sales">Sales</option></select></label>
          <label className="grid gap-1 text-sm font-semibold">Sales tax percent<input name="sales_tax_percent" type="number" min="0" max="30" step="0.01" className="field font-normal" /></label>
          {formError ? <p role="alert" className="text-sm text-copper sm:col-span-2">{formError}</p> : null}
          <button className="btn btn-primary w-fit">Create</button>
        </form>
      ) : null}
      {role === "admin" ? (
        <form className="panel mt-6 grid gap-3 p-5 sm:grid-cols-2" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            await api(`/api/v1/people/${form.get("user_id")}/target`, { method: "PATCH", body: JSON.stringify({ monthly_target: Number(form.get("monthly_target")), yearly_target: Number(form.get("yearly_target")), bio: form.get("bio") }) });
            load();
            toast("Sales target saved.", "success");
          } catch (reason) {
            toast(reason instanceof Error ? reason.message : "The target was not saved.", "error");
          }
        }}>
          <h2 className="text-3xl sm:col-span-2">Sales target</h2>
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Specialist
            <select name="user_id" className="field font-normal">{people?.filter((person) => person.role === "sales").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Monthly target<input name="monthly_target" type="number" min="0" required className="field font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold">Yearly target<input name="yearly_target" type="number" min="0" required className="field font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Bio<input name="bio" className="field font-normal" /></label>
          <button className="btn btn-primary w-fit">Save target</button>
        </form>
      ) : null}
      <form className="panel mt-6 grid gap-3 p-5 sm:grid-cols-3" onSubmit={onAssign}>
        <h2 className="text-3xl sm:col-span-3">Assignment</h2>
        <label className="grid gap-1 text-sm font-semibold">Relationship
          <select name="kind" className="field font-normal">
            <option value="sales_client">Sales to client</option>
            <option value="dealer_client">Dealer to client</option>
            <option value="sales_dealer">Sales to dealer</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">From
          <select name="from_id" className="field font-normal">{people?.map((person) => <option key={person.id} value={person.id}>{person.role}: {person.name}</option>)}</select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">To
          <select name="to_id" className="field font-normal">{people?.map((person) => <option key={person.id} value={person.id}>{person.role}: {person.name}</option>)}</select>
        </label>
        <button className="btn btn-primary w-fit">Save assignment</button>
        {links ? <p className="text-sm text-mist sm:col-span-3">{links.sales_clients.length} sales-client, {links.dealer_clients.length} dealer-client, {links.sales_dealers.length} sales-dealer.</p> : null}
      </form>
      <ConfirmDialog
        open={pending !== null}
        title="Remove this account?"
        body={pending ? `${pending.name} will lose access. Paid quotes keep the account on file.` : ""}
        confirmLabel="Remove account"
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          const person = pending;
          setPending(null);
          try {
            await api(`/api/v1/people/${person.id}`, { method: "DELETE" });
            setPeople((rows) => rows?.filter((row) => row.id !== person.id) ?? rows);
            toast(`${person.name} was removed.`, "success");
          } catch (reason) {
            toast(reason instanceof Error ? reason.message : "The account was not removed.", "error");
          }
        }}
      />
    </WorkspaceShell>
  );
}
