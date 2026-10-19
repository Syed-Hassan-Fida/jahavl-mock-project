"use client";

import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/workspace/Shell";
import { api } from "@/lib/client";

type Application = { id: number; company_name: string; contact_name: string; email: string; status: string; ein: string | null; years_in_business: number | null };
type Tax = { id: number; status: string; note: string | null; user?: { name: string; email: string } };

export default function ApprovalsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    api<{ applications: Application[] }>("/api/v1/dealer-applications").then((body) => setApplications(body.applications));
    api<{ requests: Tax[] }>("/api/v1/tax-requests").then((body) => setTaxes(body.requests));
  }

  useEffect(() => { load(); }, []);

  async function reviewDealer(id: number, decision: "approved" | "rejected") {
    const body = await api<{ temporary_password?: string }>(`/api/v1/dealer-applications/${id}/review`, { method: "POST", body: JSON.stringify({ decision }) });
    setNotice(body.temporary_password ? `Dealer password, shown once: ${body.temporary_password}` : `Application ${decision}.`);
    load();
  }

  return (
    <WorkspaceShell title="Approvals" description="Dealer applications and tax-exemption requests waiting on a decision.">
          {notice ? <p className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm">{notice}</p> : null}
          <section className="mt-8">
            <h2 className="text-3xl">Dealer applications</h2>
            <ul className="mt-3 space-y-3">
              {applications.map((application) => (
                <li key={application.id} className="rounded-2xl border border-line bg-paper px-5 py-4">
                  <p className="font-semibold">{application.company_name}</p>
                  <p className="text-sm text-mist">{application.contact_name} · {application.email} · EIN {application.ein ?? "—"} · {application.years_in_business ?? "—"} years · {application.status}</p>
                  {application.status === "pending" ? (
                    <div className="mt-3 flex gap-2">
                      <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream" onClick={() => reviewDealer(application.id, "approved")}>Approve</button>
                      <button type="button" className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold" onClick={() => reviewDealer(application.id, "rejected")}>Reject</button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
          <section className="mt-8">
            <h2 className="text-3xl">Tax exemptions</h2>
            <ul className="mt-3 space-y-3">
              {taxes.map((request) => (
                <li key={request.id} className="rounded-2xl border border-line bg-paper px-5 py-4">
                  <p className="font-semibold">{request.user?.name ?? "Account"}</p>
                  <p className="text-sm text-mist">{request.note} · {request.status}</p>
                  {request.status === "pending" ? (
                    <div className="mt-3 flex gap-2">
                      <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream" onClick={() => api(`/api/v1/tax-requests/${request.id}/review`, { method: "POST", body: JSON.stringify({ decision: "approved" }) }).then(load)}>Approve</button>
                      <button type="button" className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold" onClick={() => api(`/api/v1/tax-requests/${request.id}/review`, { method: "POST", body: JSON.stringify({ decision: "rejected" }) }).then(load)}>Reject</button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
    </WorkspaceShell>
  );
}
