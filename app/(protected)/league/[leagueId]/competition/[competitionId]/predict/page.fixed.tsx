"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import {
  getCurrentUserId,
  getCompetition,
  getCompetitionMatches,
  getPodiumPrediction,
  getTeamsByIds,
  getUserPredictions,
  savePodiumPrediction,
  saveUserPrediction,
} from "@/lib/supabaseHelpers";

type MatchWithNames = {
  id: string;
  stage: string;
  kickoff_at: string | null;
  homeTeamName: string;
  awayTeamName: string;
};

type TeamOption = {
  id: string;
  name: string;
};

export default function PredictPage() {
  const params = useParams();

  const leagueId = Array.isArray(params?.leagueId)
    ? params.leagueId[0]
    : params?.leagueId ?? "";

  const competitionId = Array.isArray(params?.competitionId)
    ? params.competitionId[0]
    : params?.competitionId ?? "";

  const [competitionName, setCompetitionName] = useState<string>("");
  const [matches, setMatches] = useState<MatchWithNames[]>([]);
  const [tips, setTips] = useState<Record<string, { home: string; away: string }>>({});
  const [podium, setPodium] = useState({ first: "", second: "", third: "" });
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [top3Enabled, setTop3Enabled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setStatus(null);

      if (!competitionId) {
        setStatus("Chybí ID soutěže.");
        setLoading(false);
        return;
      }

      const userId = await getCurrentUserId();

      if (!userId) {
        setStatus("Musíte být přihlášeni.");
        setLoading(false);
        return;
      }

      const competition = await getCompetition(competitionId);

      if (!competition) {
        setStatus("Nepodařilo se načíst soutěž.");
        setLoading(false);
        return;
      }

      setCompetitionName(competition.name);

      const rawMatches = await getCompetitionMatches(competitionId);
      const now = new Date();

      const tournamentStarted = rawMatches.some(
        (match) => match.kickoff_at && new Date(match.kickoff_at) <= now
      );

      setTop3Enabled(!!competition.tip_top3 && !tournamentStarted);

      const matchTeamIds = rawMatches.flatMap((match) =>
        [match.home_team_id, match.away_team_id].filter(Boolean) as string[]
      );

      const { data: competitionTeamLinks, error: competitionTeamsError } = await supabase
        .from("competition_teams")
        .select("team_id")
        .eq("competition_id", competitionId);

      if (competitionTeamsError) {
        console.error("competitionTeamsError", competitionTeamsError);
      }

      const competitionTeamIds =
        competitionTeamLinks?.map((row) => row.team_id).filter(Boolean) ?? [];

      const allTeamIds = Array.from(new Set([...matchTeamIds, ...competitionTeamIds]));
      const fetchedTeams = allTeamIds.length > 0 ? await getTeamsByIds(allTeamIds) : [];

      const sortedTeams = [...fetchedTeams].sort((a, b) =>
        a.name.localeCompare(b.name, "cs")
      );

      setTeams(sortedTeams);

      const teamMap = Object.fromEntries(fetchedTeams.map((team) => [team.id, team.name]));

      setMatches(
        rawMatches
          .filter(
            (match) =>
              !match.kickoff_at || new Date(match.kickoff_at) > now
          )
          .map((match) => ({
            id: match.id,
            stage: match.stage || "Další",
            kickoff_at: match.kickoff_at,
            homeTeamName: teamMap[match.home_team_id ?? ""] ?? "TBD",
            awayTeamName: teamMap[match.away_team_id ?? ""] ?? "TBD",
          }))
      );

      const predictions = await getUserPredictions(userId, competitionId);

      setTips(
        Object.fromEntries(
          (predictions ?? []).map((prediction) => [
            prediction.match_id,
            {
              home: prediction.home_score?.toString() ?? "",
              away: prediction.away_score?.toString() ?? "",
            },
          ])
        )
      );

      if (competition.tip_top3) {
        const podiumPrediction = await getPodiumPrediction(userId, competitionId);

        if (podiumPrediction) {
          setPodium({
            first: podiumPrediction.first_team_id ?? "",
            second: podiumPrediction.second_team_id ?? "",
            third: podiumPrediction.third_team_id ?? "",
          });
        }
      }

      setLoading(false);
    }

    loadData();
  }, [competitionId]);

  const groupedMatches = useMemo(() => {
    return matches.reduce<Record<string, MatchWithNames[]>>((acc, match) => {
      const stage = match.stage || "Bez fáze";
      acc[stage] = acc[stage] ? [...acc[stage], match] : [match];
      return acc;
    }, {});
  }, [matches]);

  function updateTip(matchId: string, side: "home" | "away", value: string) {
    setStatus(null);

    setTips((current) => ({
      ...current,
      [matchId]: {
        home: side === "home" ? value : current[matchId]?.home ?? "",
        away: side === "away" ? value : current[matchId]?.away ?? "",
      },
    }));
  }

  async function saveAll() {
  setStatus(null);
  setSaving(true);

  const userId = await getCurrentUserId();

  if (!userId) {
    setStatus("Musíte být přihlášeni.");
    setSaving(false);
    return;
  }

  const hasAnyPodium = Boolean(
    podium.first || podium.second || podium.third
  );

  const hasFullPodium = Boolean(
    podium.first && podium.second && podium.third
  );

  if (top3Enabled && hasAnyPodium && !hasFullPodium) {
    setStatus("TOP 3 není kompletní. Vyberte 1., 2. i 3. místo.");
    setSaving(false);
    return;
  }

  const now = new Date();

for (const match of matches) {
  if (match.kickoff_at && new Date(match.kickoff_at) <= now) {
    continue;
  }

  const prediction = tips[match.id];

  if (!prediction) continue;

  const homeScore =
    prediction.home.trim() === "" ? null : Number(prediction.home);

  const awayScore =
    prediction.away.trim() === "" ? null : Number(prediction.away);

  const saved = await saveUserPrediction({
    match_id: match.id,
    user_id: userId,
    home_score: Number.isNaN(homeScore) ? null : homeScore,
    away_score: Number.isNaN(awayScore) ? null : awayScore,
  });

  if (!saved) {
    setStatus("Některý tip zápasu se nepodařilo uložit.");
    setSaving(false);
    return;
  }
}

  if (top3Enabled && hasFullPodium) {
    const savedPodium = await savePodiumPrediction({
      competition_id: competitionId,
      user_id: userId,
      first_team_id: podium.first,
      second_team_id: podium.second,
      third_team_id: podium.third,
    });

    if (!savedPodium) {
      setStatus("TOP 3 se nepodařilo uložit.");
      setSaving(false);
      return;
    }
  }

  setStatus("Tipy byly uloženy.");
  setSaving(false);
}

  return (
    <AppShell leagueId={leagueId} competitionId={competitionId} activeTab="predict">
      <div className="space-y-6">
        <section className="sticky top-0 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Tipovat soutěž</h2>
              <p className="mt-1 text-sm text-slate-600">
                {competitionName || competitionId}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={saveAll}
                disabled={loading || saving}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {saving ? "Ukládám..." : "Uložit tipy"}
              </button>

              {status && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                  {status}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              Načítám zápasy...
            </div>
          ) : (
            <>
              {top3Enabled && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">TOP 3</h3>

                  {teams.length === 0 ? (
                    <p className="mt-4 text-sm text-red-700">
                      Pro tuto soutěž nejsou načtené žádné týmy.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      {(["first", "second", "third"] as const).map((position, index) => (
                        <label key={position} className="block">
                          <span className="text-sm font-medium text-slate-700">
                            {index + 1}. místo
                          </span>

                          <select
                            value={podium[position]}
                            onChange={(e) => {
                              setStatus(null);
                              setPodium((current) => ({
                                ...current,
                                [position]: e.target.value,
                              }));
                            }}
                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                          >
                            <option value="">Vyberte tým</option>

                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {matches.length === 0 ? (
                <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
                  Pro tuto soutěž nejsou načtené žádné zápasy.
                </div>
              ) : (
                Object.entries(groupedMatches).map(([stage, stageMatches]) => (
                  <div key={stage} className="mt-8">
                    <h3 className="text-xl font-semibold text-slate-900">{stage}</h3>

                    <div className="mt-4 space-y-3">
                      {stageMatches.map((match) => (
                        <div
                          key={match.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="grid gap-3 md:grid-cols-[150px_1fr_180px] md:items-center">
                            <div className="text-sm text-slate-500">
                              {match.kickoff_at
                                ? new Date(match.kickoff_at).toLocaleString("cs-CZ", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Datum neznámé"}
                            </div>

                            <div className="truncate text-base font-semibold text-slate-900">
                              {match.homeTeamName} : {match.awayTeamName}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="D"
                                value={tips[match.id]?.home ?? ""}
                                onChange={(e) => updateTip(match.id, "home", e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-slate-900 outline-none"
                              />

                              <input
                                type="number"
                                min="0"
                                placeholder="H"
                                value={tips[match.id]?.away ?? ""}
                                onChange={(e) => updateTip(match.id, "away", e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-slate-900 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}