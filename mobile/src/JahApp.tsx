import { useEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api, formBody, media, money, onLive, openPdf, setToken, setUnauthorizedHandler, startLivePolling } from "./api";
import { Admin } from "./Admin";
import { Support } from "./Support";
import { clearSession, loadSession, saveSession } from "./session";
import { color, hit, radius, space } from "./theme";

type Tab = "Catalog" | "Quotes" | "Service" | "Account" | "Admin";
type User = { id: number; name: string; email: string; role: string };
type Product = { id: number; name: string; slug: string; list_price: string; pitch?: string | null };
type Series = { name: string; slug: string; summary: string | null; product_count: number; image?: string | null };
type Category = { name: string; slug: string; series: Series[] };
type QuoteRow = { id: number; name: string; status: string; status_code: number; total: string; type: string; checkout_allowed: boolean };
type Quote = QuoteRow & {
  tax: string;
  shipping?: string;
  discount?: string;
  items: { id: number; parent_id: number | null; label: string | null; quantity: number; line_total: string; kind: string }[];
  permissions: Record<string, boolean>;
  payments: { id: number; amount: string; kind: string; status: string }[];
};
type Person = { id: number; name: string; role: string };
type CatalogHit = { id: number; name: string; list_price: string };

export default function JahApp() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [guest, setGuest] = useState(false);
  const [tab, setTab] = useState<Tab>("Catalog");
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveVersion, setLiveVersion] = useState(0);

  useEffect(() => {
    loadSession().then((session) => {
      if (session) {
        setToken(session.token);
        setUser(session.user);
        setNotice(null);
      }
      setReady(true);
    });
    setUnauthorizedHandler(() => {
      setToken("");
      clearSession();
      setUser(null);
      setGuest(false);
      setNotice("Your session expired. Sign in again.");
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const stop = startLivePolling();
    const unsubscribe = onLive((event) => {
      if (event.name === "notification") setNotice(event.payload.notification?.title ?? "New alert");
      if (event.name === "message") setNotice("New message");
      if (event.name === "ticket") setNotice(event.payload.ticket?.subject ?? "Ticket updated");
      setLiveVersion((value) => value + 1);
    });
    return () => {
      stop();
      unsubscribe();
    };
  }, [user]);

  // Dev-only: walk tabs so simulator screenshots can capture each feature surface.
  useEffect(() => {
    if (!__DEV__ || !user || process.env.EXPO_PUBLIC_CYCLE_TABS !== "1") return;
    const order = (["Catalog", "Quotes", "Service", "Account", "Admin"] as Tab[]).filter(
      (name) => name !== "Admin" || user.role === "admin" || user.role === "sales",
    );
    let index = 0;
    setTab(order[0]);
    const timer = setInterval(() => {
      index = (index + 1) % order.length;
      setTab(order[index]);
    }, 3500);
    return () => clearInterval(timer);
  }, [user]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.brand}>JAH AUDIO</Text>
        <Text style={styles.meta}>Opening your workspace…</Text>
      </SafeAreaView>
    );
  }

  if (!user && !guest) {
    return <Login onSignedIn={(next) => { setUser(next); setNotice(null); }} onBrowse={() => setGuest(true)} notice={notice} />;
  }

  const tabs = (["Catalog", "Quotes", "Service", "Account"] as Tab[]).concat(user && (user.role === "admin" || user.role === "sales") ? ["Admin"] : []);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <Text style={styles.brand}>JAH AUDIO</Text>
      <Text style={styles.word}>{tab}</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <View style={styles.body}>
        {tab === "Catalog" ? <Catalog onNotice={setNotice} signedIn={!!user} /> : null}
        {tab === "Quotes" ? <Quotes signedIn={!!user} onNotice={setNotice} /> : null}
        {tab === "Service" ? (user ? <Support user={user} liveVersion={liveVersion} onNotice={setNotice} /> : <Text style={styles.meta}>Sign in to open tickets, messages, and alerts.</Text>) : null}
        {tab === "Account" ? <Account user={user} setUser={setUser} onNotice={setNotice} onRequestSignIn={() => setGuest(false)} /> : null}
        {tab === "Admin" ? (user && (user.role === "admin" || user.role === "sales") ? <Admin role={user.role} onNotice={setNotice} /> : <Text style={styles.meta}>Sign in as admin or sales.</Text>) : null}
      </View>
      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, space.md) + space.sm }]}>
        {tabs.map((name) => (
          <Pressable key={name} onPress={() => setTab(name)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === name }} accessibilityLabel={name}>
            <Text style={tab === name ? styles.tabOn : styles.tabOff}>{name}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function Login({ onSignedIn, onBrowse, notice }: { onSignedIn: (user: User) => void; onBrowse: () => void; notice: string | null }) {
  const autoEmail = process.env.EXPO_PUBLIC_AUTO_LOGIN_EMAIL ?? "";
  const autoPassword = process.env.EXPO_PUBLIC_AUTO_LOGIN_PASSWORD ?? "";
  const [email, setEmail] = useState(autoEmail);
  const [password, setPassword] = useState(autoPassword);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const autoTried = useRef(false);

  async function submit(nextEmail = email, nextPassword = password) {
    if (!nextEmail.includes("@") || nextPassword.length < 8) {
      setError("Enter the email and password you were given.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const body = await api<{ token: string; user: User }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email: nextEmail.trim(), password: nextPassword }) });
      setToken(body.token);
      await saveSession(body.token, body.user);
      onSignedIn(body.user);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed. Check the connection and try again.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (!__DEV__ || autoTried.current || !autoEmail || !autoPassword) return;
    autoTried.current = true;
    void submit(autoEmail, autoPassword);
  }, [autoEmail, autoPassword]);

  return (
    <SafeAreaView style={styles.login}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center" }}>
        <Text style={styles.brandLight}>JAH AUDIO</Text>
        <Text style={styles.loginTitle}>Sign in</Text>
        <Text style={styles.loginCopy}>Quotes, service, and the pipeline for your role.</Text>
        {notice ? <Text style={styles.noticeDark}>{notice}</Text> : null}
        {error ? <Text style={styles.noticeDark} accessibilityRole="alert">{error}</Text> : null}
        <TextInput style={styles.input} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#a7aeb8" accessibilityLabel="Email" />
        <TextInput style={styles.input} secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#a7aeb8" accessibilityLabel="Password" />
        <Pressable style={styles.button} onPress={submit} disabled={pending} accessibilityRole="button" accessibilityLabel="Sign in">
          <Text style={styles.buttonText}>{pending ? "Signing in…" : "Sign in"}</Text>
        </Pressable>
        <Pressable style={styles.ghostLight} onPress={onBrowse} accessibilityRole="button" accessibilityLabel="Browse the catalog without signing in">
          <Text style={styles.ghostLightText}>Browse the catalog</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const categoryOrder = ["led", "lighting", "audio"];
const seriesOrder: Record<string, string[]> = {
  led: ["j-series", "je-series", "jw-series", "jhd-series"],
  lighting: ["intelligent-series", "versa-series", "hl-series"],
  audio: ["jla-series", "jx-series", "jda-series"],
};

function sortSeries(category: string, series: Series[]) {
  const rank = seriesOrder[category] ?? [];
  return [...series].sort((a, b) => {
    const aLast = a.slug.includes("accessor");
    const bLast = b.slug.includes("accessor");
    if (aLast !== bLast) return aLast ? 1 : -1;
    const ai = rank.indexOf(a.slug);
    const bi = rank.indexOf(b.slug);
    if (ai === -1 && bi === -1) return a.slug.localeCompare(b.slug);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.name}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={styles.ghost} onPress={() => onChange(Math.max(min, value - 1))}><Text>-</Text></Pressable>
        <Text style={styles.name}>{value} ft</Text>
        <Pressable style={styles.ghost} onPress={() => onChange(Math.min(max, value + 1))}><Text>+</Text></Pressable>
      </View>
    </View>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.planStat}>
      <Text style={styles.tileMeta}>{label}</Text>
      <Text style={styles.name}>{value}</Text>
    </View>
  );
}

function WallPlan() {
  const [widthFt, setWidthFt] = useState(16);
  const [heightFt, setHeightFt] = useState(9);
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);

  useEffect(() => {
    Promise.all(["j-series", "je-series", "jhd-series"].map((slug) => api<{ series: { products: { name: string; list_price: string }[] } }>(`/api/v1/series/${slug}`)))
      .then((rows) => {
        const prices = rows
          .flatMap((row) => row.series.products)
          .filter((product) => !/frame|clamp|stabil/i.test(product.name))
          .map((product) => Number(product.list_price))
          .filter((price) => price > 0);
        if (prices.length) setRange({ min: Math.min(...prices), max: Math.max(...prices) });
      })
      .catch(() => undefined);
  }, []);

  const columns = Math.max(1, Math.round((widthFt * 304.8) / 500));
  const rows = Math.max(1, Math.round((heightFt * 304.8) / 500));
  const cabinets = columns * rows;

  return (
    <View style={styles.plan}>
      <Text style={styles.kicker}>SIZE THE WALL</Text>
      <Stepper label="Width" value={widthFt} min={8} max={40} onChange={setWidthFt} />
      <Stepper label="Height" value={heightFt} min={6} max={24} onChange={setHeightFt} />
      <View style={styles.planRow}>
        <PlanStat label="Suggested columns" value={String(columns)} />
        <PlanStat label="Suggested rows" value={String(rows)} />
        <PlanStat label="Suggested cabinets" value={String(cabinets)} />
      </View>
      {range ? (
        <View style={styles.planRow}>
          <PlanStat label="Minimum cost" value={money(cabinets * range.min)} />
          <PlanStat label="Maximum cost" value={money(cabinets * range.max)} />
        </View>
      ) : null}
      <Text style={styles.meta}>Sample range from the catalog. Not a live quote.</Text>
    </View>
  );
}

function Catalog({ onNotice, signedIn }: { onNotice: (value: string | null) => void; signedIn: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [seriesName, setSeriesName] = useState<string | null>(null);

  useEffect(() => {
    api<{ categories: Category[] }>("/api/v1/catalog").then((body) => setCategories(body.categories)).catch(() => onNotice("Start the API on 127.0.0.1:8000."));
  }, [onNotice]);

  async function openSeries(slug: string, name: string) {
    const body = await api<{ series: { products: Product[] } }>(`/api/v1/series/${slug}`);
    setProducts(body.series.products);
    setSeriesName(name);
  }

  async function save(product: Product, type: "quote" | "wishlist") {
    if (!signedIn) {
      onNotice("Sign in from the Account tab before building a quote.");
      return;
    }
    const body = await api<{ quote: { id: number } }>("/api/v1/quotes", { method: "POST", body: JSON.stringify({ name: product.name, type, product_id: product.id, quantity: 1 }) });
    onNotice(`${type === "quote" ? "Quote" : "Wishlist"} #${body.quote.id} created. Open it under Quotes.`);
  }

  if (seriesName) {
    return (
      <ScrollView>
        <Pressable onPress={() => setSeriesName(null)}><Text style={styles.link}>All series</Text></Pressable>
        <Text style={styles.heading}>{seriesName}</Text>
        {products.map((product) => (
          <View key={product.id} style={styles.card}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.meta}>{product.pitch ? `${product.pitch} · ` : ""}Sample {money(product.list_price)}</Text>
            <View style={styles.row}>
              <Pressable style={styles.button} onPress={() => save(product, "quote")}><Text style={styles.buttonText}>Add to quote</Text></Pressable>
              <Pressable style={styles.ghost} onPress={() => save(product, "wishlist")}><Text>Wishlist</Text></Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  const ordered = [...categories].sort((a, b) => categoryOrder.indexOf(a.slug) - categoryOrder.indexOf(b.slug));

  return (
    <ScrollView>
      {ordered.map((category) => (
        <View key={category.slug}>
          <Text style={styles.kicker}>{category.slug === "led" ? "LED walls" : category.name}</Text>
          <View style={styles.grid}>
            {sortSeries(category.slug, category.series).map((series) => {
              const source = media(series.image);
              return (
                <Pressable key={series.slug} style={styles.tile} onPress={() => openSeries(series.slug, series.name)}>
                  {source ? <Image source={{ uri: source }} style={styles.tileImage} /> : null}
                  <View style={styles.tileCopy}>
                    <Text style={styles.tileName} numberOfLines={2}>{series.name}</Text>
                    <Text style={styles.tileMeta} numberOfLines={2}>{series.summary ?? `${series.product_count} products`}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {category.slug === "led" ? <WallPlan /> : null}
        </View>
      ))}
    </ScrollView>
  );
}

function PersonPick({ label, people, value, onChange }: { label: string; people: Person[]; value: number | ""; onChange: (id: number | "") => void }) {
  if (people.length === 0) return null;
  return (
    <View>
      <Text style={styles.meta}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Pressable onPress={() => onChange("")} style={styles.ghost}><Text>{value === "" ? "None" : "Clear"}</Text></Pressable>
        {people.map((person) => (
          <Pressable key={person.id} onPress={() => onChange(person.id)} style={styles.ghost}>
            <Text style={value === person.id ? styles.name : undefined}>{person.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Quotes({ signedIn, onNotice }: { signedIn: boolean; onNotice: (value: string | null) => void }) {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [methods, setMethods] = useState<{ id: number; last4: string; type: string }[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CatalogHit[]>([]);
  const [packageName, setPackageName] = useState("");
  const [packageLines, setPackageLines] = useState<{ product_id: number; name: string }[]>([]);
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [assignee, setAssignee] = useState<number | "">("");
  const [salesId, setSalesId] = useState<number | "">("");
  const [dealerId, setDealerId] = useState<number | "">("");

  async function load() {
    const body = await api<{ quotes: QuoteRow[] }>("/api/v1/quotes");
    setRows(body.quotes);
  }

  useEffect(() => {
    if (!signedIn) return;
    load().catch((error: Error) => onNotice(error.message));
    api<{ payment_methods: { id: number; last4: string; type: string }[] }>("/api/v1/account").then((body) => setMethods(body.payment_methods)).catch(() => undefined);
  }, [signedIn, onNotice]);

  useEffect(() => {
    const term = query.trim();
    if (!quote?.permissions.edit || term.length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      api<{ products: CatalogHit[] }>(`/api/v1/catalog/search?q=${encodeURIComponent(term)}`)
        .then((body) => setHits(body.products.slice(0, 8)))
        .catch(() => setHits([]));
    }, 160);
    return () => clearTimeout(handle);
  }, [query, quote?.permissions.edit]);

  async function open(id: number) {
    const body = await api<{ quote: Quote }>(`/api/v1/quotes/${id}`);
    setQuote(body.quote);
    setQuery("");
    setHits([]);
    setPackageLines([]);
    setPeople([]);
  }

  async function run(path: string, payload?: object, method = "POST") {
    const body = await api<{ quote: Quote }>(path, { method, body: payload ? JSON.stringify(payload) : undefined });
    setQuote(body.quote);
    load().catch(() => undefined);
  }

  if (!signedIn) return <Text style={styles.meta}>Sign in to see quotes, wishlists, and checkout.</Text>;
  if (!quote) {
    return (
      <ScrollView>
        <Pressable style={styles.button} onPress={async () => {
          const body = await api<{ quote: Quote }>("/api/v1/quotes", { method: "POST", body: JSON.stringify({ name: "New quote", type: "quote" }) });
          setQuote(body.quote);
        }}><Text style={styles.buttonText}>New quote</Text></Pressable>
        {rows.map((row) => (
          <Pressable key={row.id} style={styles.card} onPress={() => open(row.id)}>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.meta}>{row.type} · {row.status} ({row.status_code}) · {money(row.total)} · {row.checkout_allowed ? "checkout open" : "checkout closed"}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  const parents = quote.items.filter((item) => item.parent_id === null);
  return (
    <ScrollView>
      <Pressable onPress={() => setQuote(null)}><Text style={styles.link}>All quotes</Text></Pressable>
      <Text style={styles.heading}>{quote.name}</Text>
      <Text style={styles.meta}>Status {quote.status_code} · {quote.status} · tax {money(quote.tax)} · total {money(quote.total)}</Text>
      {quote.permissions.edit ? (
        <View style={styles.card}>
          <Text style={styles.kicker}>HEADER</Text>
          <TextInput style={styles.input} defaultValue={quote.name} placeholder="Name" onEndEditing={(event) => run(`/api/v1/quotes/${quote.id}`, { name: event.nativeEvent.text }, "PATCH")} />
          <TextInput style={styles.input} defaultValue={String(quote.shipping ?? "")} placeholder="Shipping" keyboardType="decimal-pad" onEndEditing={(event) => run(`/api/v1/quotes/${quote.id}`, { shipping: event.nativeEvent.text }, "PATCH")} />
          <TextInput style={styles.input} defaultValue={String(quote.discount ?? "")} placeholder="Discount" keyboardType="decimal-pad" onEndEditing={(event) => run(`/api/v1/quotes/${quote.id}`, { discount: event.nativeEvent.text }, "PATCH")} />
          <TextInput style={styles.input} value={expenseLabel} onChangeText={setExpenseLabel} placeholder="Expense label" />
          <TextInput style={styles.input} value={expenseAmount} onChangeText={setExpenseAmount} placeholder="Expense amount" keyboardType="decimal-pad" />
          <Pressable style={styles.ghost} onPress={() => {
            if (!expenseLabel.trim() || expenseAmount.trim() === "") return;
            run(`/api/v1/quotes/${quote.id}/expenses`, { label: expenseLabel, amount: Number(expenseAmount), quantity: 1 }).then(() => { setExpenseLabel(""); setExpenseAmount(""); }).catch((error: Error) => onNotice(error.message));
          }}><Text>Add expense</Text></Pressable>
          <Text style={styles.kicker}>CATALOG</Text>
          <TextInput style={styles.input} value={query} onChangeText={setQuery} placeholder="Search the catalog" />
          {hits.map((hit) => (
            <View key={hit.id} style={styles.row}>
              <Text style={styles.meta}>{hit.name} · {money(hit.list_price)}</Text>
              <Pressable onPress={() => run(`/api/v1/quotes/${quote.id}/items`, { product_id: hit.id, quantity: 1 }).catch((error: Error) => onNotice(error.message))}><Text style={styles.link}>Add</Text></Pressable>
              <Pressable onPress={() => setPackageLines((lines) => lines.some((line) => line.product_id === hit.id) ? lines : [...lines, { product_id: hit.id, name: hit.name }])}><Text style={styles.link}>Package</Text></Pressable>
            </View>
          ))}
          {packageLines.length ? <Text style={styles.meta}>{packageLines.map((line) => line.name).join(", ")}</Text> : null}
          <TextInput style={styles.input} value={packageName} onChangeText={setPackageName} placeholder="Package name" />
          <Pressable style={styles.button} onPress={() => {
            if (!packageName.trim() || packageLines.length === 0) return;
            run(`/api/v1/quotes/${quote.id}/packages`, { name: packageName, lines: packageLines.map((line) => ({ product_id: line.product_id, quantity: 1 })) })
              .then(() => { setPackageName(""); setPackageLines([]); })
              .catch((error: Error) => onNotice(error.message));
          }}><Text style={styles.buttonText}>Save package</Text></Pressable>
        </View>
      ) : null}
      {parents.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.name}>{item.label}</Text>
          <Text style={styles.meta}>{item.kind} · qty {item.quantity} · {money(item.line_total)}</Text>
          {quote.permissions.edit && item.kind !== "package" ? (
            <View style={styles.row}>
              <Pressable onPress={() => run(`/api/v1/quotes/${quote.id}/items/${item.id}`, { quantity: item.quantity + 1 }, "PATCH")}><Text style={styles.link}>Increase quantity</Text></Pressable>
              <Pressable onPress={() => run(`/api/v1/quotes/${quote.id}/items/${item.id}`, undefined, "DELETE")}><Text style={styles.link}>Remove</Text></Pressable>
            </View>
          ) : null}
        </View>
      ))}
      <View style={styles.row}>
        {quote.permissions.submit ? <Pressable style={styles.button} onPress={() => run(`/api/v1/quotes/${quote.id}/submit`)}><Text style={styles.buttonText}>Submit</Text></Pressable> : null}
        {quote.permissions.review ? <Pressable style={styles.button} onPress={() => run(`/api/v1/quotes/${quote.id}/review`, { decision: "approved" })}><Text style={styles.buttonText}>Approve</Text></Pressable> : null}
        {quote.permissions.review ? <Pressable style={styles.ghost} onPress={() => run(`/api/v1/quotes/${quote.id}/review`, { decision: "rejected" })}><Text>Reject</Text></Pressable> : null}
        {quote.permissions.revise ? <Pressable style={styles.button} onPress={() => run(`/api/v1/quotes/${quote.id}/revise`)}><Text style={styles.buttonText}>Revise</Text></Pressable> : null}
        {quote.permissions.expire ? <Pressable style={styles.ghost} onPress={() => run(`/api/v1/quotes/${quote.id}/expire`)}><Text>Expire</Text></Pressable> : null}
        {quote.permissions.delete ? <Pressable style={styles.ghost} onPress={async () => { await api(`/api/v1/quotes/${quote.id}`, { method: "DELETE" }); setQuote(null); load(); }}><Text>Delete</Text></Pressable> : null}
        {quote.permissions.refund && quote.payments[0] ? <Pressable style={styles.ghost} onPress={() => run(`/api/v1/payments/${quote.payments[0].id}/refund`, { amount: 1, reason: "Recorded from the phone" })}><Text>Refund $1</Text></Pressable> : null}
        {quote.permissions.pdf ? <Pressable style={styles.ghost} onPress={() => openPdf(quote.id).then(() => onNotice("Choose where to open the PDF.")).catch((error: Error) => onNotice(error.message))}><Text>PDF</Text></Pressable> : null}
        {quote.permissions.checkout_toggle ? <Pressable style={styles.ghost} onPress={() => run(`/api/v1/quotes/${quote.id}/checkout`, { allowed: !quote.checkout_allowed })}><Text>{quote.checkout_allowed ? "Close checkout" : "Allow checkout"}</Text></Pressable> : null}
        {quote.permissions.convert ? <Pressable style={styles.button} onPress={() => run(`/api/v1/quotes/${quote.id}/convert`)}><Text style={styles.buttonText}>Convert</Text></Pressable> : null}
        {quote.permissions.purchased ? <Pressable style={styles.button} onPress={() => run(`/api/v1/quotes/${quote.id}/purchased`)}><Text style={styles.buttonText}>Purchased</Text></Pressable> : null}
      </View>
      {quote.permissions.assign ? (
        <View style={styles.card}>
          <Text style={styles.kicker}>ASSIGN</Text>
          {people.length === 0 ? <Pressable onPress={() => api<{ users: Person[] }>("/api/v1/people").then((body) => setPeople(body.users)).catch((error: Error) => onNotice(error.message))}><Text style={styles.link}>Load accounts</Text></Pressable> : null}
          <PersonPick label="Client or dealer" people={people.filter((person) => person.role === "client" || person.role === "dealer")} value={assignee} onChange={setAssignee} />
          <PersonPick label="Sales" people={people.filter((person) => person.role === "sales")} value={salesId} onChange={setSalesId} />
          <PersonPick label="Dealer" people={people.filter((person) => person.role === "dealer")} value={dealerId} onChange={setDealerId} />
          <Pressable style={styles.button} onPress={() => run(`/api/v1/quotes/${quote.id}/assign`, {
            assigned_user_id: assignee === "" ? null : assignee,
            sales_user_id: salesId === "" ? null : salesId,
            dealer_user_id: dealerId === "" ? null : dealerId,
          }).then(() => onNotice("Assignment saved.")).catch((error: Error) => onNotice(error.message))}><Text style={styles.buttonText}>Save assignment</Text></Pressable>
        </View>
      ) : null}
      {quote.permissions.pay && methods[0] ? (
        <Pressable style={styles.button} onPress={() => run(`/api/v1/quotes/${quote.id}/pay`, { payment_method_id: methods[0].id })}>
          <Text style={styles.buttonText}>Pay with {methods[0].type} {methods[0].last4}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Account({ user, setUser, onNotice, onRequestSignIn }: { user: User | null; setUser: (user: User | null) => void; onNotice: (value: string | null) => void; onRequestSignIn: () => void }) {
  const [last4, setLast4] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postal, setPostal] = useState("");
  const [addresses, setAddresses] = useState<{ id: number; line1: string; city: string }[]>([]);
  const [methods, setMethods] = useState<{ id: number; type: string; last4: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: number; title: string; completed_at: string | null }[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const staff = user?.role === "admin" || user?.role === "sales";

  useEffect(() => {
    if (!user) return;
    api<{ user: User & { phone?: string | null; company_name?: string | null; avatar_url?: string | null }; addresses: { id: number; line1: string; city: string }[]; payment_methods: { id: number; type: string; last4: string }[] }>("/api/v1/account")
      .then((body) => {
        setName(body.user.name);
        setPhone(body.user.phone ?? "");
        setCompany(body.user.company_name ?? "");
        setAvatar(body.user.avatar_url ?? null);
        setAddresses(body.addresses);
        setMethods(body.payment_methods);
      })
      .catch((error: Error) => onNotice(error.message));
    if (staff) {
      api<{ tasks: { id: number; title: string; completed_at: string | null }[] }>("/api/v1/tasks").then((body) => setTasks(body.tasks)).catch(() => setTasks([]));
    }
  }, [user, staff, onNotice]);

  if (!user) {
    return (
      <View>
        <Text style={styles.meta}>Sign in to save quotes, payments, and service.</Text>
        <Pressable style={styles.button} onPress={onRequestSignIn} accessibilityRole="button"><Text style={styles.buttonText}>Sign in</Text></Pressable>
      </View>
    );
  }

  return (
    <ScrollView>
      <Text style={styles.heading}>{user.name}</Text>
      <Text style={styles.meta}>{user.email} · {user.role}</Text>
      {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : null}
      <Pressable style={styles.ghost} onPress={async () => {
        const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
        if (picked.canceled || !picked.assets[0]) return;
        const asset = picked.assets[0];
        const saved = await api<{ user: { avatar_url?: string | null } }>("/api/v1/account/avatar", {
          method: "POST",
          body: formBody({}, { uri: asset.uri, name: asset.fileName ?? "avatar.jpg", type: asset.mimeType ?? "image/jpeg" }),
        });
        setAvatar(saved.user.avatar_url ?? null);
        onNotice("Photo saved.");
      }}><Text>Choose profile photo</Text></Pressable>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" />
      <TextInput style={styles.input} value={company} onChangeText={setCompany} placeholder="Company" />
      <Pressable style={styles.button} onPress={async () => {
        const body = await api<{ user: User }>("/api/v1/account", { method: "PATCH", body: JSON.stringify({ name, phone, company_name: company }) });
        setUser({ ...user, name: body.user.name });
        onNotice("Profile saved.");
      }}><Text style={styles.buttonText}>Save profile</Text></Pressable>
      <Text style={styles.kicker}>PASSWORD</Text>
      <TextInput style={styles.input} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" />
      <TextInput style={styles.input} secureTextEntry value={nextPassword} onChangeText={setNextPassword} placeholder="New password" />
      <Pressable style={styles.ghost} onPress={async () => {
        await api("/api/v1/account", { method: "PATCH", body: JSON.stringify({ current_password: currentPassword, password: nextPassword }) });
        setCurrentPassword("");
        setNextPassword("");
        onNotice("Password updated.");
      }}><Text>Update password</Text></Pressable>
      <Text style={styles.kicker}>ADDRESS</Text>
      {addresses.map((address) => (
        <Pressable key={address.id} onPress={async () => {
          await api(`/api/v1/account/addresses/${address.id}`, { method: "DELETE" });
          setAddresses((rows) => rows.filter((row) => row.id !== address.id));
        }}><Text style={styles.meta}>{address.line1}, {address.city} · remove</Text></Pressable>
      ))}
      <TextInput style={styles.input} value={line1} onChangeText={setLine1} placeholder="Street" />
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" />
      <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="State" />
      <TextInput style={styles.input} value={postal} onChangeText={setPostal} placeholder="Postal code" />
      <Pressable style={styles.ghost} onPress={async () => {
        const body = await api<{ address: { id: number; line1: string; city: string } }>("/api/v1/account/addresses", { method: "POST", body: JSON.stringify({ line1, city, region, postal_code: postal, country: "US" }) });
        setAddresses((rows) => [body.address, ...rows]);
        setLine1(""); setCity(""); setRegion(""); setPostal("");
        onNotice("Address saved.");
      }}><Text>Save address</Text></Pressable>
      <Text style={styles.kicker}>PAYMENT</Text>
      {methods.map((method) => (
        <Pressable key={method.id} onPress={async () => {
          await api(`/api/v1/account/payment-methods/${method.id}`, { method: "DELETE" });
          setMethods((rows) => rows.filter((row) => row.id !== method.id));
        }}><Text style={styles.meta}>{method.type} {method.last4} · remove</Text></Pressable>
      ))}
      <TextInput style={styles.input} value={last4} onChangeText={setLast4} placeholder="Card last 4" keyboardType="number-pad" maxLength={4} />
      <Pressable style={styles.button} onPress={async () => {
        const body = await api<{ payment_method: { id: number; type: string; last4: string } }>("/api/v1/account/payment-methods", { method: "POST", body: JSON.stringify({ type: "card", brand: "Visa", last4, exp_month: 12, exp_year: 2028, holder_name: name || user.name }) });
        setMethods((rows) => [body.payment_method, ...rows]);
        setLast4("");
        onNotice("Card saved. Full numbers are not stored.");
      }}><Text style={styles.buttonText}>Save card</Text></Pressable>
      <Pressable style={styles.ghost} onPress={() => api("/api/v1/account/tax-exemption", { method: "POST", body: JSON.stringify({ note: "Requested from the phone app." }) }).then(() => onNotice("Tax exemption requested."))}><Text>Request tax exemption</Text></Pressable>
      {staff ? (
        <>
          <Text style={styles.kicker}>TASKS</Text>
          <TextInput style={styles.input} value={taskTitle} onChangeText={setTaskTitle} placeholder="Task" />
          <Pressable style={styles.ghost} onPress={async () => {
            const body = await api<{ task: { id: number; title: string; completed_at: string | null } }>("/api/v1/tasks", { method: "POST", body: JSON.stringify({ title: taskTitle }) });
            setTasks((rows) => [body.task, ...rows]);
            setTaskTitle("");
          }}><Text>Add task</Text></Pressable>
          {tasks.map((task) => (
            <Pressable key={task.id} onPress={async () => {
              await api(`/api/v1/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed: !task.completed_at }) });
              setTasks((rows) => rows.map((row) => row.id === task.id ? { ...row, completed_at: row.completed_at ? null : new Date().toISOString() } : row));
            }}><Text style={styles.meta}>{task.completed_at ? "Done · " : ""}{task.title}</Text></Pressable>
          ))}
        </>
      ) : null}
      <Pressable style={styles.tab} accessibilityRole="button" accessibilityLabel="Sign out" onPress={async () => {
        await api("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
        setToken("");
        await clearSession();
        setUser(null);
      }}><Text style={styles.link}>Sign out</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas, paddingHorizontal: space.lg },
  login: { flex: 1, backgroundColor: color.night, paddingHorizontal: space.xl },
  brand: { color: color.copper, letterSpacing: 3, fontSize: 12, fontWeight: "700" },
  brandLight: { color: "#e8b48a", letterSpacing: 3, fontSize: 12, fontWeight: "700" },
  word: { color: color.ink, fontSize: 34, fontWeight: "600", marginBottom: space.sm },
  loginTitle: { color: color.cream, fontSize: 40, fontWeight: "600", marginTop: space.md },
  loginCopy: { color: "#a7aeb8", fontSize: 16, marginTop: space.sm, marginBottom: space.md },
  heading: { color: color.ink, fontSize: 28, fontWeight: "600", marginVertical: space.sm },
  body: { flex: 1 },
  card: { backgroundColor: color.paper, borderColor: color.line, borderWidth: 1, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "48%", aspectRatio: 1, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#2a313b", marginBottom: 10, justifyContent: "flex-end" },
  tileImage: { position: "absolute", top: 8, right: 8, bottom: 48, left: 8, resizeMode: "contain" },
  tileCopy: { padding: 10, backgroundColor: "rgba(8,9,12,0.78)" },
  tileName: { color: color.cream, fontSize: 16, fontWeight: "700" },
  tileMeta: { color: "#c5c8ce", fontSize: 12, marginTop: 2 },
  plan: { marginBottom: space.sm },
  planRow: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  planStat: { flex: 1, backgroundColor: color.paper, borderRadius: radius.md, padding: space.sm },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.sm },
  name: { color: color.ink, fontSize: 18, fontWeight: "600" },
  meta: { color: color.mist, marginTop: space.xs },
  kicker: { marginTop: space.md, marginBottom: space.sm, color: color.copper, fontWeight: "700", letterSpacing: 1 },
  avatar: { width: 72, height: 72, borderRadius: 36, marginTop: space.sm, backgroundColor: color.foam },
  notice: { backgroundColor: color.paper, color: color.ink, padding: space.md, borderRadius: radius.md, marginBottom: space.sm },
  noticeDark: { backgroundColor: "#1a120c", color: color.cream, padding: space.md, borderRadius: radius.md, marginBottom: space.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  button: { backgroundColor: color.ink, borderRadius: radius.pill, minHeight: hit, paddingHorizontal: space.lg, justifyContent: "center", marginTop: space.sm, alignSelf: "flex-start" },
  buttonText: { color: color.cream, fontWeight: "700" },
  ghost: { borderColor: "#14161c33", borderWidth: 1, borderRadius: radius.pill, minHeight: hit, paddingHorizontal: space.lg, justifyContent: "center", marginTop: space.sm, alignSelf: "flex-start" },
  ghostLight: { borderColor: "rgba(247,244,238,0.35)", borderWidth: 1, borderRadius: radius.pill, minHeight: hit, paddingHorizontal: space.lg, justifyContent: "center", marginTop: space.sm, alignSelf: "flex-start" },
  ghostLightText: { color: color.cream, fontWeight: "700" },
  link: { color: color.copper, fontWeight: "700", marginVertical: space.sm },
  input: { backgroundColor: color.paper, borderColor: color.line, borderWidth: 1, borderRadius: radius.md, minHeight: hit, paddingHorizontal: space.md, marginTop: space.sm, color: color.ink },
  tabs: {
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.canvas,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: hit, paddingHorizontal: space.xs },
  tabOn: { color: color.ink, fontWeight: "700", fontSize: 12 },
  tabOff: { color: color.mist, fontSize: 12 },
});
