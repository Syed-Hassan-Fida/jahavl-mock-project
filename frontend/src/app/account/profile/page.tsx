"use client";

import { FormEvent, useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { api, saveSession, sessionUser, type SessionUser } from "@/lib/client";

type Address = { id: number; label: string; line1: string; city: string; region: string; postal_code: string };

export default function ProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setUser(sessionUser());
    api<{ addresses: Address[]; user: SessionUser }>("/api/v1/account").then((body) => {
      setAddresses(body.addresses);
      setUser(body.user);
      const token = localStorage.getItem("jah_token");
      if (token) saveSession(token, body.user);
    }).catch((reason: Error) => setMessage(reason.message));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries([...new FormData(event.currentTarget).entries()].filter(([, value]) => String(value) !== ""));
    const body = await api<{ user: SessionUser }>("/api/v1/account", { method: "PATCH", body: JSON.stringify(payload) });
    setUser(body.user);
    const token = localStorage.getItem("jah_token");
    if (token) saveSession(token, body.user);
    setMessage("Profile saved.");
  }

  return (
    <WorkspaceShell title="Profile" description="Name, company, and the shipping addresses used on quotes.">
      {message ? <p className="mb-4 text-sm text-copper">{message}</p> : null}
      {!user ? <p className="text-sm text-mist">Sign in to edit your profile.</p> : null}
      {user ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={save} className="rounded-2xl border border-line bg-paper p-5">
            <label className="grid gap-1 text-sm font-semibold">Name<input name="name" defaultValue={user.name} className="field font-normal" /></label>
            <label className="mt-3 grid gap-1 text-sm font-semibold">Email<input value={user.email} readOnly className="field font-normal text-mist" /></label>
            <p className="mt-3 text-sm capitalize text-mist">Role · {user.role}</p>
            <label className="mt-4 grid gap-1 text-sm font-semibold">Photo
              <input type="file" accept="image/png,image/jpeg,image/webp" className="font-normal" onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const body = new FormData();
                body.append("file", file);
                const next = await api<{ user: SessionUser & { avatar_url?: string | null } }>("/api/v1/account/avatar", { method: "POST", body });
                setUser(next.user);
                setMessage("Photo saved.");
              }} />
            </label>
            {"avatar_url" in user && user.avatar_url ? <img src={String(user.avatar_url)} alt="" className="mt-3 h-16 w-16 rounded-full object-cover" /> : null}
            <button className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">Save profile</button>
          </form>
          <div className="rounded-2xl border border-line bg-paper p-5">
            <h2 className="text-2xl">Shipping addresses</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {addresses.length === 0 ? <li className="text-mist">No address on file.</li> : null}
              {addresses.map((address) => (
                <li key={address.id} className="flex justify-between gap-3 border-t border-line py-2">
                  <span>{address.label}: {address.line1}, {address.city} {address.region} {address.postal_code}</span>
                  <button type="button" className="text-copper" onClick={() => api(`/api/v1/account/addresses/${address.id}`, { method: "DELETE" }).then(() => setAddresses(addresses.filter((row) => row.id !== address.id)))}>Remove</button>
                </li>
              ))}
            </ul>
            <form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={async (event) => {
              event.preventDefault();
              const body = await api<{ address: Address }>("/api/v1/account/addresses", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
              setAddresses([body.address, ...addresses]);
              event.currentTarget.reset();
            }}>
              <input name="label" defaultValue="Shipping" className="field font-normal" />
              <input name="line1" required placeholder="Street" className="field font-normal" />
              <input name="city" required placeholder="City" className="field font-normal" />
              <input name="region" required placeholder="State" className="field font-normal" />
              <input name="postal_code" required placeholder="Postal code" className="field font-normal" />
              <input name="country" defaultValue="US" className="field font-normal" />
              <button className="w-fit rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold">Add address</button>
            </form>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
