"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import {
  getCompetition,
  getCompetitionMatches,
  getTeamsByIds,
} from "@/lib/supabaseHelpers";

type MatchWithEdit = {
  id: string;
  stage: string;
  kickoff_at: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
};

type TeamOption = {
  id: string;
  name: string;
};

export default function AdminResultsPage() {
  const params = useParams();

  const leagueId = Array.isArray(params?.leagueId)
    ? params.leagueId[0]
    : (params?.leagueId ?? "");
  const competitionId = Array.isArray(params?.competitionId)
    ? params.competitionId[0]
    : (params?.competitionId ?? "");

  const [competitionName, setCompetitionName] = useState("");
  const [matches, setMatches] = useState<MatchWithEdit[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [finalResult, setFinalResult] = useState({
    first: "",
    second: "",
    third: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function formatMatchDate(kickoffAt: string | null) {
    if (!kickoffAt) return "Datum neznámé";

    return new Date(kickoffAt).toLocaleDateString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  function formatMatchTime(kickoffAt: string | null) {
    if (!kickoffAt) return "Čas neznámý";

    return new Date(kickoffAt).toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setStatus(null);

      if (!competitionId) {
        setStatus("Chybí ID soutěže.");
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

      const { data: competitionTeamLinks, error: competitionTeamsError } =
        await supabase
          .from("competition_teams")
          .select("team_id")
          .eq("competition_id", competitionId);

      if (competitionTeamsError) {
        console.error("competitionTeamsError", competitionTeamsError);
      }

      const competitionTeamIds =
        competitionTeamLinks?.map((row) => row.team_id).filter(Boolean) ?? [];

      const matchTeamIds = rawMatches.flatMap(
        (match) =>
          [match.home_team_id, match.away_team_id].filter(Boolean) as string[],
      );

      const allTeamIds = Array.from(
        new Set([...competitionTeamIds, ...matchTeamIds]),
      );
      const fetchedTeams =
        allTeamIds.length > 0 ? await getTeamsByIds(allTeamIds) : [];

      const sortedTeams = [...fetchedTeams].sort((a, b) =>
        a.name.localeCompare(b.name, "cs"),
      );
      setTeams(sortedTeams);

      setMatches(
        rawMatches.map((match) => ({
          id: match.id,
          stage: match.stage || "Další",
          kickoff_at: match.kickoff_at,
          home_team_id: match.home_team_id ?? "",
          away_team_id: match.away_team_id ?? "",
          home_score: match.home_score === null ? "" : String(match.home_score),
          away_score: match.away_score === null ? "" : String(match.away_score),
        })),
      );

      const { data: realTop3, error: top3Error } = await supabase
        .from("competition_results")
        .select("first_team_id, second_team_id, third_team_id")
        .eq("competition_id", competitionId)
        .maybeSingle();

      if (top3Error) {
        console.error("competition_results load error", top3Error);
      }

      if (realTop3) {
        setFinalResult({
          first: realTop3.first_team_id ?? "",
          second: realTop3.second_team_id ?? "",
          third: realTop3.third_team_id ?? "",
        });
      }

      setLoading(false);
    }

    loadData();
  }, [competitionId]);

  const groupedMatches = useMemo(() => {
    return matches.reduce<Record<string, Record<string, MatchWithEdit[]>>>(
      (acc, match) => {
        const stage = match.stage || "Bez fáze";
        const matchDate = formatMatchDate(match.kickoff_at);

        if (!acc[stage]) {
          acc[stage] = {};
        }

        acc[stage][matchDate] = acc[stage][matchDate]
          ? [...acc[stage][matchDate], match]
          : [match];
        return acc;
      },
      {},
    );
  }, [matches]);

  function updateMatch(
    matchId: string,
    field: keyof MatchWithEdit,
    value: string,
  ) {
    setStatus(null);

    setMatches((current) =>
      current.map((match) =>
        match.id === matchId ? { ...match, [field]: value } : match,
      ),
    );
  }

  async function saveAll() {
    setSaving(true);
    setStatus(null);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      setStatus("Musíte být přihlášeni.");
      setSaving(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (!profile?.is_admin) {
      setStatus("Nemáte oprávnění upravovat výsledky.");
      setSaving(false);
      return;
    }

    if (finalResult.first || finalResult.second || finalResult.third) {
      if (!finalResult.first || !finalResult.second || !finalResult.third) {
        setStatus("Reálné TOP 3 není kompletní.");
        setSaving(false);
        return;
      }

      const { error: top3Error } = await supabase
        .from("competition_results")
        .upsert(
          {
            competition_id: competitionId,
            first_team_id: finalResult.first,
            second_team_id: finalResult.second,
            third_team_id: finalResult.third,
          },
          { onConflict: "competition_id" },
        );

      if (top3Error) {
        console.error("save competition_results error", top3Error);
        setStatus("Nepodařilo se uložit TOP 3.");
        setSaving(false);
        return;
      }
    }

    for (const match of matches) {
      const { error: matchError } = await supabase
        .from("matches")
        .update({
          home_team_id: match.home_team_id || null,
          away_team_id: match.away_team_id || null,
        })
        .eq("id", match.id);

      if (matchError) {
        console.error("save matches error", matchError);
        setStatus("Nepodařilo se uložit týmy u zápasu.");
        setSaving(false);
        return;
      }

      const homeScoreText = match.home_score.trim();
      const awayScoreText = match.away_score.trim();

      if (homeScoreText === "" && awayScoreText === "") {
        const { error: deleteError } = await supabase
          .from("match_results")
          .delete()
          .eq("match_id", match.id);

        if (deleteError) {
          console.error("delete match_results error", deleteError);
          setStatus("Nepodařilo se smazat výsledek zápasu.");
          setSaving(false);
          return;
        }

        continue;
      }

      if (homeScoreText === "" || awayScoreText === "") {
        setStatus("Výsledek zápasu není kompletní.");
        setSaving(false);
        return;
      }

      const homeScore = Number(homeScoreText);
      const awayScore = Number(awayScoreText);

      if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
        setStatus("Výsledek zápasu musí být číslo.");
        setSaving(false);
        return;
      }

      const { error: resultError } = await supabase
        .from("match_results")
        .upsert(
          {
            match_id: match.id,
            home_score: homeScore,
            away_score: awayScore,
          },
          { onConflict: "match_id" },
        );

      if (resultError) {
        console.error("save match_results error", resultError);
        setStatus("Nepodařilo se uložit výsledek zápasu.");
        setSaving(false);
        return;
      }
    }

    setStatus("Výsledky byly uloženy.");
    setSaving(false);
  }

  return (
    <AppShell leagueId={leagueId} competitionId={competitionId}>
      <div className="space-y-6">
        <section className="sticky top-0 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Editovat výsledky
              </h2>
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
                {saving ? "Ukládám..." : "Uložit výsledky"}
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
              Načítám výsledky...
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  Reálné TOP 3
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-[140px_140px_140px]">
                  {(["first", "second", "third"] as const).map(
                    (position, index) => (
                      <label key={position} className="block">
                        <span className="text-sm font-medium text-slate-700">
                          {index + 1}. místo
                        </span>

                        <select
                          value={finalResult[position]}
                          onChange={(e) => {
                            setStatus(null);
                            setFinalResult((current) => ({
                              ...current,
                              [position]: e.target.value,
                            }));
                          }}
                          className="mt-2 w-[140px] rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                        >
                          <option value="">Vyberte tým</option>

                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ),
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-8">
                {Object.entries(groupedMatches).map(([stage, stageMatches]) => (
                  <div key={stage}>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {stage}
                    </h3>

                    <div className="mt-4 space-y-6">
                      {Object.entries(stageMatches).map(
                        ([matchDate, dateMatches]) => (
                          <div key={matchDate} className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-700">
                              {matchDate}
                            </h4>

                            {dateMatches.map((match) => (
                              <div
                                key={match.id}
                                className="w-fit rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                              >
                                <div className="grid grid-cols-[36px_140px_140px_72px] items-center gap-3">
                                  <div className="text-sm text-slate-500">
                                    {formatMatchTime(match.kickoff_at)}
                                  </div>

                                  <select
                                    value={match.home_team_id}
                                    onChange={(e) =>
                                      updateMatch(
                                        match.id,
                                        "home_team_id",
                                        e.target.value,
                                      )
                                    }
                                    className="w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none"
                                  >
                                    <option value="">Domácí tým</option>
                                    {teams.map((team) => (
                                      <option key={team.id} value={team.id}>
                                        {team.name}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={match.away_team_id}
                                    onChange={(e) =>
                                      updateMatch(
                                        match.id,
                                        "away_team_id",
                                        e.target.value,
                                      )
                                    }
                                    className="w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none"
                                  >
                                    <option value="">Hostující tým</option>
                                    {teams.map((team) => (
                                      <option key={team.id} value={team.id}>
                                        {team.name}
                                      </option>
                                    ))}
                                  </select>

                                  <div className="grid grid-cols-[32px_auto_32px] items-center gap-1">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="D"
                                      value={match.home_score}
                                      onChange={(e) =>
                                        updateMatch(
                                          match.id,
                                          "home_score",
                                          e.target.value,
                                        )
                                      }
                                      className="w-[32px] rounded-xl border border-slate-300 bg-white px-2 py-2 text-center text-slate-900 outline-none"
                                    />

                                    <span className="font-semibold text-slate-500">
                                      :
                                    </span>

                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="H"
                                      value={match.away_score}
                                      onChange={(e) =>
                                        updateMatch(
                                          match.id,
                                          "away_score",
                                          e.target.value,
                                        )
                                      }
                                      className="w-[32px] rounded-xl border border-slate-300 bg-white px-2 py-2 text-center text-slate-900 outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
