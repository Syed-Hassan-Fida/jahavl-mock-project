import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { api, formBody, idempotencyKey, onLive, type Upload } from "./api";

type User = { id: number; name: string; email: string; role: string };
type Ticket = { id: number; subject: string; status: string; user?: { name: string } | null; assignee?: { name: string } | null };
type TicketNote = { id: number; body: string; author: string };
type TicketEvent = { id: number; body: string; author: string; has_attachment?: boolean; notes?: TicketNote[] };
type Detail = { id: number; status: string; owner: { name: string } | null; assignee: { name: string } | null; events: TicketEvent[] };
type Contact = { id: number; name: string; role: string; unread?: number };
type Message = { id: number; body: string; sender_id: number };
type Note = { id: number; title: string; body: string; read_at: string | null };

const filters = ["all", "open", "pending", "closed"] as const;

export function Support({ user, liveVersion, onNotice }: { user: User; liveVersion: number; onNotice: (value: string | null) => void }) {
  const [section, setSection] = useState<"Tickets" | "Messages" | "Alerts">("Tickets");
  const staff = user.role === "admin" || user.role === "sales";

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.segments}>
        {(["Tickets", "Messages", "Alerts"] as const).map((name) => (
          <Pressable key={name} onPress={() => setSection(name)} style={section === name ? styles.segmentOn : styles.segment}>
            <Text style={section === name ? styles.segmentTextOn : styles.segmentText}>{name}</Text>
          </Pressable>
        ))}
      </View>
      {section === "Tickets" ? <Tickets user={user} staff={staff} liveVersion={liveVersion} onNotice={onNotice} /> : null}
      {section === "Messages" ? <Messages user={user} liveVersion={liveVersion} onNotice={onNotice} /> : null}
      {section === "Alerts" ? <Alerts liveVersion={liveVersion} onNotice={onNotice} /> : null}
    </View>
  );
}

function Tickets({ user, staff, liveVersion, onNotice }: { user: User; staff: boolean; liveVersion: number; onNotice: (value: string | null) => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<Upload | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api<{ tickets: Ticket[] }>("/api/v1/tickets").then((result) => setTickets(result.tickets)).catch((error: Error) => onNotice(error.message));
  }

  useEffect(() => { load(); }, [liveVersion]);

  useEffect(() => {
    return onLive((event) => {
      const ticket = event.payload.ticket;
      const update = event.payload.event as TicketEvent | undefined;
      if (event.name !== "ticket" || !ticket || !update) return;
      setTickets((rows) => {
        if (!rows.some((row) => row.id === ticket.id)) return [{ id: ticket.id, subject: ticket.subject, status: ticket.status }, ...rows];
        return rows.map((row) => (row.id === ticket.id ? { ...row, status: ticket.status } : row));
      });
      setDetail((current) => {
        if (!current || openId !== ticket.id || current.events.some((row) => row.id === update.id)) return current;
        return { ...current, status: ticket.status, events: [...current.events, update] };
      });
    });
  }, [openId]);

  async function create() {
    if (busy || !subject.trim() || !body.trim()) return;
    setBusy(true);
    try {
      await api("/api/v1/tickets", { method: "POST", headers: { "Idempotency-Key": idempotencyKey() }, body: JSON.stringify({ subject, body }) });
      setSubject("");
      setBody("");
      load();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "The ticket was not opened.");
    } finally {
      setBusy(false);
    }
  }

  async function send(payload: { body?: string; status?: string }, attachment?: Upload | null) {
    if (!openId || busy) return;
    setBusy(true);
    try {
      const next = await api<{ ticket: Detail }>(`/api/v1/tickets/${openId}/events`, attachment
        ? { method: "POST", headers: { "Idempotency-Key": idempotencyKey() }, body: formBody({ body: payload.body ?? "" }, attachment) }
        : { method: "POST", headers: { "Idempotency-Key": idempotencyKey() }, body: JSON.stringify(payload) });
      setDetail(next.ticket);
      setTickets((rows) => rows.map((row) => (row.id === openId ? { ...row, status: next.ticket.status } : row)));
      setReply("");
      setFile(null);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "The reply was not saved.");
    } finally {
      setBusy(false);
    }
  }

  const visible = tickets.filter((ticket) => filter === "all" || ticket.status === filter);

  if (openId) {
    return (
      <ScrollView>
        <Pressable onPress={() => { setOpenId(null); setDetail(null); }}><Text style={styles.link}>All tickets</Text></Pressable>
        {!detail ? <Text style={styles.meta}>Loading the thread…</Text> : null}
        {detail ? (
          <>
            <Text style={styles.meta}>{detail.owner?.name ?? user.name} · {detail.status}{detail.assignee ? ` · ${detail.assignee.name}` : ""}</Text>
            {detail.events.map((event) => (
              <View key={event.id} style={styles.card}>
                <Text style={styles.name}>{event.author}</Text>
                <Text style={styles.meta}>{event.body}{event.has_attachment ? " · attachment" : ""}</Text>
                {(event.notes ?? []).map((note) => <Text key={note.id} style={styles.meta}>{note.author}: {note.body}</Text>)}
                <TextInput style={styles.input} placeholder="Note on this update" onSubmitEditing={async (input) => {
                  const text = input.nativeEvent.text.trim();
                  if (!text || !openId) return;
                  const saved = await api<{ note: TicketNote }>(`/api/v1/tickets/${openId}/events/${event.id}/notes`, { method: "POST", body: JSON.stringify({ body: text }) });
                  setDetail((current) => current && { ...current, events: current.events.map((row) => row.id === event.id ? { ...row, notes: [...(row.notes ?? []), saved.note] } : row) });
                }} />
              </View>
            ))}
            {staff ? (
              <View style={styles.row}>
                {(["open", "pending", "closed"] as const).map((status) => (
                  <Pressable key={status} style={styles.ghost} disabled={busy || detail.status === status} onPress={() => send({ status })}>
                    <Text>{status}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <TextInput style={styles.input} value={reply} onChangeText={setReply} placeholder="Reply" />
            <Pressable style={styles.ghost} onPress={async () => {
              const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
              if (picked.canceled || !picked.assets[0]) return;
              const asset = picked.assets[0];
              setFile({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? "application/octet-stream" });
            }}><Text>{file ? file.name : "Attach a file"}</Text></Pressable>
            <Pressable style={styles.button} disabled={busy} onPress={() => (reply.trim() || file) && send(reply.trim() ? { body: reply } : {}, file)}><Text style={styles.buttonText}>Send</Text></Pressable>
          </>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView>
      <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Subject" />
      <TextInput style={styles.input} value={body} onChangeText={setBody} placeholder="What happened" />
      <Pressable style={styles.button} disabled={busy} onPress={create}><Text style={styles.buttonText}>Open ticket</Text></Pressable>
      <View style={styles.row}>
        {filters.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={filter === item ? styles.segmentOn : styles.segment}>
            <Text style={filter === item ? styles.segmentTextOn : styles.segmentText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      {visible.length === 0 ? <Text style={styles.meta}>{filter === "all" ? "No tickets yet." : `No ${filter} tickets.`}</Text> : null}
      {visible.map((ticket) => (
        <Pressable key={ticket.id} style={styles.card} onPress={() => {
          setOpenId(ticket.id);
          setDetail(null);
          api<{ ticket: Detail }>(`/api/v1/tickets/${ticket.id}`).then((result) => setDetail(result.ticket)).catch((error: Error) => onNotice(error.message));
        }}>
          <Text style={styles.name}>{ticket.subject}</Text>
          <Text style={styles.meta}>{ticket.status}{ticket.user?.name ? ` · ${ticket.user.name}` : ""}{ticket.assignee?.name ? ` · ${ticket.assignee.name}` : ""}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Messages({ user, liveVersion, onNotice }: { user: User; liveVersion: number; onNotice: (value: string | null) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [withId, setWithId] = useState<number | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<Upload | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ contacts: Contact[] }>("/api/v1/messages/contacts").then((result) => setContacts(result.contacts)).catch((error: Error) => onNotice(error.message));
  }, [liveVersion, onNotice]);

  useEffect(() => {
    return onLive((event) => {
      const message = event.payload.message;
      if (event.name !== "message" || !message) return;
      const inThread = withId !== null && (message.sender_id === withId || message.recipient_id === withId);
      if (!inThread && message.sender_id !== user.id) {
        setContacts((rows) => rows.map((row) => (row.id === message.sender_id ? { ...row, unread: (row.unread ?? 0) + 1 } : row)));
      }
      if (!inThread) return;
      setThread((rows) => (rows.some((row) => row.id === message.id) ? rows : [...rows, message]));
    });
  }, [withId, user.id]);

  async function open(contact: Contact) {
    setWithId(contact.id);
    try {
      const result = await api<{ messages: Message[] }>(`/api/v1/messages?with=${contact.id}`);
      setThread(result.messages);
      setContacts((rows) => rows.map((row) => (row.id === contact.id ? { ...row, unread: 0 } : row)));
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "The thread could not be opened.");
    }
  }

  async function send() {
    if (!withId || busy || (!text.trim() && !file)) return;
    setBusy(true);
    try {
      const result = await api<{ message: Message }>("/api/v1/messages", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: file ? formBody({ recipient_id: String(withId), body: text }, file) : JSON.stringify({ recipient_id: withId, body: text }),
      });
      setThread((rows) => (rows.some((row) => row.id === result.message.id) ? rows : [...rows, result.message]));
      setText("");
      setFile(null);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "The message was not sent.");
    } finally {
      setBusy(false);
    }
  }

  if (withId) {
    const contact = contacts.find((row) => row.id === withId);
    return (
      <ScrollView>
        <Pressable onPress={() => setWithId(null)}><Text style={styles.link}>All contacts</Text></Pressable>
        <Text style={styles.heading}>{contact?.name ?? "Thread"}</Text>
        {thread.length === 0 ? <Text style={styles.meta}>No messages in this thread yet.</Text> : null}
        {thread.map((message) => (
          <View key={message.id} style={[styles.bubble, message.sender_id === user.id ? styles.mine : styles.theirs]}>
            <Text style={message.sender_id === user.id ? styles.mineText : styles.meta}>{message.body}</Text>
          </View>
        ))}
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Message" />
        <Pressable style={styles.ghost} onPress={async () => {
          const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
          if (picked.canceled || !picked.assets[0]) return;
          const asset = picked.assets[0];
          setFile({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? "application/octet-stream" });
        }}><Text>{file ? file.name : "Attach a file"}</Text></Pressable>
        <Pressable style={styles.button} disabled={busy} onPress={send}><Text style={styles.buttonText}>Send</Text></Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView>
      {contacts.length === 0 ? <Text style={styles.meta}>No contacts yet.</Text> : null}
      {contacts.map((contact) => (
        <Pressable key={contact.id} style={styles.card} onPress={() => open(contact)}>
          <Text style={styles.name}>{contact.name}{contact.unread ? `  ${contact.unread}` : ""}</Text>
          <Text style={styles.meta}>{contact.role}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Alerts({ liveVersion, onNotice }: { liveVersion: number; onNotice: (value: string | null) => void }) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    api<{ notifications: Note[] }>("/api/v1/notifications").then((result) => setNotes(result.notifications)).catch((error: Error) => onNotice(error.message));
  }, [liveVersion, onNotice]);

  useEffect(() => {
    return onLive((event) => {
      const note = event.payload.notification as Note | undefined;
      if (event.name !== "notification" || !note) return;
      setNotes((rows) => (rows.some((row) => row.id === note.id) ? rows : [note, ...rows]));
    });
  }, []);

  async function read(note: Note) {
    if (note.read_at) return;
    await api(`/api/v1/notifications/${note.id}/read`, { method: "POST" }).catch((error: Error) => onNotice(error.message));
    setNotes((rows) => rows.map((row) => (row.id === note.id ? { ...row, read_at: new Date().toISOString() } : row)));
  }

  return (
    <ScrollView>
      <Pressable style={styles.ghost} onPress={async () => {
        await api("/api/v1/notifications/read-all", { method: "POST" }).catch((error: Error) => onNotice(error.message));
        setNotes((rows) => rows.map((row) => ({ ...row, read_at: row.read_at ?? new Date().toISOString() })));
      }}><Text>Mark all read</Text></Pressable>
      {notes.length === 0 ? <Text style={styles.meta}>No alerts yet.</Text> : null}
      {notes.map((note) => (
        <View key={note.id} style={styles.card}>
          <Pressable onPress={() => read(note)}>
            <Text style={styles.name}>{note.title}</Text>
            <Text style={styles.meta}>{note.body}{note.read_at ? "" : " · unread"}</Text>
          </Pressable>
          <Pressable onPress={async () => {
            await api(`/api/v1/notifications/${note.id}`, { method: "DELETE" }).catch((error: Error) => onNotice(error.message));
            setNotes((rows) => rows.filter((row) => row.id !== note.id));
          }}><Text style={styles.link}>Delete</Text></Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segments: { flexDirection: "row", gap: 8, marginBottom: 8 },
  segment: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#faf8f4" },
  segmentOn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#14171c" },
  segmentText: { color: "#5c6168", fontWeight: "700", textTransform: "capitalize" },
  segmentTextOn: { color: "#f3f0e8", fontWeight: "700", textTransform: "capitalize" },
  heading: { color: "#14171c", fontSize: 28, fontWeight: "600", marginVertical: 8 },
  card: { backgroundColor: "#faf8f4", borderColor: "#e2dcd0", borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  name: { color: "#14171c", fontSize: 18, fontWeight: "600" },
  meta: { color: "#5c6168", marginTop: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  button: { backgroundColor: "#14171c", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8, alignSelf: "flex-start" },
  buttonText: { color: "#f3f0e8", fontWeight: "700" },
  ghost: { borderColor: "#14171c33", borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  link: { color: "#b8611a", fontWeight: "700", marginVertical: 8 },
  input: { backgroundColor: "white", borderColor: "#e2dcd0", borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  bubble: { borderRadius: 16, padding: 12, marginBottom: 8, maxWidth: "85%" },
  mine: { alignSelf: "flex-end", backgroundColor: "#14171c" },
  theirs: { alignSelf: "flex-start", backgroundColor: "#faf8f4", borderColor: "#e2dcd0", borderWidth: 1 },
  mineText: { color: "#f3f0e8" },
});
