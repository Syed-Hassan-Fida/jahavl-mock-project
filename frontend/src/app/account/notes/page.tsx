"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icon, IconButton } from "@/components/Icons";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { ConfirmDialog, EmptyState, SkeletonBlock, toast } from "@/components/ui";
import { api } from "@/lib/client";

type Note = { id: number; title: string; body: string; due_on: string | null; author?: { name: string } | null; client?: { name: string } | null };
type Task = { id: number; title: string; notes: string | null };

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState<Note | null>(null);

  function load() {
    setNotes(null);
    api<{ notes: Note[] }>("/api/v1/notes").then((body) => setNotes(body.notes)).catch((reason: Error) => { setError(reason.message); setNotes([]); });
    api<{ tasks: Task[] }>("/api/v1/tasks").then((body) => setTasks(body.tasks)).catch(() => setTasks([]));
  }

  useEffect(() => { load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const body = String(data.get("body") ?? "").trim();
    if (!title || !body) {
      setFieldError("A note needs a title and a body.");
      return;
    }
    setFieldError(null);
    try {
      await api("/api/v1/notes", { method: "POST", body: JSON.stringify({ title, body, due_on: data.get("due_on") || null }) });
      form.reset();
      toast("Note saved.", "success");
      load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The note was not saved.";
      setError(message);
      toast(message, "error");
    }
  }

  async function makeTask(note: Note) {
    try {
      const body = await api<{ task: Task }>("/api/v1/tasks", { method: "POST", body: JSON.stringify({ title: note.title, notes: note.body }) });
      setTasks((rows) => [body.task, ...rows.filter((row) => row.id !== body.task.id)]);
      toast("Task created from this note.", "success");
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "The task was not created.", "error");
    }
  }

  return (
    <WorkspaceShell title="Sales notes" description="A log separate from tasks. Notes stay with the specialist who wrote them.">
      {error ? <p className="mb-4 text-sm text-copper">{error}</p> : null}
      <form onSubmit={create} className="panel max-w-xl p-5">
        <label className="grid gap-1 text-sm font-semibold">Title<input name="title" required className="field font-normal" aria-invalid={fieldError ? true : undefined} /></label>
        <label className="mt-3 grid gap-1 text-sm font-semibold">Note<textarea name="body" required className="field min-h-24 font-normal" /></label>
        <label className="mt-3 grid gap-1 text-sm font-semibold">Due<input name="due_on" type="date" className="field font-normal" /></label>
        {fieldError ? <p role="alert" className="mt-2 text-sm text-copper">{fieldError}</p> : null}
        <button className="btn btn-primary mt-4"><Icon name="plus" /> Save note</button>
      </form>
      {notes === null && !error ? <div className="mt-4" aria-busy="true"><span className="sr-only">Loading notes</span><SkeletonBlock className="h-24" /></div> : null}
      {notes && notes.length === 0 ? <div className="mt-4 max-w-xl"><EmptyState title="No notes yet" body="Write what the next specialist should know. You can turn a note into a task without leaving this page." /></div> : null}
      <ul className="mt-4 max-w-xl space-y-2">
        {notes?.map((note) => (
          <li key={note.id} className="panel px-4 py-3">
            <p className="font-semibold">{note.title}</p>
            <p className="mt-1 text-sm text-mist">{note.body}</p>
            <p className="mt-2 text-xs text-mist">{note.author?.name}{note.client ? ` · ${note.client.name}` : ""}{note.due_on ? ` · due ${note.due_on.slice(0, 10)}` : ""}</p>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => makeTask(note)}>Create task</button>
              <IconButton label={`Delete ${note.title}`} name="trash" tone="danger" onClick={() => setPending(note)} />
            </div>
          </li>
        ))}
      </ul>
      {tasks.length ? (
        <section className="mt-6 max-w-xl" aria-labelledby="tasks-from-notes">
          <h2 id="tasks-from-notes" className="text-3xl">Tasks</h2>
          <ul className="mt-3 space-y-2">
            {tasks.slice(0, 6).map((task) => <li key={task.id} className="rounded-xl border border-line bg-white px-3 py-2 text-sm"><span className="font-semibold">{task.title}</span>{task.notes ? <span className="text-mist"> · {task.notes}</span> : null}</li>)}
          </ul>
        </section>
      ) : null}
      <ConfirmDialog open={pending !== null} title="Delete this note?" body={pending ? `“${pending.title}” will be removed. This cannot be undone.` : ""} confirmLabel="Delete note" onClose={() => setPending(null)} onConfirm={() => { if (!pending) return; const note = pending; setPending(null); api(`/api/v1/notes/${note.id}`, { method: "DELETE" }).then(() => { toast("Note deleted.", "success"); load(); }).catch((reason: Error) => toast(reason.message, "error")); }} />
    </WorkspaceShell>
  );
}
