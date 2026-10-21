"use client";

import { FormEvent, useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { Banner } from "@/components/ui";
import { api, initials, saveSession, sessionUser, type SessionUser } from "@/lib/client";

type Address = { id: number; label: string; line1: string; city: string; region: string; postal_code: string };

export default function ProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");

  useEffect(() => {
    setUser(sessionUser());
    api<{ addresses: Address[]; user: SessionUser }>("/api/v1/account").then((body) => {
      setAddresses(body.addresses);
      setUser(body.user);
      const token = localStorage.getItem("jah_token");
      if (token) saveSession(token, body.user);
    }).catch((reason: Error) => { setTone("error"); setMessage(reason.message); });
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries([...new FormData(event.currentTarget).entries()].filter(([, value]) => String(value) !== ""));
    const body = await api<{ user: SessionUser }>("/api/v1/account", { method: "PATCH", body: JSON.stringify(payload) });
    setUser(body.user);
    const token = localStorage.getItem("jah_token");
    if (token) saveSession(token, body.user);
    setTone("success");
    setMessage("Profile saved.");
  }

  return (
    <WorkspaceShell title="Profile" description="Name, company, and the shipping addresses used on quotes.">
      {message ? <div className="mb-4"><Banner tone={tone}>{message}</Banner></div> : null}
      {!user ? <p className="text-sm text-mist">Sign in to edit your profile.</p> : null}
      {user ? (
        <div className="grid grid-cols-12 gap-4 md:gap-5">
          <form onSubmit={save} className="panel col-span-12 p-5 sm:p-6 lg:col-span-6">
            <div className="flex items-center gap-4">
              {"avatar_url" in user && user.avatar_url ? (
                <img src={String(user.avatar_url)} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full bg-ink text-sm font-semibold text-cream" aria-hidden>{initials(user.name)}</span>
              )}
              <div>
                <p className="text-lg font-semibold">{user.name}</p>
                <p className="text-sm capitalize text-mist">{user.role}</p>
              </div>
            </div>
            <label className="mt-6 grid gap-1.5 text-sm font-semibold">Name<input name="name" defaultValue={user.name} className="field font-normal" /></label>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold">Email<input value={user.email} readOnly className="field font-normal text-mist" /></label>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold">Photo
              <input type="file" accept="image/png,image/jpeg,image/webp" className="font-normal text-sm" onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const body = new FormData();
                body.append("file", file);
                const next = await api<{ user: SessionUser & { avatar_url?: string | null } }>("/api/v1/account/avatar", { method: "POST", body });
                setUser(next.user);
                setTone("success");
                setMessage("Photo saved.");
              }} />
            </label>
            <button className="btn btn-primary mt-6">Save profile</button>
          </form>
          <div className="panel col-span-12 p-5 sm:p-6 lg:col-span-6">
            <h2 className="text-3xl">Shipping addresses</h2>
            <p className="mt-1 text-sm text-mist">Used when a quote needs a ship-to.</p>
            <ul className="mt-4 text-sm">
              {addresses.length === 0 ? <li className="rounded-xl bg-foam px-3 py-4 text-mist">No address on file.</li> : null}
              {addresses.map((address) => (
                <li key={address.id} className="flex items-center justify-between gap-3 border-t border-line py-3">
                  <span>{address.label}: {address.line1}, {address.city} {address.region} {address.postal_code}</span>
                  <button type="button" className="min-h-11 shrink-0 px-2 text-sm font-semibold text-copper" onClick={() => api(`/api/v1/account/addresses/${address.id}`, { method: "DELETE" }).then(() => setAddresses(addresses.filter((row) => row.id !== address.id)))}>Remove</button>
                </li>
              ))}
            </ul>
            <form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={async (event) => {
              event.preventDefault();
              const body = await api<{ address: Address }>("/api/v1/account/addresses", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
              setAddresses([body.address, ...addresses]);
              event.currentTarget.reset();
            }}>
              <input name="label" defaultValue="Shipping" aria-label="Address label" className="field font-normal" />
              <input name="line1" required placeholder="Street" aria-label="Street" className="field font-normal" />
              <input name="city" required placeholder="City" aria-label="City" className="field font-normal" />
              <input name="region" required placeholder="State" aria-label="State" className="field font-normal" />
              <input name="postal_code" required placeholder="Postal code" aria-label="Postal code" className="field font-normal" />
              <input name="country" defaultValue="US" aria-label="Country" className="field font-normal" />
              <button className="btn btn-secondary w-fit">Add address</button>
            </form>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
