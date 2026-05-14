"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  getCurrentUserId,
  getUserLeagues,
  getLeagueCompetitions,
  LeagueResult,
} from "@/lib/supabaseHelpers";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function init() {
      const currentUserId = await getCurrentUserId();

      if (!currentUserId) {
        setLoadingDashboard(false);
        return;
      }

      setUserId(currentUserId);
    }

    init();
  }, []);

  useEffect(() => {
    const currentUserId = userId;
    if (!currentUserId) return;

    let active = true;

    async function openFirstCompetition(userIdToLoad: string) {
      setLoadingDashboard(true);
      setDashboardError(null);

      const result: LeagueResult = await getUserLeagues(userIdToLoad);

      if (!active) return;

      if (result.error) {
        setDashboardError(result.error);
        setLoadingDashboard(false);
        return;
      }

      if (!result.leagues || result.leagues.length === 0) {
        setDashboardError("Nejsou nalezeny žádné ligy.");
        setLoadingDashboard(false);
        return;
      }

      const firstLeague = result.leagues[0];
      const competitions = await getLeagueCompetitions(firstLeague.id);

      if (!active) return;

      if (!competitions || competitions.length === 0) {
        setDashboardError("Liga neobsahuje žádnou soutěž.");
        setLoadingDashboard(false);
        return;
      }

      const firstCompetition = competitions[0];

      router.replace(
        `/league/${firstLeague.id}/competition/${firstCompetition.id}`
      );
    }

    openFirstCompetition(currentUserId);

    return () => {
      active = false;
    };
  }, [userId, router]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user?.id) {
          setUserId(session.user.id);
        }

        if (event === "SIGNED_OUT") {
          setUserId(null);
          setDashboardError(null);
          setLoadingDashboard(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function login() {
    setLoadingLogin(true);
    setError(null);
    setDashboardError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoadingLogin(false);
      return;
    }

    if (data?.user?.id) {
      setUserId(data.user.id);
      setLoadingDashboard(true);
    }

    setLoadingLogin(false);
  }

  if (userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-slate-900">
            Načítám soutěž...
          </h1>

          {loadingDashboard && (
            <p className="mt-3 text-sm text-slate-600">
              Přesměrovávám vás do první dostupné ligy a soutěže.
            </p>
          )}

          {dashboardError && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {dashboardError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-semibold text-slate-900">Tipovačka</h1>

        <p className="mt-2 text-sm text-slate-600">
          Přihlaste se do ligy pomocí e-mailu a hesla. Registrace probíhá pouze
          přes pozvánku.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Heslo</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={login}
          disabled={loadingLogin}
          className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {loadingLogin ? "Probíhá přihlášení…" : "Přihlásit se"}
        </button>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <a href="/forgot-password" className="hover:text-slate-900">
            Zapomněl jsem heslo
          </a>

          <span>Registrace pouze přes pozvánku</span>
        </div>
      </div>
    </div>
  );
}