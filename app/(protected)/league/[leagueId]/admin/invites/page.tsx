"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createLeagueInvite } from "@/lib/supabaseHelpers";

export default function InvitesPage() {
  const params = useParams();
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId ?? "";
  const [link, setLink] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createInvite() {
    if (!leagueId) {
      setStatus("Neplatná liga.");
      return;
    }
    setLoading(true);
    setStatus(null);
    const token = await createLeagueInvite(leagueId);
    setLoading(false);

    if (!token) {
      setStatus("Nepodařilo se vytvořit pozvánku.");
      return;
    }

    const origin = (process.env.NEXT_PUBLIC_APP_URL as string) || (typeof window !== "undefined" ? window.location.origin : "");
    setLink(origin ? `${origin}/invite/${token}` : token);
    setStatus("Pozvánka byla vytvořena.");
  }

  return (
    <AppShell leagueId={leagueId} activeTab="dashboard">
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Pozvánky do ligy</h2>
          <p className="mt-2 text-sm text-slate-600">Vygenerujte unikátní pozvánku pro hráče do této ligy.</p>

          <button
            onClick={createInvite}
            disabled={loading}
            className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {loading ? "Vytvářím…" : "Vytvořit pozvánku"}
          </button>

          {status && <div className="mt-6 rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</div>}

          {link && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-600">Kopírujte tento odkaz a pošlete ho pozvanému hráči:</p>
              <p className="mt-3 break-all text-sm font-medium text-slate-900">{link}</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
