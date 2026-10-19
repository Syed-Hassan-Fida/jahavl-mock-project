"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfileMenu } from "@/components/workspace/ProfileMenu";
import { company } from "@/lib/copy";

const links = [
  { href: "/led", label: "LED walls" },
  { href: "/catalog/lighting", label: "Lighting" },
  { href: "/catalog/audio", label: "Audio" },
  { href: "/resources", label: "Resources" },
  { href: "/dealers", label: "Dealers" },
];

function Mark() {
  return (
    <span className="flex items-center gap-3">
      <img src="/brand/logo-white.png" alt="JAH Audio" className="h-8 w-auto" />
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-[0.16em] text-cream">JAH AUDIO</span>
        <span className="mt-1 block text-[10px] tracking-[0.22em] text-haze">LED · LIGHT · SOUND</span>
      </span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [workspace, setWorkspace] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("jah_user");
    if (!raw) {
      setWorkspace(null);
      return;
    }
    try {
      const user = JSON.parse(raw) as { role?: string };
      setWorkspace(user.role === "admin" || user.role === "sales" ? "/admin" : "/account");
    } catch {
      setWorkspace("/account");
    }
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night/95 backdrop-blur">
      <p className="bg-copper px-4 py-2 text-center text-xs font-semibold tracking-[0.08em] text-cream">
        Concept demo · sample catalog · not live jahavl.com
      </p>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-cream focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-5">
        <Link href="/" aria-label="JAH Audio home" onClick={() => setOpen(false)}>
          <Mark />
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-haze lg:flex" aria-label="Primary">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={`whitespace-nowrap ${active ? "text-cream" : "text-haze transition-colors hover:text-cream"}`} aria-current={active ? "page" : undefined}>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          {workspace ? <Link href={workspace} className="text-sm text-haze hover:text-cream">Workspace</Link> : null}
          <ProfileMenu tone="dark" />
          <Link href="/contact" className="press rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink hover:bg-white">
            Request a quote
          </Link>
        </div>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-cream lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span aria-hidden className="text-lg leading-none">
            {open ? "×" : "☰"}
          </span>
        </button>
      </div>
      {open ? (
        <nav id="mobile-nav" className="border-t border-white/10 px-5 py-4 lg:hidden" aria-label="Mobile">
          <ul className="grid gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block rounded-xl px-3 py-3 text-lg text-cream hover:bg-white/5" onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="px-3 py-3">
              {workspace ? <Link href={workspace} className="mb-3 block text-lg text-haze" onClick={() => setOpen(false)}>Workspace</Link> : null}
              <ProfileMenu tone="dark" />
            </li>
            <li className="pt-2">
              <Link href="/contact" className="block rounded-full bg-cream px-4 py-3 text-center font-semibold text-ink" onClick={() => setOpen(false)}>
                Request a quote
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-copper/30 bg-[#08090c] text-sm text-haze">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <img src="/brand/logo-white.png" alt="JAH Audio" className="h-10 w-auto" />
          <p className="mt-3 max-w-xs leading-relaxed">
            Own-brand LED, lighting, and live sound for houses of worship, venues, and touring.
          </p>
          <address className="mt-4 space-y-1 not-italic">
            <p>{company.street}</p>
            <p>{company.city}</p>
            <p><a className="hover:text-cream" href={company.phoneHref}>{company.phone}</a></p>
            <p><a className="hover:text-cream" href={`mailto:${company.email}`}>{company.email}</a></p>
          </address>
        </div>
        <div>
          <p className="text-xs tracking-[0.18em] text-cream">CATALOG</p>
          <ul className="mt-4 space-y-2">
            <li><Link className="hover:text-cream" href="/led">LED walls</Link></li>
            <li><Link className="hover:text-cream" href="/catalog/lighting">Lighting</Link></li>
            <li><Link className="hover:text-cream" href="/catalog/audio">Audio</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs tracking-[0.18em] text-cream">COMPANY</p>
          <ul className="mt-4 space-y-2">
            <li><Link className="hover:text-cream" href="/dealers">Become a dealer</Link></li>
            <li><Link className="hover:text-cream" href="/policies">Sales and refunds</Link></li>
            <li><Link className="hover:text-cream" href="/contact">Contact</Link></li>
            <li><Link className="hover:text-cream" href="/login">Client and dealer sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-5 py-4 text-xs text-haze">
          Concept demo · sample catalog · not live jahavl.com · © 2026 JAH Audio
        </p>
      </div>
    </footer>
  );
}

export function Crumb({ items, tone = "light" }: { items: { href?: string; label: string }[]; tone?: "light" | "dark" }) {
  const muted = tone === "dark" ? "text-haze" : "text-mist";
  const current = tone === "dark" ? "text-cream" : "text-ink";
  const hover = tone === "dark" ? "hover:text-cream" : "hover:text-ink";
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${muted}`}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden>/</span> : null}
          {item.href ? (
            <Link href={item.href} className={hover}>
              {item.label}
            </Link>
          ) : (
            <span className={current}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
