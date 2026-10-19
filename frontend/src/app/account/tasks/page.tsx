"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { api } from "@/lib/client";

type Task = { id: number; title: string; notes: string | null; completed_at: string | null };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ tasks: Task[] }>("/api/v1/tasks").then((body) => setTasks(body.tasks)).catch((reason: Error) => setError(reason.message));
  }, []);

  const open = tasks?.filter((task) => !task.completed_at) ?? [];
  const done = tasks?.filter((task) => task.completed_at) ?? [];

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = await api<{ task: Task }>("/api/v1/tasks", { method: "POST", body: JSON.stringify({ title: form.get("title"), notes: form.get("notes") }) });
    setTasks((rows) => [body.task, ...(rows ?? [])]);
    event.currentTarget.reset();
  }

  async function toggle(task: Task) {
    await api(`/api/v1/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed: !task.completed_at }) });
    setTasks((rows) => rows?.map((row) => row.id === task.id ? { ...row, completed_at: row.completed_at ? null : new Date().toISOString() } : row) ?? null);
  }

  return (
    <WorkspaceShell title="Tasks" description="Follow-ups on your book of business. Completed tasks stay listed so the day is visible.">
      {error ? <p className="mb-4 text-sm text-copper">{error}</p> : null}
      <form onSubmit={add} className="mb-4 flex flex-wrap gap-2">
        <input name="title" required placeholder="Task" className="field max-w-xs font-normal" />
        <input name="notes" placeholder="Notes" className="field max-w-sm font-normal" />
        <button className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream"><Icon name="plus" /> Add task</button>
      </form>
      {tasks === null && !error ? <p className="text-sm text-mist">Loading tasks…</p> : null}
      {tasks && tasks.length === 0 ? <p className="text-sm text-mist">No tasks yet.</p> : null}
      <ul className="max-w-2xl space-y-2">
        {[...open, ...done].map((task) => (
          <li key={task.id} className="flex items-center justify-between rounded-2xl border border-line bg-paper px-4 py-3">
            <span>
              <span className={`font-semibold ${task.completed_at ? "text-mist line-through" : ""}`}>{task.title}</span>
              {task.notes ? <span className="ml-2 text-sm text-mist">{task.notes}</span> : null}
            </span>
            <button type="button" className="text-sm font-semibold" onClick={() => toggle(task)}>{task.completed_at ? "Reopen" : "Done"}</button>
          </li>
        ))}
      </ul>
    </WorkspaceShell>
  );
}
