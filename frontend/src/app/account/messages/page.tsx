"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { Icon, IconButton } from "@/components/Icons";
import { API_URL } from "@/lib/api";
import { api, authHeaders, sessionUser } from "@/lib/client";
import { idempotencyKey, type LiveEvent } from "@/lib/live";

type Contact = { id: number; name: string; role: string; unread?: number };
type Message = { id: number; body: string; sender_id: number; created_at?: string; has_attachment?: boolean };

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function when(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filter, setFilter] = useState("");
  const [withId, setWithId] = useState<number | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const me = sessionUser()?.id;
  const active = contacts.find((contact) => contact.id === withId) ?? null;
  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((contact) => contact.name.toLowerCase().includes(needle) || contact.role.includes(needle));
  }, [contacts, filter]);

  useEffect(() => {
    api<{ contacts: Contact[] }>("/api/v1/messages/contacts").then((body) => setContacts(body.contacts)).catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    function onLive(event: Event) {
      const detail = (event as CustomEvent<LiveEvent>).detail;
      const message = detail.payload.message;
      if (detail.name !== "message" || !message) return;
      const inOpenThread = withId !== null && (message.sender_id === withId || message.recipient_id === withId);
      if (!inOpenThread && message.sender_id !== me) {
        setContacts((rows) => rows.map((row) => (row.id === message.sender_id ? { ...row, unread: (row.unread ?? 0) + 1 } : row)));
      }
      setThread((rows) => {
        if (!inOpenThread) return rows;
        const mine = message.sender_id === me || message.recipient_id === me;
        if (!mine || rows.some((row) => row.id === message.id)) return rows;
        return [...rows, message];
      });
    }
    window.addEventListener("jah-live", onLive);
    return () => window.removeEventListener("jah-live", onLive);
  }, [withId, me]);

  async function open(id: number) {
    setWithId(id);
    setError(null);
    setFileName(null);
    try {
      const body = await api<{ messages: Message[] }>(`/api/v1/messages?with=${id}`);
      setThread(body.messages);
      setContacts((rows) => rows.map((row) => (row.id === id ? { ...row, unread: 0 } : row)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The thread could not be opened.");
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!withId || sending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = String(data.get("body") ?? "").trim();
    const file = data.get("file");
    if (!body && !(file instanceof File && file.size > 0)) return;
    data.set("recipient_id", String(withId));
    setSending(true);
    try {
      const saved = await api<{ message: Message }>("/api/v1/messages", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: data,
      });
      setThread((rows) => (rows.some((row) => row.id === saved.message.id) ? rows : [...rows, saved.message]));
      form.reset();
      setFileName(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The message was not sent.");
    } finally {
      setSending(false);
    }
  }

  async function openFile(id: number) {
    const response = await fetch(`${API_URL}/api/v1/messages/${id}/file`, { headers: authHeaders(false) });
    if (response.ok) window.open(URL.createObjectURL(await response.blob()));
  }

  return (
    <WorkspaceShell title="Messages" description="People in your book of business. You can only message accounts you are assigned to.">
      {error ? <p className="mb-4 text-sm text-copper">{error}</p> : null}
      <div className="overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_12px_40px_rgb(20_23_28/0.04)] md:grid md:h-[min(40rem,calc(100dvh-13rem))] md:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className={`${withId ? "hidden md:flex" : "flex"} min-h-80 flex-col border-line md:border-r`}>
          <div className="border-b border-line p-3">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3">
              <span className="sr-only">Find a contact</span>
              <Icon name="search" className="h-4 w-4 text-mist" />
              <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Find a contact" className="h-full min-w-0 flex-1 bg-transparent text-sm font-normal outline-none" />
            </label>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {visible.length === 0 ? <li className="px-3 py-6 text-sm text-mist">{contacts.length === 0 ? "No contacts yet." : "No contact matches that name."}</li> : null}
            {visible.map((contact) => {
              const selected = withId === contact.id;
              return (
                <li key={contact.id}>
                  <button type="button" onClick={() => open(contact.id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${selected ? "bg-ink text-cream" : "hover:bg-foam"}`}>
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold ${selected ? "bg-cream text-ink" : "bg-foam text-ink"}`}>{initials(contact.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{contact.name}</span>
                      <span className={`block text-xs capitalize ${selected ? "text-haze" : "text-mist"}`}>{contact.role}</span>
                    </span>
                    {contact.unread ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-copper px-1.5 text-[11px] font-semibold text-cream">{contact.unread}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <section className={`${withId ? "flex" : "hidden md:flex"} min-h-[28rem] flex-col`}>
          {active ? (
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-foam md:hidden" aria-label="All contacts" onClick={() => setWithId(null)}>
                <Icon name="back" />
              </button>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-foam text-xs font-semibold">{initials(active.name)}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{active.name}</span>
                <span className="block text-xs capitalize text-mist">{active.role}</span>
              </span>
            </header>
          ) : (
            <div className="grid flex-1 place-items-center px-6 text-center">
              <p className="max-w-xs text-sm text-mist">Choose a contact. The thread stays on this side of the desk.</p>
            </div>
          )}
          {active ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {thread.length === 0 ? <p className="text-sm text-mist">No messages in this thread yet.</p> : null}
                {thread.map((message) => {
                  const mine = message.sender_id === me;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[min(28rem,85%)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${mine ? "bg-ink text-cream" : "bg-foam text-ink"}`}>
                        <p className="whitespace-pre-wrap">{message.body}</p>
                        <p className={`mt-1 flex items-center gap-2 text-[11px] ${mine ? "text-haze" : "text-mist"}`}>
                          <span>{when(message.created_at)}</span>
                          {message.has_attachment ? (
                            <button type="button" className="inline-flex items-center gap-1 font-semibold underline" onClick={() => openFile(message.id)}>
                              <Icon name="download" className="h-3.5 w-3.5" />
                              File
                            </button>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={send} className="border-t border-line p-3">
                {fileName ? <p className="mb-2 truncate px-1 text-xs text-mist">{fileName}</p> : null}
                <div className="flex items-center gap-2">
                  <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink hover:bg-foam">
                    <span className="sr-only">Attach a file</span>
                    <Icon name="paperclip" />
                    <input name="file" type="file" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)} />
                  </label>
                  <input name="body" className="field h-11 flex-1 py-0 font-normal" placeholder={`Message ${active.name}`} />
                  <IconButton label={sending ? "Sending" : "Send"} name="send" type="submit" tone="solid" disabled={sending} />
                </div>
              </form>
            </div>
          ) : null}
        </section>
      </div>
    </WorkspaceShell>
  );
}
