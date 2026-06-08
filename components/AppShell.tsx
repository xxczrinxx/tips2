"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCompetition, getLeagueCompetitions } from "@/lib/supabaseHelpers";

type AppShellProps = {
  children: React.ReactNode;
  leagueId?: string;
  competitionId?: string;
  activeTab?: "dashboard" | "predict" | "grid";
};

type CompetitionOption = {
  id: string;
  name: string;
  sport: string;
  tip_top3: boolean;
};

export default function AppShell({
  children,
  leagueId,
  competitionId,
  activeTab,
}: AppShellProps) {
  const [profile, setProfile] = useState<{
    display_name?: string;
    is_admin?: boolean;
  } | null>(null);

  const [competitionName, setCompetitionName] = useState<string>("");
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, is_admin")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setProfile(data as { display_name?: string; is_admin?: boolean });
      }
    }

    loadProfile();
  }, []);

  useEffect(() => {
    async function loadCompetition() {
      if (!competitionId) {
        setCompetitionName("");
        return;
      }

      const competition = await getCompetition(competitionId);

      if (competition?.name) {
        setCompetitionName(competition.name);
      }
    }

    loadCompetition();
  }, [competitionId]);

  useEffect(() => {
    async function loadCompetitions() {
      if (!leagueId) {
        setCompetitions([]);
        return;
      }

      const data = await getLeagueCompetitions(leagueId);
      setCompetitions(data as CompetitionOption[]);
    }

    loadCompetitions();
  }, [leagueId]);

  function changeCompetition(nextCompetitionId: string) {
    if (!leagueId || !nextCompetitionId) return;

    router.push(`/league/${leagueId}/competition/${nextCompetitionId}`);
  }

  async function signOut() {
    setSignOutError(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setSignOutError(error.message || "Chyba při odhlašování.");
      return;
    }

    setProfile(null);
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-slate-100">
                <Image
                  src="/logo.png"
                  alt="Tipovačka"
                  fill
                  className="object-contain"
                />
              </div>

              <span className="text-xl font-semibold text-slate-900">
                Tipovačka
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            {profile?.display_name ? (
              <span>Jste: {profile.display_name}</span>
            ) : (
              <span>Načítám profil...</span>
            )}

            <button
              type="button"
              onClick={signOut}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-700 transition hover:bg-slate-100"
            >
              Odhlásit
            </button>
          </div>
        </div>

        {leagueId && competitionId ? (
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/league/${leagueId}/competition/${competitionId}/predict`}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  activeTab === "predict"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                Tipovat
              </Link>

              <Link
                href={`/league/${leagueId}/competition/${competitionId}/grid`}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  activeTab === "grid"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                Kompletní výsledky
              </Link>
            </div>

            {competitions.length > 0 ? (
              <select
                value={competitionId ?? ""}
                onChange={(event) => changeCompetition(event.target.value)}
                className="cursor-pointer appearance-none rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.12em] text-slate-600 outline-none ring-0 transition hover:bg-slate-200"
              >
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {competition.name}
                  </option>
                ))}
              </select>
            ) : competitionName ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.12em] text-slate-600">
                {competitionName}
              </span>
            ) : null}
          </div>
        ) : leagueId ? (
          <div className="border-t border-slate-200 bg-slate-50 py-3">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 sm:px-6">
              <Link
                href={`/league/${leagueId}`}
                className="rounded-md bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                Dashboard
              </Link>
            </div>
          </div>
        ) : null}

        {profile?.is_admin && leagueId && (
          <div className="border-t border-slate-200 bg-slate-50 py-3">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 sm:px-6">
              <Link
                href={`/league/${leagueId}/admin/leagues`}
                className="rounded-md bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                Admin lig
              </Link>

              <Link
                href={`/league/${leagueId}/admin/new-competition`}
                className="rounded-md bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                Nový turnaj
              </Link>

              {competitionId && (
                <Link
                  href={`/league/${leagueId}/competition/${competitionId}/admin/results`}
                  className="rounded-md bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  Editovat výsledky
                </Link>
              )}
            </div>
          </div>
        )}

        {signOutError ? (
          <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {signOutError}
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}