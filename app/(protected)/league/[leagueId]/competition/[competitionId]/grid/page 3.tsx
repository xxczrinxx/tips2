"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import {
  getCompetition,
  getCompetitionMatches,
  getLeagueMembers,
  getTeamsByIds,
} from "@/lib/supabaseHelpers";

type PlayerRow = {
  user_id: string;
  display_name: string;
  points: number;
  exact: number;
};

type MatchRow = {
  id: string;
  stage: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

type CellRow = {
  homeScore: number | null;
  awayScore: number | null;
  points: number;
  exact: number;
  hasPrediction: boolean;
  evaluated: boolean;
};

type PodiumPrediction = {
  first_team_id: string | null;
  second_team_id: string | null;
  third_team_id: string | null;
};

type PodiumCell = {
  teamId: string | null;
  points: number;
  status: "exact" | "top3" | "none";
};

function calculatePoints(
  sport: string,
  predicted: { home: number | null; away: number | null },
  actual: { home: number | null; away: number | null }
) {
  if (
    actual.home === null ||
    actual.away === null ||
    predicted.home === null ||
    predicted.away === null
  ) {
    return { points: 0, exact: 0 };
  }

  const predictedDiff = predicted.home - predicted.away;
  const actualDiff = actual.home - actual.away;

  const exact =
    predicted.home === actual.home &&
    predicted.away === actual.away
      ? 1
      : 0;

  const direction =
    Math.sign(predictedDiff) === Math.sign(actualDiff)
      ? 1
      : 0;

  if (sport === "hockey" || sport === "hokej") {
    const sameDifference = predictedDiff === actualDiff;
    const points = exact
      ? 4
      : direction
      ? sameDifference
        ? 2
        : 1
      : 0;

    return { points, exact };
  }

  const points = exact ? 3 : direction ? 1 : 0;

  return { points, exact };
}

function shortText(value: string, length: number) {
  return value.length > length
    ? `${value.slice(0, length - 1)}…`
    : value;
}

function cellClass(cell?: CellRow) {
  if (!cell?.hasPrediction) {
    return "bg-white text-slate-300";
  }

  if (!cell.evaluated) {
    return "bg-white text-slate-900";
  }

  if (cell.points === 0) {
    return "bg-white text-slate-900";
  }

  if (cell.points === 1) {
    return "bg-emerald-500 text-white";
  }

  if (cell.points === 2) {
    return "bg-amber-300 text-slate-900";
  }

  return "bg-red-500 text-white";
}

function podiumClass(status: PodiumCell["status"]) {
  if (status === "exact") {
    return "bg-blue-900 text-white";
  }

  if (status === "top3") {
    return "bg-blue-100 text-slate-900";
  }

  return "bg-white text-slate-900";
}

function calculatePodiumCells(
  predicted?: PodiumPrediction,
  actual?: PodiumPrediction
): PodiumCell[] {
  const predictedIds = [
    predicted?.first_team_id ?? null,
    predicted?.second_team_id ?? null,
    predicted?.third_team_id ?? null,
  ];

  const actualIds = [
    actual?.first_team_id ?? null,
    actual?.second_team_id ?? null,
    actual?.third_team_id ?? null,
  ];

  return predictedIds.map((teamId, index) => {
    if (!teamId || actualIds.every((actualId) => !actualId)) {
      return { teamId, points: 0, status: "none" };
    }

    if (actualIds[index] === teamId) {
      return { teamId, points: 10, status: "exact" };
    }

    if (actualIds.includes(teamId)) {
      return { teamId, points: 5, status: "top3" };
    }

    return { teamId, points: 0, status: "none" };
  });
}

export default function GridPage() {
  const params = useParams();

  const leagueId = Array.isArray(params?.leagueId)
    ? params.leagueId[0]
    : params?.leagueId ?? "";

  const competitionId = Array.isArray(params?.competitionId)
    ? params.competitionId[0]
    : params?.competitionId ?? "";

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [cells, setCells] = useState<Record<string, Record<string, CellRow>>>({});
  const [podiums, setPodiums] = useState<Record<string, PodiumPrediction>>({});
  const [realPodium, setRealPodium] = useState<PodiumPrediction | null>(null);
  const [teamMap, setTeamMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState("football");

  useEffect(() => {
    async function loadGrid() {
      setLoading(true);

      if (!leagueId || !competitionId) {
        setLoading(false);
        return;
      }

      const competition = await getCompetition(competitionId);

      if (competition?.sport) {
        setSport(competition.sport);
      }

      const rawMatches = await getCompetitionMatches(competitionId);

      const { data: realPodiumData } = await supabase
        .from("competition_results")
        .select("first_team_id, second_team_id, third_team_id")
        .eq("competition_id", competitionId)
        .maybeSingle();

      const realPodiumRow: PodiumPrediction | null = realPodiumData
        ? {
            first_team_id: realPodiumData.first_team_id,
            second_team_id: realPodiumData.second_team_id,
            third_team_id: realPodiumData.third_team_id,
          }
        : null;

      setRealPodium(realPodiumRow);

      const { data: podiumData } = await supabase
        .from("user_competition_podium_predictions")
        .select(
          "user_id, first_team_id, second_team_id, third_team_id"
        )
        .eq("competition_id", competitionId);

      const teamIds = rawMatches.flatMap((match) =>
        [match.home_team_id, match.away_team_id].filter(Boolean) as string[]
      );

      const podiumTeamIds = [
        realPodiumRow?.first_team_id,
        realPodiumRow?.second_team_id,
        realPodiumRow?.third_team_id,
        ...(podiumData ?? []).flatMap((row) => [
          row.first_team_id,
          row.second_team_id,
          row.third_team_id,
        ]),
      ].filter(Boolean) as string[];

      const teams = await getTeamsByIds(
        Array.from(new Set([...teamIds, ...podiumTeamIds]))
      );

      const mappedTeams = Object.fromEntries(
        teams.map((team) => [team.id, team.name])
      );

      setTeamMap(mappedTeams);

      const matchRows: MatchRow[] = rawMatches.map((match) => ({
        id: match.id,
        stage: match.stage || "Další",
        homeTeam: mappedTeams[match.home_team_id ?? ""] ?? "TBD",
        awayTeam: mappedTeams[match.away_team_id ?? ""] ?? "TBD",
        homeScore: match.home_score,
        awayScore: match.away_score,
      }));

      const memberRows = await getLeagueMembers(leagueId);

      const userIds = memberRows
        .map((row) => row.user_id)
        .filter(Boolean);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((profile: any) => [
          profile.id,
          profile.display_name ?? "Hráč",
        ])
      );

      const rows: PlayerRow[] = userIds.map((userId) => ({
        user_id: userId,
        display_name: profileMap[userId] || "Hráč",
        points: 0,
        exact: 0,
      }));

      const matchIds = rawMatches.map((match) => match.id);

      const { data: predictionData } = await supabase
        .from("user_match_predictions")
        .select("match_id, user_id, home_score, away_score")
        .in("match_id", matchIds)
        .in("user_id", userIds);

      const podiumMap: Record<string, PodiumPrediction> = {};

      for (const row of podiumData ?? []) {
        podiumMap[row.user_id] = {
          first_team_id: row.first_team_id,
          second_team_id: row.second_team_id,
          third_team_id: row.third_team_id,
        };
      }

      for (const player of rows) {
        const podiumCells = calculatePodiumCells(
          podiumMap[player.user_id],
          realPodiumRow ?? undefined
        );

        player.points += podiumCells.reduce(
          (sum, cell) => sum + cell.points,
          0
        );
      }

      setPodiums(podiumMap);

      const cellData: Record<string, Record<string, CellRow>> = {};

      for (const row of predictionData ?? []) {
        const match = rawMatches.find(
          (item) => item.id === row.match_id
        );

        if (!match) continue;

        const predicted = {
          home: row.home_score,
          away: row.away_score,
        };

        const actual = {
          home: match.home_score,
          away: match.away_score,
        };

        const evaluated =
          actual.home !== null && actual.away !== null;

        const result = calculatePoints(
          competition?.sport ?? sport,
          predicted,
          actual
        );

        cellData[row.match_id] =
          cellData[row.match_id] || {};

        cellData[row.match_id][row.user_id] = {
          homeScore: row.home_score,
          awayScore: row.away_score,
          points: result.points,
          exact: result.exact,
          hasPrediction:
            row.home_score !== null &&
            row.away_score !== null,
          evaluated,
        };

        const player = rows.find(
          (item) => item.user_id === row.user_id
        );

        if (player && evaluated) {
          player.points += result.points;
          player.exact += result.exact;
        }
      }

      setMatches(matchRows);

      setPlayers(
        rows.sort(
          (a, b) =>
            b.points - a.points ||
            b.exact - a.exact ||
            a.display_name.localeCompare(
              b.display_name
            )
        )
      );

      setCells(cellData);
      setLoading(false);
    }

    loadGrid();
  }, [competitionId, leagueId]);

  const groupedMatches = useMemo(() => {
    return matches.reduce<Record<string, MatchRow[]>>(
      (acc, match) => {
        const stage = match.stage || "Další";

        acc[stage] = acc[stage]
          ? [...acc[stage], match]
          : [match];

        return acc;
      },
      {}
    );
  }, [matches]);

  return (
    <AppShell
      leagueId={leagueId}
      competitionId={competitionId}
      activeTab="grid"
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">
          Kompletní výsledky
        </h2>

        {loading ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            Načítám data...
          </div>
        ) : (
          <div className="mt-6 max-h-[75vh] overflow-auto">
            <table className="table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="sticky top-0 z-10 w-[15ch] bg-white px-1 py-2 text-left" />

                  <th className="sticky top-0 z-10 w-[1ch] bg-white px-0 py-2 text-center" />

                  <th className="sticky top-0 z-10 w-[15ch] bg-white px-1 py-2 text-left" />

                  <th className="sticky top-0 z-10 w-[5ch] bg-white px-1 py-2 text-center" />

                  {players.map((player) => (
                    <th
                      key={player.user_id}
                      className="sticky top-0 z-10 w-[7ch] bg-white px-1 py-2 text-center align-bottom"
                    >
                      <div className="w-[7ch] truncate text-center font-semibold text-slate-900">
                        {shortText(
                          player.display_name,
                          10
                        )}
                      </div>

                      <div className="w-[7ch] text-center font-semibold text-slate-900">
                        <span className="text-xl">
                          {player.points}
                        </span>{" "}
                        <span className="text-xs text-slate-500">
                          ({player.exact})
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan={3}
                    className="border-b border-slate-200 px-1 py-3 text-sm font-semibold text-slate-700"
                  >
                    TOP 3
                  </td>

                  <td className="border-b border-slate-200 px-1 py-3 align-top">
                    <div className="space-y-1 text-xs font-semibold text-slate-900">
                      <div>
                        1. {teamMap[realPodium?.first_team_id ?? ""] ?? "—"}
                      </div>

                      <div>
                        2. {teamMap[realPodium?.second_team_id ?? ""] ?? "—"}
                      </div>

                      <div>
                        3. {teamMap[realPodium?.third_team_id ?? ""] ?? "—"}
                      </div>
                    </div>
                  </td>

                  {players.map((player) => {
                    const podium = podiums[player.user_id];
                    const podiumCells = calculatePodiumCells(
                      podium,
                      realPodium ?? undefined
                    );

                    return (
                      <td
                        key={player.user_id}
                        className="border-b border-slate-200 px-1 py-2 align-top"
                      >
                        <div className="space-y-1 text-xs">
                          {podiumCells.map((cell, index) => (
                            <div
                              key={`${player.user_id}-${index}`}
                              className={`rounded px-2 py-1 font-semibold ${podiumClass(
                                cell.status
                              )}`}
                            >
                              {index + 1}. {teamMap[cell.teamId ?? ""] ?? "—"}
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {Object.entries(groupedMatches).map(
                  ([stage, stageMatches]) => (
                    <Fragment key={stage}>
                      <tr
                        className="border-b border-t border-slate-200 bg-slate-50"
                      >
                        <td
                          colSpan={4 + players.length}
                          className="px-1 py-2 text-sm font-semibold text-slate-700"
                        >
                          {stage}
                        </td>
                      </tr>

                      {stageMatches.map((match) => (
                        <tr
                          key={match.id}
                          className="border-b border-slate-100"
                        >
                          <td className="w-[15ch] px-1 py-1 font-semibold text-slate-900">
                            <div className="w-[15ch] whitespace-nowrap">
                              {match.homeTeam}
                            </div>
                          </td>

                          <td className="w-[1ch] px-0 py-1 text-center font-semibold text-slate-500">
                            :
                          </td>

                          <td className="w-[15ch] px-1 py-1 font-semibold text-slate-900">
                            <div className="w-[15ch] whitespace-nowrap">
                              {match.awayTeam}
                            </div>
                          </td>

                          <td className="w-[5ch] px-1 py-1 text-center font-semibold text-slate-700">
                            <span className="inline-grid grid-cols-[2ch_1ch_2ch]">
                              <span>
                                {match.homeScore === null
                                  ? "—"
                                  : match.homeScore}
                              </span>

                              <span>:</span>

                              <span>
                                {match.awayScore === null
                                  ? "—"
                                  : match.awayScore}
                              </span>
                            </span>
                          </td>

                          {players.map((player) => {
                            const cell =
                              cells[match.id]?.[
                                player.user_id
                              ];

                            return (
                              <td
                                key={player.user_id}
                                className="w-[7ch] px-1 py-1"
                              >
                                <div
                                  className={`w-[7ch] rounded px-1 py-1 text-center text-xs font-semibold ${cellClass(
                                    cell
                                  )}`}
                                >
                                  {cell?.hasPrediction
                                    ? `${cell.homeScore}:${cell.awayScore}`
                                    : "—"}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}