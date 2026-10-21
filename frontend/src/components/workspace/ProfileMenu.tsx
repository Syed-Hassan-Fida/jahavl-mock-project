"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { initials, sessionUser, signOut, type SessionUser } from "@/lib/client";

const items = [
  { href: "/account/profile", label: "Profile settings" },
  { href: "/account/preferences", label: "Account preferences" },
];

export function ProfileMenu({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  const menuId = useId();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setUser(sessionUser());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    rootRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link href="/login" className={tone === "dark" ? "text-sm text-haze hover:text-cream" : "text-sm font-semibold text-ink"}>
        Sign in
      </Link>
    );
  }

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  async function logout() {
    setBusy(true);
    await signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  function onMenuKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role='menuitem']"));
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      nodes[(index + 1) % nodes.length]?.focus();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      nodes[(index - 1 + nodes.length) % nodes.length]?.focus();
    }
    if (event.key === "Home") {
      event.preventDefault();
      nodes[0]?.focus();
    }
    if (event.key === "End") {
      event.preventDefault();
      nodes[nodes.length - 1]?.focus();
    }
  }

  const light = tone === "light";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={`flex min-h-11 items-center gap-2 rounded-full py-1 pr-3 pl-1 transition ${light ? "hover:bg-foam" : "hover:bg-white/10"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-semibold text-cream" aria-hidden>
          {initials(user.name)}
        </span>
        <span className={`hidden text-left leading-tight sm:block ${light ? "text-ink" : "text-cream"}`}>
          <span className="block text-sm font-semibold">{user.name}</span>
          <span className={`block text-[11px] capitalize ${light ? "text-mist" : "text-haze"}`}>{user.role}</span>
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKey}
          className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-line bg-paper p-2 text-ink shadow-[0_16px_40px_rgb(20_23_28/0.12)]"
        >
          <div className="border-b border-line px-3 py-3">
            <p className="font-semibold">{user.name}</p>
            <p className="mt-0.5 truncate text-sm text-mist">{user.email}</p>
            <p className="mt-1 text-xs capitalize text-mist">{user.role}{user.company_name ? ` · ${user.company_name}` : ""}</p>
          </div>
          <div className="py-1">
            <button type="button" role="menuitem" className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-foam" onClick={() => go(user.role === "admin" || user.role === "sales" ? "/admin" : "/account")}>
              Workspace
            </button>
            {items.map((item) => (
              <button key={item.href} type="button" role="menuitem" className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-foam" onClick={() => go(item.href)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="border-t border-line pt-1">
            <button type="button" role="menuitem" disabled={busy} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-copper hover:bg-foam disabled:opacity-60" onClick={logout}>
              {busy ? "Signing out…" : "Log out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
