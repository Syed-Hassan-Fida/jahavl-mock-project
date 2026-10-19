"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icon, IconButton } from "@/components/Icons";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { api } from "@/lib/client";

type Note = { id: number; title: string; body: string; due_on: string | null; author?: { name: string } | null; client?: { name: string } | null };

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<{ notes: Note[] }>("/api/v1/notes").then((body) => setNotes(body.notes)).catch((reason: Error) => setError(reason.message));
  }

  useEffect(() => { load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/v1/notes", { method: "POST", body: JSON.stringify({ title: form.get("title"), body: form.get("body"), due_on: form.get("due_on") || null }) });
      event.currentTarget.reset();
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The note was not saved.");
    }
  }

  return (
    <WorkspaceShell title="Sales notes" description="A log separate from tasks. Notes stay with the specialist who wrote them.">
      {error ? <p className="mb-4 text-sm text-copper">{error}</p> : null}
      <form onSubmit={create} className="max-w-xl rounded-2xl border border-line bg-paper p-5">
        <input name="title" required placeholder="Title" className="field font-normal" />
        <textarea name="body" required placeholder="What should the next person know?" className="field mt-3 min-h-24 font-normal" />
        <input name="due_on" type="date" className="field mt-3 font-normal" />
        <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream"><Icon name="plus" /> Save note</button>
      </form>
      <ul className="mt-4 max-w-xl space-y-2">
        {notes.length === 0 ? <li className="text-sm text-mist">No notes yet.</li> : null}
        {notes.map((note) => (
          <li key={note.id} className="rounded-2xl border border-line bg-paper px-4 py-3">
            <p className="font-semibold">{note.title}</p>
            <p className="mt-1 text-sm text-mist">{note.body}</p>
            <p className="mt-2 text-xs text-mist">{note.author?.name}{note.client ? ` · ${note.client.name}` : ""}{note.due_on ? ` · due ${note.due_on.slice(0, 10)}` : ""}</p>
            <IconButton label={`Delete ${note.title}`} name="trash" tone="danger" onClick={() => api(`/api/v1/notes/${note.id}`, { method: "DELETE" }).then(load)} />
          </li>
        ))}
      </ul>
    </WorkspaceShell>
  );
}
