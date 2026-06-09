"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { acceptLeagueInvite, getLeagueInvite } from "@/lib/supabaseHelpers";

export default function InvitePage() {
  const params = useParams();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token ?? "";
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setMessage("Neplatná pozvánka.");
        return;
      }
      const invite = await getLeagueInvite(token);
      if (!invite) {
        setMessage("Neplatná nebo expirovaná pozvánka.");
        return;
      }
      setLeagueId(invite.league_id);
      try {
        const { data: leagueData, error: leagueError } = await supabase
          .from("leagues")
          .select("name")
          .eq("id", invite.league_id)
          .single();
        if (!leagueError && leagueData?.name) setLeagueName(leagueData.name);
      } catch (err) {
        console.error("fetch league name error", err);
      }
    }
    loadInvite();
  }, [token]);

  async function joinLeague(userId: string) {
    if (!leagueId) return;
    await acceptLeagueInvite(userId, leagueId);
  }

  async function handleLogin() {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else if (data.user) {
      await joinLeague(data.user.id);
      router.push("/leagues");
    }
    setLoading(false);
  }

  async function handleRegister() {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        display_name: displayName || email,
        is_admin: false,
      });
      await joinLeague(userId);
      router.push("/leagues");
    } else {
      setMessage("Registrace proběhla, přihlaste se prosím znovu.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-semibold text-slate-900">
          Přijetí pozvánky do ligy{leagueName ? ` — ${leagueName}` : ""}
        </h1>

        <div className="mt-8 flex gap-2">
          <button
            onClick={() => setMode("login")}
            className={`rounded-2xl px-4 py-2 text-sm transition ${mode === "login" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            Přihlásit se
          </button>
          <button
            onClick={() => setMode("register")}
            className={`rounded-2xl px-4 py-2 text-sm transition ${mode === "register" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            Registrace nového uživatele
          </button>
        </div>

        <div className="mt-6 space-y-4">
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

          {mode === "register" && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Přezdívka</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
          )}
        </div>

        {message && <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">{message}</div>}

        <button
          onClick={mode === "login" ? handleLogin : handleRegister}
          disabled={loading || !email || !password}
          className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {loading ? "Probíhá…" : mode === "login" ? "Přihlásit se" : "Registrovat"}
        </button>
      </div>
    </div>
  );
}
