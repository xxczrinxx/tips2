"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { acceptLeagueInvite, getLeagueInvite, getLeagueDefaultCompetition, getLeagueCompetitions } from "@/lib/supabaseHelpers";

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
    }
    loadInvite();
  }, [token]);

  useEffect(() => {
    async function loadLeagueName() {
      if (!leagueId) return;
      try {
        const { data, error } = await supabase
          .from("leagues")
          .select("name")
          .eq("id", leagueId)
          .maybeSingle();

        if (!error && data?.name) setLeagueName(data.name);
      } catch (e) {
        console.error("loadLeagueName error", e);
      }
    }

    loadLeagueName();
  }, [leagueId]);

  async function joinLeague(userId: string) {
    if (!leagueId) return;
    await acceptLeagueInvite(userId, leagueId);
  }

  async function redirectToLeagueCompetition(nextLeagueId: string) {
    try {
      // try default competition first
      let competitionId = await getLeagueDefaultCompetition(nextLeagueId);

      if (!competitionId) {
        const comps = await getLeagueCompetitions(nextLeagueId);
        competitionId = comps && comps.length > 0 ? comps[0].id : null;
      }

      if (competitionId) {
        router.push(`/league/${nextLeagueId}/competition/${competitionId}`);
      } else {
        router.push("/leagues");
      }
    } catch (e) {
      console.error("redirectToLeagueCompetition error", e);
      router.push("/leagues");
    }
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
      if (leagueId) await redirectToLeagueCompetition(leagueId);
      else router.push("/leagues");
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
      if (leagueId) await redirectToLeagueCompetition(leagueId);
      else router.push("/leagues");
    } else {
      setMessage("Registrace proběhla, přihlaste se prosím znovu.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Přijetí pozvánky do ligy</h1>
        <h2 className="mt-4 text-xl font-medium text-slate-700">{leagueName ?? (leagueId ? "Načítám název ligy..." : "Načítám...")}</h2>
      </div>
    </div>
  );
}
