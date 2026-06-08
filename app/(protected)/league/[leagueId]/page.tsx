"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Competition, getLeagueCompetitions, getLeagueDefaultCompetition } from "@/lib/supabaseHelpers";

export default function LeaguePage() {
  const params = useParams();
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId ?? "0";
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCompetitions() {
      if (!leagueId) {
        setError("Neplatná liga.");
        setLoading(false);
        return;
      }
      const data = await getLeagueCompetitions(leagueId);
      setCompetitions(data);

      // Redirect to default competition if exists, otherwise fallback to first assigned
      const defaultCompetitionId = await getLeagueDefaultCompetition(leagueId);
      if (defaultCompetitionId) {
        router.push(`/league/${leagueId}/competition/${defaultCompetitionId}`);
        return;
      }

      if (data && data.length > 0) {
        router.push(`/league/${leagueId}/competition/${data[0].id}`);
        return;
      }

      setLoading(false);
    }

    loadCompetitions();
  }, [leagueId]);

  return (
    <AppShell leagueId={leagueId} activeTab="dashboard">
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Liga {leagueId}</h2>
          <p className="mt-2 text-sm text-slate-600">Vyberte soutěž, kterou chcete spravovat nebo tipovat.</p>

          {loading ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">Načítám soutěže...</div>
          ) : error ? (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
          ) : competitions.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">Pro tuto ligu nebyly nalezeny žádné soutěže.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {competitions.map((competition) => (
                <div key={competition.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{competition.name}</p>
                      <p className="mt-1 text-sm text-slate-600">Sport: {competition.sport}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/league/${leagueId}/competition/${competition.id}`} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800">
                        Pořadí
                      </Link>
                      <Link href={`/league/${leagueId}/competition/${competition.id}/predict`} className="rounded-2xl bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100">
                        Tipovat
                      </Link>
                      <Link href={`/league/${leagueId}/competition/${competition.id}/grid`} className="rounded-2xl bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100">
                        Kompletní výsledky
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
