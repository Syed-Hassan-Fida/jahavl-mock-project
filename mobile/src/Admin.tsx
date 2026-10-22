import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "./api";

type Person = { id: number; name: string; email: string; role: string; yearly_target?: number | null };
type Product = { id: number; name: string; list_price: string; dealer_price: string; image: string | null };
type RequestRow = { id: number; note?: string | null; status: string; user?: { name: string } | null };
type Application = { id: number; company_name?: string | null; status: string; email?: string | null };
type Note = { id: number; title: string; body: string };

export function Admin({ role, onNotice }: { role: string; onNotice: (value: string | null) => void }) {
  const [section, setSection] = useState<"People" | "Approvals" | "Pricing" | "Notes">(role === "admin" ? "People" : "Notes");
  const sections = role === "admin" ? (["People", "Approvals", "Pricing", "Notes"] as const) : (["People", "Notes"] as const);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.row}>
        {sections.map((name) => (
          <Pressable key={name} onPress={() => setSection(name)} style={section === name ? styles.on : styles.off}>
            <Text style={section === name ? styles.onText : styles.offText}>{name}</Text>
          </Pressable>
        ))}
      </View>
      {section === "People" ? <People admin={role === "admin"} onNotice={onNotice} /> : null}
      {section === "Approvals" && role === "admin" ? <Approvals onNotice={onNotice} /> : null}
      {section === "Pricing" && role === "admin" ? <Pricing onNotice={onNotice} /> : null}
      {section === "Notes" ? <Notes onNotice={onNotice} /> : null}
    </View>
  );
}

function People({ admin, onNotice }: { admin: boolean; onNotice: (value: string | null) => void }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");
  const [salesId, setSalesId] = useState<number | null>(null);

  function load() {
    api<{ users: Person[] }>("/api/v1/people").then((body) => setPeople(body.users)).catch((error: Error) => onNotice(error.message));
  }
  useEffect(() => { load(); }, []);

  return (
    <ScrollView>
      {people.map((person) => (
        <View key={person.id} style={styles.card}>
          <Text style={styles.name}>{person.name}</Text>
          <Text style={styles.meta}>{person.role} · {person.email}{person.yearly_target ? ` · $${person.yearly_target}/yr` : ""}</Text>
          {admin && person.role === "sales" ? <Pressable onPress={() => setSalesId(person.id)}><Text style={styles.link}>Set target</Text></Pressable> : null}
          {admin && person.role !== "admin" ? <Pressable onPress={async () => { await api(`/api/v1/people/${person.id}`, { method: "DELETE" }).catch((error: Error) => onNotice(error.message)); load(); }}><Text style={styles.link}>Remove</Text></Pressable> : null}
        </View>
      ))}
      {salesId ? (
        <View style={styles.card}>
          <TextInput style={styles.input} value={monthly} onChangeText={setMonthly} placeholder="Monthly target" keyboardType="number-pad" />
          <TextInput style={styles.input} value={yearly} onChangeText={setYearly} placeholder="Yearly target" keyboardType="number-pad" />
          <Pressable style={styles.button} onPress={async () => {
            await api(`/api/v1/people/${salesId}/target`, { method: "PATCH", body: JSON.stringify({ monthly_target: Number(monthly || 0), yearly_target: Number(yearly || 0) }) }).catch((error: Error) => onNotice(error.message));
            setSalesId(null);
            load();
          }}><Text style={styles.buttonText}>Save target</Text></Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Approvals({ onNotice }: { onNotice: (value: string | null) => void }) {
  const [taxes, setTaxes] = useState<RequestRow[]>([]);
  const [dealers, setDealers] = useState<Application[]>([]);

  function load() {
    api<{ requests: RequestRow[] }>("/api/v1/tax-requests").then((body) => setTaxes(body.requests)).catch((error: Error) => onNotice(error.message));
    api<{ applications: Application[] }>("/api/v1/dealer-applications").then((body) => setDealers(body.applications)).catch((error: Error) => onNotice(error.message));
  }
  useEffect(() => { load(); }, []);

  return (
    <ScrollView>
      <Text style={styles.kicker}>TAX</Text>
      {taxes.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.name}>{row.user?.name ?? "Request"} · {row.status}</Text>
          <View style={styles.row}>
            <Pressable onPress={() => api(`/api/v1/tax-requests/${row.id}/review`, { method: "POST", body: JSON.stringify({ decision: "approved" }) }).then(load)}><Text style={styles.link}>Approve</Text></Pressable>
            <Pressable onPress={() => api(`/api/v1/tax-requests/${row.id}/review`, { method: "POST", body: JSON.stringify({ decision: "rejected" }) }).then(load)}><Text style={styles.link}>Reject</Text></Pressable>
          </View>
        </View>
      ))}
      <Text style={styles.kicker}>DEALERS</Text>
      {dealers.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.name}>{row.company_name ?? row.email} · {row.status}</Text>
          <View style={styles.row}>
            <Pressable onPress={() => api(`/api/v1/dealer-applications/${row.id}/review`, { method: "POST", body: JSON.stringify({ decision: "approved" }) }).then(load)}><Text style={styles.link}>Approve</Text></Pressable>
            <Pressable onPress={() => api(`/api/v1/dealer-applications/${row.id}/review`, { method: "POST", body: JSON.stringify({ decision: "rejected" }) }).then(load)}><Text style={styles.link}>Reject</Text></Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Pricing({ onNotice }: { onNotice: (value: string | null) => void }) {
  const [rows, setRows] = useState<Product[]>([]);
  const [price, setPrice] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  function load() {
    api<{ products: Product[] }>("/api/v1/admin/products").then((body) => setRows(body.products)).catch((error: Error) => onNotice(error.message));
  }
  useEffect(() => { load(); }, []);

  return (
    <ScrollView>
      <TextInput style={styles.input} placeholder="Search products" onChangeText={(value) => {
        api<{ products: Product[] }>(`/api/v1/admin/products?q=${encodeURIComponent(value)}`).then((body) => setRows(body.products)).catch((error: Error) => onNotice(error.message));
      }} />
      {rows.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.name}>{row.name}</Text>
          <Text style={styles.meta}>MSRP {row.list_price} · dealer {row.dealer_price}</Text>
          <View style={styles.row}>
            <Pressable onPress={() => setSelected(row.id)}><Text style={styles.link}>Edit MSRP</Text></Pressable>
            {row.image ? <Pressable onPress={() => api(`/api/v1/admin/products/${row.id}/image`, { method: "DELETE" }).then(load)}><Text style={styles.link}>Remove image</Text></Pressable> : null}
            <Pressable onPress={() => api(`/api/v1/admin/products/${row.id}`, { method: "DELETE" }).then(load).catch((error: Error) => onNotice(error.message))}><Text style={styles.link}>Delete</Text></Pressable>
          </View>
        </View>
      ))}
      {selected ? (
        <View style={styles.card}>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="New MSRP" keyboardType="decimal-pad" />
          <Pressable style={styles.button} onPress={async () => {
            await api(`/api/v1/admin/products/${selected}`, { method: "PATCH", body: JSON.stringify({ list_price: price }) });
            setSelected(null);
            setPrice("");
            load();
          }}><Text style={styles.buttonText}>Save MSRP</Text></Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Notes({ onNotice }: { onNotice: (value: string | null) => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function load() {
    api<{ notes: Note[] }>("/api/v1/notes").then((result) => setNotes(result.notes)).catch((error: Error) => onNotice(error.message));
  }
  useEffect(() => { load(); }, []);

  return (
    <ScrollView>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" />
      <TextInput style={styles.input} value={body} onChangeText={setBody} placeholder="Note" />
      <Pressable style={styles.button} onPress={async () => {
        await api("/api/v1/notes", { method: "POST", body: JSON.stringify({ title, body }) });
        setTitle("");
        setBody("");
        load();
      }}><Text style={styles.buttonText}>Save note</Text></Pressable>
      {notes.map((note) => (
        <Pressable key={note.id} style={styles.card} onPress={() => api(`/api/v1/notes/${note.id}`, { method: "DELETE" }).then(load)}>
          <Text style={styles.name}>{note.title}</Text>
          <Text style={styles.meta}>{note.body}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  on: { borderRadius: 999, minHeight: 48, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "#14161c" },
  off: { borderRadius: 999, minHeight: 48, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e5dfd4" },
  onText: { color: "#f3f0e8", fontWeight: "700" },
  offText: { color: "#5c6168", fontWeight: "700" },
  card: { backgroundColor: "#faf8f4", borderColor: "#e2dcd0", borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  name: { color: "#14171c", fontSize: 18, fontWeight: "600" },
  meta: { color: "#5c6168", marginTop: 4 },
  link: { color: "#b8611a", fontWeight: "700", marginTop: 8, marginRight: 12 },
  kicker: { marginTop: 8, marginBottom: 6, color: "#b8611a", fontWeight: "700", letterSpacing: 1 },
  button: { backgroundColor: "#14161c", borderRadius: 999, minHeight: 48, paddingHorizontal: 16, justifyContent: "center", marginTop: 8, alignSelf: "flex-start" },
  buttonText: { color: "#f3f0e8", fontWeight: "700" },
  input: { backgroundColor: "white", borderColor: "#e5dfd4", borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 12, marginTop: 8, color: "#14161c" },
});
