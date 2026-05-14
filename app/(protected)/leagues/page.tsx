"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { getCurrentUserId, getUserLeagues, getProfile, League, LeagueResult } from "@/lib/supabaseHelpers";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadData() {
      const userId = await getCurrentUserId();
      if (!userId) {
        setError("Musíte být přihlášeni.");
        setLoading(false);
        return;
      }

      // Načíst profil pro kontrolu admin práv
      const profile = await getProfile(userId);
      setIsAdmin(profile?.is_admin ?? false);

      const result: LeagueResult = await getUserLeagues(userId);
      if (result.error) {
        setError(result.error);
      } else {
        setLeagues(result.leagues);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  return (
    <AppShell leagueId={leagues.length > 0 ? leagues[0].id : undefined} activeTab="dashboard">
      <div className="space-y-8">
        {isAdmin && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Správa lig</h2>
            <p className="mt-2 text-sm text-slate-600">Jako administrátor můžete vytvářet a spravovat ligy.</p>

            <div className="mt-6">
              <Link
                href="/admin/create-league"
                className="rounded-2xl bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800"
              >
                Vytvořit novou ligu
              </Link>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Moje ligy</h2>
          <p className="mt-2 text-sm text-slate-600">Vyberte ligu, ve které chcete pokračovat.</p>

          {loading ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">Načítám ligy...</div>
          ) : error ? (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
          ) : leagues.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">Nejsou nalezeny žádné ligy.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {leagues.map((league) => (
                <Link
                  key={league.id}
                  href={`/league/${league.id}`}
                  className="block rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{league.name}</p>
                      <p className="mt-1 text-sm text-slate-600">Zobrazit soutěže a výsledky v této lize.</p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Otevřít</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
