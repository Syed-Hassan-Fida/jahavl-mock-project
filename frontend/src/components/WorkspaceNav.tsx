"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sessionUser, type SessionUser } from "@/lib/client";

const links = [
  { href: "/account", label: "Account", roles: ["admin", "sales", "dealer", "client"] },
  { href: "/admin", label: "Pipeline", roles: ["admin", "sales"] },
  { href: "/admin/people", label: "People", roles: ["admin", "sales", "dealer"] },
  { href: "/admin/approvals", label: "Approvals", roles: ["admin"] },
  { href: "/admin/catalog", label: "Pricing", roles: ["admin"] },
];

export function WorkspaceNav({ current }: { current: string }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => setUser(sessionUser()), []);
  const visible = links.filter((link) => user && link.roles.includes(user.role));

  return (
    <nav className="mb-8 flex flex-wrap gap-2" aria-label="Workspace">
      {visible.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-ink text-cream" : "bg-foam text-ink hover:bg-line"}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
