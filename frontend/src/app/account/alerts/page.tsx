"use client";

import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { IconButton } from "@/components/Icons";
import { api } from "@/lib/client";
import { type LiveEvent } from "@/lib/live";

type Note = { id: number; title: string; body: string; read_at: string | null; created_at?: string };

export default function AlertsPage() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<{ notifications: Note[] }>("/api/v1/notifications")
      .then((body) => setNotes(body.notifications))
      .catch((reason: Error) => { setError(reason.message); setNotes([]); });
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function onLive(event: Event) {
      const detail = (event as CustomEvent<LiveEvent>).detail;
      const note = detail.payload.notification as Note | undefined;
      if (detail.name !== "notification" || !note) return;
      setNotes((rows) => (rows?.some((row) => row.id === note.id) ? rows : [note, ...(rows ?? [])]));
    }
    window.addEventListener("jah-live", onLive);
    return () => window.removeEventListener("jah-live", onLive);
  }, []);

  const rows = (notes ?? []).filter((note) => filter === "all" || !note.read_at);
  const unread = (notes ?? []).filter((note) => !note.read_at).length;

  async function mark(id: number) {
    await api(`/api/v1/notifications/${id}/read`, { method: "POST" });
    setNotes((current) => (current ?? []).map((note) => (note.id === id ? { ...note, read_at: new Date().toISOString() } : note)));
  }

  async function markAll() {
    await api("/api/v1/notifications/read-all", { method: "POST" });
    setNotes((current) => (current ?? []).map((note) => ({ ...note, read_at: note.read_at ?? new Date().toISOString() })));
  }

  async function remove(id: number) {
    await api(`/api/v1/notifications/${id}`, { method: "DELETE" });
    setNotes((current) => (current ?? []).filter((note) => note.id !== id));
  }

  return (
    <WorkspaceShell title="Alerts" description="Quotes, tickets, and messages that need a look. Read them here, or clear the ones you are done with.">
      {error ? <p className="mb-4 text-sm text-copper">{error}</p> : null}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFilter("all")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === "all" ? "bg-ink text-cream" : "bg-paper"}`}>All</button>
        <button type="button" onClick={() => setFilter("unread")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === "unread" ? "bg-ink text-cream" : "bg-paper"}`}>Unread{unread ? ` · ${unread}` : ""}</button>
        <button type="button" disabled={unread === 0} onClick={() => markAll().catch((reason: Error) => setError(reason.message))} className="ml-auto inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-semibold disabled:opacity-40">
          Mark all read
        </button>
      </div>
      {notes === null ? <p className="text-sm text-mist">Loading alerts…</p> : null}
      {notes && rows.length === 0 ? <p className="rounded-2xl border border-dashed border-line bg-paper px-5 py-8 text-sm text-mist">{filter === "unread" ? "Nothing unread." : "No alerts yet."}</p> : null}
      <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-paper">
        {rows.map((note) => (
          <li key={note.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${note.read_at ? "bg-line" : "bg-copper"}`} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{note.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-mist">{note.body}</p>
              {note.created_at ? <p className="mt-1 text-xs text-haze">{new Date(note.created_at).toLocaleString()}</p> : null}
            </div>
            <div className="flex shrink-0">
              {!note.read_at ? <IconButton label="Mark read" name="check" onClick={() => mark(note.id).catch((reason: Error) => setError(reason.message))} /> : null}
              <IconButton label="Delete alert" name="trash" tone="danger" onClick={() => remove(note.id).catch((reason: Error) => setError(reason.message))} />
            </div>
          </li>
        ))}
      </ul>
    </WorkspaceShell>
  );
}
