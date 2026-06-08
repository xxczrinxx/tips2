"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import {
  getAllCompetitions,
  getLeagueCompetitions,
  getLeagueDefaultCompetition,
  setLeagueDefaultCompetition,
  createLeagueInvite,
} from "@/lib/supabaseHelpers";

type LeagueRow = { id: string; name: string; default_competition_id?: string | null };

export default function AdminLeaguesPage() {
  const params = useParams();
  const leagueIdParam = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId ?? "";

  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [assignedMap, setAssignedMap] = useState<Record<string, string[]>>({});
  const [defaultMap, setDefaultMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [inviteTokens, setInviteTokens] = useState<Record<string, string | null>>({});

  // competitionId to pass to AppShell for the current league route
  const competitionForShell =
    (defaultMap[leagueIdParam] as string | null | undefined) ??
    (assignedMap[leagueIdParam] && assignedMap[leagueIdParam].length > 0 ? assignedMap[leagueIdParam][0] : undefined);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: leaguesData, error: leaguesErr } = await supabase.from("leagues").select("id, name, default_competition_id");
      if (leaguesErr) {
        console.error("load leagues error", leaguesErr);
        setLeagues([]);
        setLoading(false);
        return;
      }

      const comps = await getAllCompetitions();
      setCompetitions(comps);

      const map: Record<string, string[]> = {};
      const defMap: Record<string, string | null> = {};

      for (const l of (leaguesData ?? [])) {
        const leagueId = (l as any).id as string;
        const lc = await getLeagueCompetitions(leagueId);
        map[leagueId] = lc.map((c: any) => c.id);
        defMap[leagueId] = (l as any).default_competition_id ?? null;
        // load existing active invite token (if any)
        try {
          const { data: existingInvite } = await supabase
            .from("league_invites")
            .select("token, expires_at, accepted_by")
            .eq("league_id", leagueId)
            .is("accepted_by", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingInvite && existingInvite.token) {
            const notExpired = !existingInvite.expires_at || new Date(existingInvite.expires_at) > new Date();
            if (notExpired) {
              // build full link (prefer public env, fallback to window.origin)
              const origin = (process.env.NEXT_PUBLIC_APP_URL as string) || (typeof window !== "undefined" ? window.location.origin : "");
              setInviteTokens((t) => ({ ...t, [leagueId]: origin ? `${origin}/invite/${existingInvite.token}` : existingInvite.token }));
            }
          }
        } catch (e) {
          console.error("load existing invite error", e);
        }
      }

      setLeagues((leaguesData as LeagueRow[]) ?? []);
      setAssignedMap(map);
      setDefaultMap(defMap);
      setLoading(false);
    }

    load();
  }, []);

  function toggleAssignment(leagueId: string, competitionId: string) {
    setAssignedMap((prev) => {
      const current = new Set(prev[leagueId] ?? []);
      if (current.has(competitionId)) current.delete(competitionId);
      else current.add(competitionId);
      return { ...prev, [leagueId]: Array.from(current) };
    });
  }

  function setDefaultForLeague(leagueId: string, competitionId: string | null) {
    setDefaultMap((prev) => ({ ...prev, [leagueId]: competitionId }));
  }

  async function handleSave(leagueId: string) {
    setSaving((s) => ({ ...s, [leagueId]: true }));
    const assigned = assignedMap[leagueId] ?? [];

    try {
      // Remove all existing assignments for this league
      const { error: delError } = await supabase.from("league_competitions").delete().eq("league_id", leagueId);
      if (delError) {
        console.error("delete league_competitions error", delError);
      }

      if (assigned.length > 0) {
        const inserts = assigned.map((competition_id) => ({ league_id: leagueId, competition_id }));
        const { error: insertError } = await supabase.from("league_competitions").insert(inserts);
        if (insertError) {
          console.error("insert league_competitions error", insertError);
        }
      }

      // Ensure default is one of assigned, otherwise clear
      const desiredDefault = defaultMap[leagueId] ?? null;
      const shouldSetDefault = desiredDefault && assigned.includes(desiredDefault) ? desiredDefault : null;
      await setLeagueDefaultCompetition(leagueId, shouldSetDefault);

      // reload league assignments
      const lc = await getLeagueCompetitions(leagueId);
      setAssignedMap((m) => ({ ...m, [leagueId]: lc.map((c: any) => c.id) }));
      const leagueRow = leagues.find((l) => l.id === leagueId);
      setDefaultMap((d) => ({ ...d, [leagueId]: shouldSetDefault }));
    } catch (e) {
      console.error("save league error", e);
    }

    setSaving((s) => ({ ...s, [leagueId]: false }));
  }

  async function handleCreateInvite(leagueId: string) {
    const token = await createLeagueInvite(leagueId);
    if (!token) {
      setInviteTokens((t) => ({ ...t, [leagueId]: null }));
      return;
    }

    const origin = (process.env.NEXT_PUBLIC_APP_URL as string) || (typeof window !== "undefined" ? window.location.origin : "");
    const link = origin ? `${origin}/invite/${token}` : token;
    setInviteTokens((t) => ({ ...t, [leagueId]: link }));
  }

  return (
    <AppShell leagueId={leagueIdParam} competitionId={competitionForShell}>
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Admin lig</h2>
          <p className="mt-2 text-sm text-slate-600">Správa všech lig — přiřazení soutěží, výchozí soutěž a pozvánky.</p>

          {loading ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">Načítám...</div>
          ) : (
            <div className="mt-6 space-y-6">
              {leagues.map((league) => (
                <div key={league.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{league.name}</p>
                      <p className="mt-1 text-sm text-slate-600">ID: {league.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCreateInvite(league.id)}
                        className="rounded-md bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                      >
                        Vytvořit pozvánku
                      </button>
                      {inviteTokens[league.id] ? (
                        <div className="flex items-center gap-2">
                          <a href={inviteTokens[league.id] ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-slate-700 underline">
                            {inviteTokens[league.id]}
                          </a>
                          <button
                            onClick={() => navigator.clipboard.writeText(inviteTokens[league.id] ?? "")}
                            className="rounded-md bg-white px-2 py-1 text-sm text-slate-700 ring-1 ring-slate-200"
                          >
                            Kopírovat odkaz
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium text-slate-700">Soutěže</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {competitions.map((comp) => {
                        const assigned = assignedMap[league.id] ?? [];
                        const checked = assigned.includes(comp.id);
                        return (
                          <label key={comp.id} className="flex items-center gap-2 rounded-md bg-white px-3 py-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAssignment(league.id, comp.id)}
                            />
                            <div>
                              <div className="text-sm font-medium">{comp.name}</div>
                              <div className="text-xs text-slate-500">{comp.sport}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-medium text-slate-700">Výchozí soutěž</div>
                      <div className="mt-2">
                        <select
                          value={defaultMap[league.id] ?? ""}
                          onChange={(e) => setDefaultForLeague(league.id, e.target.value || null)}
                          disabled={!(assignedMap[league.id] && assignedMap[league.id].length > 0)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm"
                        >
                          <option value="">-- žádná --</option>
                          {(assignedMap[league.id] ?? []).map((cid) => {
                            const comp = competitions.find((c) => c.id === cid);
                            if (!comp) return null;
                            return (
                              <option key={cid} value={cid}>
                                {comp.name}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => handleSave(league.id)}
                        disabled={saving[league.id]}
                        className="rounded-2xl bg-slate-900 px-6 py-2 text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        Uložit
                      </button>
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
