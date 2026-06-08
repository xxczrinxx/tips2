"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import {
  Competition,
  getCompetition,
  getCompetitionMatches,
  getLeagueMembers,
} from "@/lib/supabaseHelpers";

type LeaderboardRow = {
  userId: string;
  display_name: string;
  points: number;
  exact: number;
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
    predicted.home === actual.home && predicted.away === actual.away ? 1 : 0;

  const direction =
    Math.sign(predictedDiff) === Math.sign(actualDiff) ? 1 : 0;

  if (sport === "hockey") {
    const sameDifference = predictedDiff === actualDiff;
    const points = exact ? 4 : direction ? (sameDifference ? 2 : 1) : 0;

    return { points, exact };
  }

  const points = exact ? 3 : direction ? 1 : 0;

  return { points, exact };
}

export default function CompetitionPage() {
  const params = useParams();

  const leagueId =
    typeof params.leagueId === "string"
      ? params.leagueId
      : params.leagueId?.[0] ?? "";

  const competitionId =
    typeof params.competitionId === "string"
      ? params.competitionId
      : params.competitionId?.[0] ?? "";

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);

      if (!leagueId || !competitionId) {
        setError("Neplatná liga nebo soutěž.");
        setLoading(false);
        return;
      }

      const foundCompetition = await getCompetition(competitionId);

      if (!foundCompetition) {
        setError("Soutěž nebyla nalezena.");
        setLoading(false);
        return;
      }

      setCompetition(foundCompetition);

      const matches = await getCompetitionMatches(competitionId);
      const matchIds = matches.map((match) => match.id);

      const memberRows = await getLeagueMembers(leagueId);
      const userIds = memberRows.map((row) => row.user_id).filter(Boolean);

      if (userIds.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((profile: any) => [
          profile.id,
          profile.display_name || "Hráč",
        ])
      );

      const { data: predictions } = await supabase
        .from("user_match_predictions")
        .select("match_id, user_id, home_score, away_score")
        .in("user_id", userIds)
        .in("match_id", matchIds);

      const totals: Record<string, { points: number; exact: number }> = {};

      for (const prediction of predictions ?? []) {
        const match = matches.find((item) => item.id === prediction.match_id);

        if (!match) continue;

        const result = calculatePoints(
          foundCompetition.sport,
          {
            home: prediction.home_score,
            away: prediction.away_score,
          },
          {
            home: match.home_score,
            away: match.away_score,
          }
        );

        totals[prediction.user_id] = {
          points: (totals[prediction.user_id]?.points ?? 0) + result.points,
          exact: (totals[prediction.user_id]?.exact ?? 0) + result.exact,
        };
      }


      const { data: realTop3 } = await supabase
  .from("competition_results")
  .select("first_team_id, second_team_id, third_team_id")
  .eq("competition_id", competitionId)
  .maybeSingle();

const { data: podiumPredictions } = await supabase
  .from("user_competition_podium_predictions")
  .select("user_id, first_team_id, second_team_id, third_team_id")
  .eq("competition_id", competitionId)
  .in("user_id", userIds);

if (realTop3) {
  const realOrder = [
    realTop3.first_team_id,
    realTop3.second_team_id,
    realTop3.third_team_id,
  ];

  for (const podium of podiumPredictions ?? []) {
    const predictedOrder = [
      podium.first_team_id,
      podium.second_team_id,
      podium.third_team_id,
    ];

    let podiumPoints = 0;

    predictedOrder.forEach((teamId, index) => {
      if (!teamId) return;

      if (teamId === realOrder[index]) {
        podiumPoints += 10;
      } else if (realOrder.includes(teamId)) {
        podiumPoints += 5;
      }
    });

    totals[podium.user_id] = {
      points: (totals[podium.user_id]?.points ?? 0) + podiumPoints,
      exact: totals[podium.user_id]?.exact ?? 0,
    };
  }
}
      const rows = userIds.map((userId) => ({
        userId,
        display_name: profileMap[userId] ?? "Hráč",
        points: totals[userId]?.points ?? 0,
        exact: totals[userId]?.exact ?? 0,
      }));

      rows.sort(
        (a, b) =>
          b.points - a.points ||
          b.exact - a.exact ||
          a.display_name.localeCompare(b.display_name)
      );

      setLeaderboard(rows);
      setLoading(false);
    }

    loadDashboard();
  }, [leagueId, competitionId]);

  return (
    <AppShell
      leagueId={leagueId}
      competitionId={competitionId}
      activeTab="dashboard"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Pořadí
          </h2>

          {/* subtitle removed per design: keep only main heading */}

          {loading ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              Pořadí se načte zde
            </div>
          ) : error ? (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
              {error}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              Pořadí se načte zde
            </div>
          ) : (
            <div className="mt-6">
              <ul className="space-y-2">
                {leaderboard.map((row, index) => (
                  <li
                    key={row.userId}
                    className="rounded-lg border border-slate-100 bg-white px-4 py-3"
                  >
                    <div className="grid grid-cols-[auto_minmax(100px,130px)_auto_auto_1fr] items-center gap-x-1 gap-y-0 w-full">
                      <div className="text-slate-900 font-semibold pr-2">{index + 1}.</div>

                      <div className="text-slate-700 font-medium truncate">{row.display_name}</div>

                      <div className="text-right w-[4ch]"><div className="font-bold text-slate-900">{row.points}</div></div>

                      <div className="text-right w-[4ch] -ml-1"><div className="text-xs font-bold text-slate-900">({row.exact})</div></div>

                      <div />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Dnešní zápasy
          </h2>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            Dnešní zápasy k tipování se zobrazí zde
          </div>
        </section>
      </div>
    </AppShell>
  );
}