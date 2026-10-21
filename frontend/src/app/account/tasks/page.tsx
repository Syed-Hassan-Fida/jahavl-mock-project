"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { EmptyState, SkeletonBlock, toast } from "@/components/ui";
import { api } from "@/lib/client";

type Task = { id: number; title: string; notes: string | null; completed_at: string | null };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    api<{ tasks: Task[] }>("/api/v1/tasks").then((body) => setTasks(body.tasks)).catch((reason: Error) => setError(reason.message));
  }, []);

  const open = tasks?.filter((task) => !task.completed_at) ?? [];
  const done = tasks?.filter((task) => task.completed_at) ?? [];

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    if (!title) {
      setTitleError("Give the task a title.");
      return;
    }
    setTitleError(null);
    try {
      const body = await api<{ task: Task }>("/api/v1/tasks", { method: "POST", body: JSON.stringify({ title, notes: data.get("notes") }) });
      setTasks((rows) => [body.task, ...(rows ?? [])]);
      form.reset();
      toast("Task added.", "success");
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "The task was not saved.", "error");
    }
  }

  async function toggle(task: Task) {
    await api(`/api/v1/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed: !task.completed_at }) });
    setTasks((rows) => rows?.map((row) => row.id === task.id ? { ...row, completed_at: row.completed_at ? null : new Date().toISOString() } : row) ?? null);
  }

  return (
    <WorkspaceShell title="Tasks" description="Follow-ups on your book of business. Completed tasks stay listed so the day is visible.">
      {error ? <p role="alert" className="mb-4 rounded-2xl border border-[#e7c4b0] bg-[#fbf3ee] px-4 py-3 text-sm text-[#8c3f0e]">{error}</p> : null}
      <form onSubmit={add} className="mb-4 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-semibold">Title
          <input name="title" required aria-invalid={titleError ? true : undefined} className="field w-64 font-normal" onBlur={(event) => setTitleError(event.target.value.trim() ? null : "Give the task a title.")} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Notes
          <input name="notes" className="field w-72 font-normal" />
        </label>
        <button className="btn btn-primary"><Icon name="plus" /> Add task</button>
        {titleError ? <p role="alert" className="basis-full text-sm text-copper">{titleError}</p> : null}
      </form>
      {tasks === null && !error ? <div aria-busy="true"><span className="sr-only">Loading tasks</span><SkeletonBlock className="h-16" /><SkeletonBlock className="mt-2 h-16" /></div> : null}
      {tasks && tasks.length === 0 ? <EmptyState title="No tasks yet" body="Add a follow-up above. Completed tasks stay on the list so the day stays visible." /> : null}
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
