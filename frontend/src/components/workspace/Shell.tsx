"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import { ProfileMenu } from "@/components/workspace/ProfileMenu";
import { api, sessionUser, type SessionUser } from "@/lib/client";
import { startLive, type LiveEvent } from "@/lib/live";

type Item = { href: string; label: string; roles?: string[] };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/account", label: "Dashboard", roles: ["client", "dealer"] }, { href: "/admin", label: "Dashboard", roles: ["admin", "sales"] }],
  },
  {
    label: "Commercial",
    items: [
      { href: "/account/quotes", label: "Quotes" },
      { href: "/account/quotes?type=wishlist", label: "Wishlists" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/people", label: "People", roles: ["admin", "sales", "dealer"] },
      { href: "/admin/approvals", label: "Approvals", roles: ["admin"] },
      { href: "/admin/catalog", label: "Pricing", roles: ["admin"] },
      { href: "/account/tasks", label: "Tasks", roles: ["admin", "sales"] },
      { href: "/account/notes", label: "Notes", roles: ["admin", "sales"] },
    ],
  },
  {
    label: "Service",
    items: [
      { href: "/account/tickets", label: "Tickets" },
      { href: "/account/messages", label: "Messages" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/account/alerts", label: "Alerts" },
      { href: "/account/profile", label: "Profile" },
      { href: "/account/preferences", label: "Preferences" },
      { href: "/account/payments", label: "Payments" },
    ],
  },
];

function iconFor(href: string): IconName {
  if (href.includes("wishlist")) return "note";
  const map: Record<string, IconName> = {
    "/account": "grid",
    "/admin": "grid",
    "/account/quotes": "file",
    "/admin/people": "people",
    "/admin/approvals": "check",
    "/admin/catalog": "tag",
    "/account/tasks": "task",
    "/account/notes": "note",
    "/account/tickets": "ticket",
    "/account/messages": "message",
    "/account/alerts": "bell",
    "/account/profile": "user",
    "/account/preferences": "sliders",
    "/account/payments": "card",
  };
  return map[href] ?? "grid";
}

type Note = { id: number; title: string; body: string; read_at: string | null };

export function WorkspaceShell({ title, description, children }: { title?: string; description?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; tone: string }[]>([]);

  useEffect(() => setUser(sessionUser()), [pathname]);
  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<{ message: string; tone?: string }>).detail;
      const id = Date.now() + Math.random();
      setToasts((rows) => [...rows, { id, message: detail.message, tone: detail.tone ?? "info" }]);
      window.setTimeout(() => setToasts((rows) => rows.filter((row) => row.id !== id)), 4200);
    }
    window.addEventListener("jah-toast", onToast);
    return () => window.removeEventListener("jah-toast", onToast);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 47.99rem)");
    const apply = () => setMobile(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const home = user?.role === "admin" || user?.role === "sales" ? "/admin" : "/account";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <style>{`#workspace-nav{transition:transform 200ms ease}@media (max-width:47.99rem){#workspace-nav[data-open="false"]{transform:translateX(-100%)}}@media (prefers-reduced-motion:reduce){#workspace-nav{transition:none}}`}</style>
      <div className="md:grid md:grid-cols-[272px_minmax(0,1fr)]">
        <Suspense fallback={<div className="hidden bg-night md:block" />}>
          <Sidebar user={user} home={home} open={open} inert={mobile && !open} onClose={() => setOpen(false)} />
        </Suspense>
        {open ? <button type="button" className="fixed inset-0 z-50 bg-ink/50 md:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-3 backdrop-blur-xl md:px-6">
            <button type="button" className="grid h-11 w-11 place-items-center rounded-full border border-line md:hidden" aria-expanded={open} aria-controls="workspace-nav" onClick={() => setOpen(true)}>
              <span className="sr-only">Open navigation</span>
              <Icon name="menu" />
            </button>
            <Link href="/" className="hidden text-sm font-medium text-mist hover:text-ink lg:inline">
              Catalog
            </Link>
            <Suspense fallback={null}>
              <WorkspaceSearch />
            </Suspense>
            <div className="ml-auto flex items-center gap-2">
              <Notifications />
              <ProfileMenu />
            </div>
          </header>
          <main id="main" className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-10">
            {title ? (
              <header className="mb-8 max-w-3xl">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-copper">WORKSPACE</p>
                <h1 className="mt-2 text-4xl text-ink sm:text-5xl">{title}</h1>
                {description ? <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist">{description}</p> : null}
              </header>
            ) : null}
            {children}
          </main>
        </div>
      </div>
      <BottomNav home={home} onMore={() => setOpen(true)} moreOpen={open} />
      <div className="pointer-events-none fixed right-4 bottom-24 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-6" aria-live="polite">
        {toasts.map((item) => (
          <p key={item.id} role={item.tone === "error" ? "alert" : "status"} className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-none ${item.tone === "error" ? "border-[#e7c4b0] bg-[#fbf3ee] text-[#8c3f0e]" : item.tone === "success" ? "border-[#c9e0d0] bg-[#f3faf5] text-[#176b38]" : "border-line bg-white text-ink"}`}>
            {item.message}
            <button type="button" className="ml-3 font-semibold" onClick={() => setToasts((rows) => rows.filter((row) => row.id !== item.id))}>Dismiss</button>
          </p>
        ))}
      </div>
    </div>
  );
}

function BottomNav({ home, onMore, moreOpen }: { home: string; onMore: () => void; moreOpen: boolean }) {
  const pathname = usePathname();
  const tabs: { href: string; label: string; icon: IconName }[] = [
    { href: home, label: "Home", icon: "grid" },
    { href: "/account/quotes", label: "Quotes", icon: "file" },
    { href: "/account/tickets", label: "Tickets", icon: "ticket" },
    { href: "/account/messages", label: "Inbox", icon: "message" },
  ];

  function on(href: string) {
    if (href === "/account" || href === "/admin") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="workspace-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-xl md:hidden" aria-label="Workspace">
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = on(tab.href);
          return (
            <li key={tab.href}>
              <Link href={tab.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wide ${active ? "text-ink" : "text-mist"}`}>
                <Icon name={tab.icon} className={`h-5 w-5 ${active ? "text-copper" : "text-mist"}`} />
                {tab.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" className="flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wide text-mist" aria-expanded={moreOpen} aria-controls="workspace-nav" onClick={onMore}>
            <Icon name="menu" className="h-5 w-5" />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

function Sidebar({ user, home, open, inert, onClose }: { user: SessionUser | null; home: string; open: boolean; inert: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const wishlist = params.get("type") === "wishlist";

  function active(href: string) {
    const [path, query] = href.split("?");
    if (query?.includes("wishlist")) return pathname === path && wishlist;
    if (path === "/account/quotes") return pathname === path && !wishlist;
    if (path === "/account") return pathname === "/account";
    if (path === "/admin") return pathname === "/admin";
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <aside id="workspace-nav" data-open={open ? "true" : "false"} inert={inert} style={open ? { transform: "none" } : undefined} className="fixed inset-y-0 left-0 z-[60] w-[min(86vw,272px)] border-r border-white/10 bg-night text-cream md:sticky md:top-0 md:z-0 md:h-screen md:w-[272px]">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between pr-2">
          <Link href={home} className="flex items-center gap-3 px-5 py-5">
            <img src="/brand/logo-white.png" alt="JAH Audio" className="h-7 w-auto" />
            <span className="text-[11px] font-semibold tracking-[0.18em]">JAH AUDIO</span>
          </Link>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-cream hover:bg-white/10 md:hidden" onClick={onClose} aria-label="Close navigation">
            <Icon name="x" />
          </button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6" aria-label="Workspace sections">
          {groups.map((group) => {
            const items = group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role)));
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="px-3 text-[10px] font-semibold tracking-[0.18em] text-haze">{group.label.toUpperCase()}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {items.map((item) => {
                    const on = active(item.href);
                    return (
                      <li key={item.href}>
                        <Link href={item.href} aria-current={on ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${on ? "bg-white/10 text-cream shadow-[inset_2px_0_0_#e8b48a]" : "text-haze hover:bg-white/5 hover:text-cream"}`}>
                          <Icon name={iconFor(item.href)} className={`h-4 w-4 ${on ? "text-ember" : ""}`} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
        {user ? (
          <div className="border-t border-white/10 px-5 py-4">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="mt-0.5 truncate text-xs capitalize text-haze">{user.role}{user.company_name ? ` · ${user.company_name}` : ""}</p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

type SearchHit = { kind: string; label: string; href: string; meta?: string };

function WorkspaceSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const listId = "workspace-search-results";

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      setOpen(false);
      setPending(false);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(() => {
      setPending(true);
      api<{ results: SearchHit[] }>(`/api/v1/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((body) => {
          setHits(body.results);
          setOpen(true);
        })
        .catch(() => {
          if (!controller.signal.aborted) setHits([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setPending(false);
        });
    }, 140);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(event: FormEvent) {
    event.preventDefault();
    if (hits[0]) {
      setOpen(false);
      router.push(hits[0].href);
    }
  }

  return (
    <form ref={rootRef} onSubmit={go} className="relative min-w-0 flex-1">
      <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-canvas px-3 transition-colors focus-within:border-ink focus-within:bg-white" htmlFor="workspace-search">
        <span className="sr-only">Search quotes and products</span>
        <Icon name="search" className="h-4 w-4 text-mist" />
        <input
          id="workspace-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          placeholder="Search quotes and products"
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-mist"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
        />
      </label>
      {open ? (
        <ul id={listId} className="panel absolute top-12 z-30 max-h-80 w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto p-1">
          {pending && hits.length === 0 ? <li className="px-3 py-3 text-sm text-mist">Searching…</li> : null}
          {!pending && hits.length === 0 ? <li className="px-3 py-3 text-sm text-mist">No quotes or products match.</li> : null}
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.href}`}>
              <Link href={hit.href} className="flex min-h-11 items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-foam" onClick={() => setOpen(false)}>
                <span className="truncate font-medium">{hit.label}</span>
                <span className="shrink-0 text-[11px] capitalize text-mist">{hit.kind}{hit.meta ? ` · ${hit.meta}` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}

function Notifications() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = notes.filter((note) => !note.read_at).length;

  useEffect(() => {
    if (!sessionUser()) return;
    api<{ notifications: Note[] }>("/api/v1/notifications").then((body) => setNotes(body.notifications)).catch(() => setNotes([]));
    return startLive();
  }, []);

  useEffect(() => {
    function onLive(event: Event) {
      const detail = (event as CustomEvent<LiveEvent>).detail;
      if (detail.name !== "notification" || !detail.payload.notification) return;
      const note = detail.payload.notification;
      setNotes((rows) => (rows.some((row) => row.id === note.id) ? rows : [note, ...rows]));
    }
    window.addEventListener("jah-live", onLive);
    return () => window.removeEventListener("jah-live", onLive);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function mark(id: number) {
    api(`/api/v1/notifications/${id}/read`, { method: "POST" }).then(() => {
      setNotes((rows) => rows.map((row) => (row.id === id ? { ...row, read_at: new Date().toISOString() } : row)));
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button type="button" className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-white hover:bg-foam" aria-expanded={open} aria-controls="workspace-alerts" aria-label={unread ? `Alerts, ${unread} unread` : "Alerts"} onClick={() => setOpen((value) => !value)}>
        <Icon name="bell" />
        {unread ? <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-copper" /> : null}
      </button>
      {open ? (
        <div id="workspace-alerts" className="panel absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-1.5rem))] p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-mist">ALERTS</p>
            <Link href="/account/alerts" className="text-xs font-semibold text-copper" onClick={() => setOpen(false)}>View all</Link>
          </div>
          {notes.length === 0 ? <p className="px-2 py-4 text-sm text-mist">No alerts yet.</p> : null}
          <ul className="max-h-80 overflow-y-auto">
            {notes.slice(0, 8).map((note) => (
              <li key={note.id}>
                <button type="button" className="block min-h-11 w-full rounded-xl px-2 py-2 text-left hover:bg-foam" onClick={() => mark(note.id)}>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {!note.read_at ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-copper" /> : null}
                    {note.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-mist">{note.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
