"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icon, IconButton } from "@/components/Icons";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { API_URL } from "@/lib/api";
import { api, authHeaders, sessionUser } from "@/lib/client";
import { idempotencyKey, type LiveEvent } from "@/lib/live";

type Ticket = {
  id: number;
  subject: string;
  status: string;
  user?: { name: string } | null;
  assignee?: { id: number; name: string } | null;
};
type EventNote = { id: number; body: string; author: string };
type EventRow = { id: number; body: string; author: string; created_at?: string; has_attachment?: boolean; notes?: EventNote[] };
type Detail = { id: number; subject: string; status: string; owner: { name: string } | null; assignee: { id: number; name: string } | null; events: EventRow[] };
type Staff = { id: number; name: string; role: string };

const filters = ["all", "open", "pending", "closed"] as const;

async function openFile(path: string) {
  const response = await fetch(`${API_URL}${path}`, { headers: authHeaders(false) });
  if (!response.ok) return;
  window.open(URL.createObjectURL(await response.blob()));
}

export default function TicketsPage() {
  const role = sessionUser()?.role;
  const staff = role === "admin" || role === "sales";
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [open, setOpen] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [people, setPeople] = useState<Staff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<{ tickets: Ticket[] }>("/api/v1/tickets").then((body) => setTickets(body.tickets)).catch((reason: Error) => setError(reason.message));
    if (staff) {
      api<{ users: Staff[] }>("/api/v1/people").then((body) => setPeople(body.users.filter((person) => person.role === "admin" || person.role === "sales"))).catch(() => setPeople([]));
    }
  }, [staff]);

  useEffect(() => {
    function onLive(event: Event) {
      const live = (event as CustomEvent<LiveEvent>).detail;
      const ticket = live.payload.ticket;
      const update = live.payload.event;
      if (live.name !== "ticket" || !ticket || !update) return;
      setTickets((rows) => {
        if (!rows) return rows;
        if (!rows.some((row) => row.id === ticket.id)) return [{ id: ticket.id, subject: ticket.subject, status: ticket.status }, ...rows];
        return rows.map((row) => (row.id === ticket.id ? { ...row, status: ticket.status } : row));
      });
      setDetail((current) => {
        if (open !== ticket.id || !current || current.events.some((row) => row.id === update.id)) return current;
        return { ...current, status: ticket.status, events: [...current.events, update] };
      });
    }
    window.addEventListener("jah-live", onLive);
    return () => window.removeEventListener("jah-live", onLive);
  }, [open]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true);
    setError(null);
    try {
      const body = await api<{ ticket: Ticket }>("/api/v1/tickets", { method: "POST", headers: { "Idempotency-Key": idempotencyKey() }, body: JSON.stringify({ subject: data.get("subject"), body: data.get("body") }) });
      setTickets((rows) => (rows?.some((row) => row.id === body.ticket.id) ? rows : [body.ticket, ...(rows ?? [])]));
      form.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The ticket was not opened.");
    } finally {
      setSending(false);
    }
  }

  async function reply(ticketId: number, payload: { body?: string; status?: string; assignee_id?: number }) {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const next = await api<{ ticket: Detail }>(`/api/v1/tickets/${ticketId}/events`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify(payload),
      });
      setDetail(next.ticket);
      setTickets((rows) => rows?.map((row) => (row.id === ticketId ? { ...row, status: next.ticket.status, assignee: next.ticket.assignee } : row)) ?? rows);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The reply was not saved.");
    } finally {
      setSending(false);
    }
  }

  const visible = (tickets ?? []).filter((ticket) => filter === "all" || ticket.status === filter);

  return (
    <WorkspaceShell title="Tickets" description="Service requests on an order or install. Replies, status, and assignment stay on the ticket.">
      {error ? <p className="mb-4 text-sm text-copper">{error}</p> : null}
      <form onSubmit={create} className="max-w-xl rounded-2xl border border-line bg-paper p-5">
        <label className="grid gap-1 text-sm font-semibold">Subject<input name="subject" required className="field font-normal" /></label>
        <label className="mt-3 grid gap-1 text-sm font-semibold">What happened<textarea name="body" required className="field min-h-24 font-normal" /></label>
        <button disabled={sending} className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60">Open ticket</button>
      </form>
      <div className="mt-4 flex gap-2">
        {filters.map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-3 py-1 text-sm capitalize ${filter === item ? "bg-ink text-cream" : "bg-paper text-mist"}`}>{item}</button>
        ))}
      </div>
      {tickets === null && !error ? <p className="mt-4 text-sm text-mist">Loading tickets…</p> : null}
      {tickets && visible.length === 0 ? <p className="mt-4 text-sm text-mist">{filter === "all" ? "No tickets. Open one if an order needs service." : `No ${filter} tickets.`}</p> : null}
      <ul className="mt-4 max-w-xl space-y-2">
        {visible.map((ticket) => (
          <li key={ticket.id} className="rounded-2xl border border-line bg-paper">
            <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => { setOpen(ticket.id); setDetail(null); api<{ ticket: Detail }>(`/api/v1/tickets/${ticket.id}`).then((body) => setDetail(body.ticket)).catch((reason: Error) => setError(reason.message)); }}>
              <span>
                <span className="block font-semibold">{ticket.subject}</span>
                <span className="text-xs text-mist">{ticket.user?.name ?? "You"}{ticket.assignee ? ` · ${ticket.assignee.name}` : ""}</span>
              </span>
              <span className="text-sm capitalize text-mist">{ticket.status}</span>
            </button>
            {open === ticket.id ? (
              <div className="border-t border-line px-4 py-3 text-sm">
                {!detail ? <p className="text-mist">Loading the thread…</p> : null}
                {detail ? (
                  <>
                    <p className="mb-2 text-xs text-mist">{detail.owner?.name ?? "Owner"} · {detail.assignee ? `assigned to ${detail.assignee.name}` : "unassigned"}</p>
                    {detail.events.map((row) => (
                      <div key={row.id} className="border-t border-line py-2 first:border-t-0">
                        <p><span className="font-semibold">{row.author}</span> {row.body}</p>
                        {row.has_attachment ? <button type="button" className="text-xs font-semibold text-copper" onClick={() => openFile(`/api/v1/tickets/${ticket.id}/events/${row.id}/file`)}>Download attachment</button> : null}
                        {(row.notes ?? []).map((note) => <p key={note.id} className="ml-4 mt-1 text-mist">{note.author}: {note.body}</p>)}
                        <form className="mt-1 flex gap-2" onSubmit={async (event) => {
                          event.preventDefault();
                          const form = event.currentTarget;
                          const text = String(new FormData(form).get("note"));
                          const saved = await api<{ note: EventNote }>(`/api/v1/tickets/${ticket.id}/events/${row.id}/notes`, { method: "POST", body: JSON.stringify({ body: text }) });
                          setDetail((current) => current && { ...current, events: current.events.map((item) => item.id === row.id ? { ...item, notes: [...(item.notes ?? []), saved.note] } : item) });
                          form.reset();
                        }}>
                          <input name="note" required placeholder="Note on this update" className="field h-8 font-normal" />
                          <button className="text-xs font-semibold text-copper">Add note</button>
                        </form>
                      </div>
                    ))}
                    {staff ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["open", "pending", "closed"] as const).map((status) => (
                          <button key={status} type="button" disabled={sending || detail.status === status} className="rounded-full border border-line px-3 py-1 text-xs font-semibold capitalize disabled:opacity-40" onClick={() => reply(ticket.id, { status })}>{status}</button>
                        ))}
                        {people.length > 0 ? (
                          <select className="field h-8 w-auto py-0 text-xs font-normal" value={detail.assignee?.id ?? ""} onChange={(event) => reply(ticket.id, { assignee_id: Number(event.target.value) })}>
                            <option value="" disabled>Assign</option>
                            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                          </select>
                        ) : null}
                      </div>
                    ) : null}
                    <form className="mt-3 flex items-center gap-2" onSubmit={(event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      const data = new FormData(form);
                      const file = data.get("file");
                      const text = String(data.get("body") ?? "").trim();
                      if (!text && !(file instanceof File && file.size > 0)) return;
                      if (file instanceof File && file.size > 0) {
                        setSending(true);
                        api<{ ticket: Detail }>(`/api/v1/tickets/${ticket.id}/events`, { method: "POST", headers: { "Idempotency-Key": idempotencyKey() }, body: data })
                          .then((next) => { setDetail(next.ticket); form.reset(); })
                          .catch((reason: Error) => setError(reason.message))
                          .finally(() => setSending(false));
                        return;
                      }
                      reply(ticket.id, { body: String(data.get("body")) }).then(() => form.reset());
                    }}>
                      <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-foam">
                        <span className="sr-only">Attach a file</span>
                        <Icon name="paperclip" />
                        <input name="file" type="file" className="sr-only" />
                      </label>
                      <input name="body" className="field h-11 min-w-0 flex-1 py-0 font-normal" placeholder="Reply" />
                      <IconButton label="Send reply" name="send" type="submit" tone="solid" disabled={sending} />
                    </form>
                  </>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </WorkspaceShell>
  );
}
