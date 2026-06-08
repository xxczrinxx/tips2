import { supabase } from "@/lib/supabaseClient";

export type League = { id: string; name: string; default_competition_id?: string | null };
export type Competition = { id: string; name: string; sport: string; tip_top3?: boolean };
export type MatchRow = {
  id: string;
  competition_id: string;
  stage: string;
  kickoff_at: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
};
export type Team = { id: string; name: string };
export type PredictionRow = {
  match_id: string;
  user_id: string;
  home_score: number | null;
  away_score: number | null;
};
export type PodiumPredictionRow = {
  competition_id: string;
  user_id: string;
  first_team_id: string | null;
  second_team_id: string | null;
  third_team_id: string | null;
};

export async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("id, display_name, is_admin").eq("id", userId).single();
  if (error) {
    console.error("getProfile error", error);
    return null;
  }
  return data as { id: string; display_name?: string; is_admin?: boolean } | null;
}

export type LeagueResult = {
  leagues: League[];
  error?: string | null;
};

export async function getUserLeagues(userId: string): Promise<LeagueResult> {
  if (!userId) {
    return { leagues: [], error: "Uživatel není přihlášen." };
  }

  const { data: membership, error } = await supabase.from("league_members").select("league_id").eq("user_id", userId);
  if (error) {
    console.error("getUserLeagues membership error", error?.message ?? error, { userId });
    return { leagues: [], error: error?.message || JSON.stringify(error) || "Chyba při načítání členství v lize." };
  }

  const leagueIds = membership?.map((row: any) => row.league_id).filter(Boolean) ?? [];
  if (leagueIds.length === 0) return { leagues: [] };

  const { data: leagues, error: leagueError } = await supabase.from("leagues").select("id, name").in("id", leagueIds);
  if (leagueError) {
    console.error("getUserLeagues league error", leagueError?.message ?? leagueError, { leagueIds });
    return { leagues: [], error: leagueError?.message || JSON.stringify(leagueError) || "Chyba při načítání lig." };
  }

  return { leagues: (leagues as League[]) ?? [], error: null };
}

export async function getLeagueCompetitions(leagueId: string) {
  const { data: links, error } = await supabase.from("league_competitions").select("competition_id").eq("league_id", leagueId);
  if (error) {
    console.error("getLeagueCompetitions error", error);
    return [] as Competition[];
  }
  const competitionIds = links?.map((row: any) => row.competition_id).filter(Boolean) ?? [];
  if (competitionIds.length === 0) return [];

  const { data, error: compError } = await supabase.from("competitions").select("id, name, sport, tip_top3").in("id", competitionIds);
  if (compError) {
    console.error("getLeagueCompetitions comp error", compError);
    return [] as Competition[];
  }
  return data as Competition[];
}

export async function getAllCompetitions() {
  const { data, error } = await supabase.from("competitions").select("id, name, sport, tip_top3");
  if (error) {
    console.error("getAllCompetitions error", error);
    return [] as Competition[];
  }
  return data as Competition[];
}

export async function getLeagueDefaultCompetition(leagueId: string) {
  const { data, error } = await supabase.from("leagues").select("default_competition_id").eq("id", leagueId).maybeSingle();
  if (error) {
    console.error("getLeagueDefaultCompetition error", error);
    return null;
  }
  return data?.default_competition_id ?? null;
}

export async function setLeagueDefaultCompetition(leagueId: string, competitionId: string | null) {
  const { error } = await supabase.from("leagues").update({ default_competition_id: competitionId }).eq("id", leagueId);
  if (error) {
    console.error("setLeagueDefaultCompetition error", error);
    return false;
  }
  return true;
}

export async function assignCompetitionToLeague(leagueId: string, competitionId: string) {
  const { error } = await supabase.from("league_competitions").insert({ league_id: leagueId, competition_id: competitionId });
  if (error) {
    console.error("assignCompetitionToLeague error", error);
    return false;
  }
  return true;
}

export async function removeCompetitionFromLeague(leagueId: string, competitionId: string) {
  const { error } = await supabase
    .from("league_competitions")
    .delete()
    .eq("league_id", leagueId)
    .eq("competition_id", competitionId);
  if (error) {
    console.error("removeCompetitionFromLeague error", error);
    return false;
  }
  return true;
}

export async function getCompetition(competitionId: string) {
  const { data, error } = await supabase.from("competitions").select("id, name, sport, tip_top3").eq("id", competitionId).single();
  if (error) {
    console.error("getCompetition error", error);
    return null;
  }
  return data as Competition;
}

export async function getCompetitionMatches(competitionId: string) {
  // Načíst metadata zápasů (skóre je v tabulce match_results, nikoli v matches!)
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, competition_id, stage, kickoff_at, home_team_id, away_team_id")
    .eq("competition_id", competitionId)
    .order("kickoff_at", { ascending: true });

  if (error) {
    console.error("getCompetitionMatches error", error);
    return [] as MatchRow[];
  }

  if (!matches || matches.length === 0) {
    return [];
  }

  // Načíst výsledky z match_results
  const matchIds = matches.map((m: any) => m.id);
  const { data: scores, error: scoresError } = await supabase
    .from("match_results")
    .select("match_id, home_score, away_score")
    .in("match_id", matchIds);

  if (scoresError) {
    console.error("getCompetitionMatches scores error", scoresError);
    // Vrátit zápasy bez skóre, abychom neupadli
    return matches.map((m: any) => ({
      ...m,
      home_score: null,
      away_score: null,
    })) as MatchRow[];
  }

  // Zmergovat skóre s metadata zápasů
  const scoresMap = Object.fromEntries((scores ?? []).map((s: any) => [s.match_id, s]));
  const result = matches.map((match: any) => ({
    ...match,
    home_score: scoresMap[match.id]?.home_score ?? null,
    away_score: scoresMap[match.id]?.away_score ?? null,
  }));

  return result as MatchRow[];
}

export async function getTeamsByIds(teamIds: string[]) {
  const { data, error } = await supabase.from("teams").select("id, name").in("id", teamIds);
  if (error) {
    console.error("getTeamsByIds error", error);
    return [] as Team[];
  }
  return data as Team[];
}

export async function getUserPredictions(userId: string, competitionId: string) {
  const { data, error } = await supabase
    .from("user_match_predictions")
    .select("match_id, user_id, home_score, away_score")
    .eq("user_id", userId)
    .in("match_id", (await getCompetitionMatches(competitionId)).map((match) => match.id));

  if (error) {
    console.error("getUserPredictions error", error);
    return [] as PredictionRow[];
  }
  return data as PredictionRow[];
}

export async function saveUserPrediction(prediction: PredictionRow) {
  const { error } = await supabase.from("user_match_predictions").upsert(prediction, { onConflict: "match_id,user_id" });
  if (error) {
    console.error("saveUserPrediction error", error);
    return false;
  }
  return true;
}

export async function getPodiumPrediction(userId: string, competitionId: string) {
  const { data, error } = await supabase
    .from("user_competition_podium_predictions")
    .select("competition_id, user_id, first_team_id, second_team_id, third_team_id")
    .eq("competition_id", competitionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getPodiumPrediction error", error);
    return null;
  }
  return data as PodiumPredictionRow | null;
}

export async function savePodiumPrediction(prediction: PodiumPredictionRow) {
  const { error } = await supabase.from("user_competition_podium_predictions").upsert(prediction, { onConflict: "competition_id,user_id" });
  if (error) {
    console.error("savePodiumPrediction error", error);
    return false;
  }
  return true;
}

export async function getLeagueInvite(token: string) {
  const { data, error } = await supabase.from("league_invites").select("league_id, token").eq("token", token).single();
  if (error) {
    console.error("getLeagueInvite error", error);
    return null;
  }
  return data as { league_id: string; token: string } | null;
}

export async function acceptLeagueInvite(userId: string, leagueId: string) {
  const { error } = await supabase.from("league_members").upsert({ user_id: userId, league_id: leagueId }, { onConflict: "user_id,league_id" });
  if (error) {
    console.error("acceptLeagueInvite error", error);
    return false;
  }
  return true;
}

export async function createLeagueInvite(leagueId: string) {
  const token = Math.random().toString(36).slice(2, 12);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("createLeagueInvite auth error", authError);
    return null;
  }
  
  // Reuse existing active invite if present (not accepted and not expired)
  try {
    const { data: existing, error: existingError } = await supabase
      .from("league_invites")
      .select("token, expires_at, accepted_by")
      .eq("league_id", leagueId)
      .is("accepted_by", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingError && existing && existing.token) {
      // If there is an expires_at column, check expiration
      if (!existing.expires_at || new Date(existing.expires_at) > new Date()) {
        return existing.token as string;
      }
    }
  } catch (e) {
    console.error("createLeagueInvite check existing error", e);
  }

  const { data, error } = await supabase
    .from("league_invites")
    .insert({
      league_id: leagueId,
      token,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error) {
    console.error("createLeagueInvite error", error);
    return null;
  }

  return data?.token as string;
}

export async function createCompetition(
  leagueId: string,
  payload: { name: string; sport: string; tip_top3: boolean }
) {
  if (!leagueId?.trim()) {
    console.error("createCompetition invalid leagueId");
    return null;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("createCompetition auth error", authError);
    return null;
  }

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .select("id, default_competition_id")
    .eq("id", leagueId)
    .maybeSingle();

  if (leagueError || !league) {
    console.error("createCompetition league not found", leagueError);
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error("createCompetition user is not a member of the league", membershipError);
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    console.error("createCompetition user is not admin", profileError);
    return null;
  }

  const normalizedSport =
    payload.sport === "fotbal"
      ? "football"
      : payload.sport === "hokej"
        ? "hockey"
        : payload.sport;

  console.log("CREATE COMPETITION INSERT:", {
  name: payload.name.trim(),
  sport: normalizedSport,
  tip_top3: payload.tip_top3,
  created_by: user.id,
  auth_user_id: user.id,
  });

const { data: sessionData } = await supabase.auth.getSession();

console.log(
  "SESSION ACCESS TOKEN EXISTS:",
  Boolean(sessionData.session?.access_token)
);

console.log(
  "SESSION USER ID:",
  sessionData.session?.user?.id
);

  const { data, error } = await supabase
    .from("competitions")
    .insert({
      name: payload.name.trim(),
      sport: normalizedSport,
      tip_top3: payload.tip_top3,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createCompetition error", error);
    return null;
  }

  const competitionId = data.id;

  const { error: linkError } = await supabase
    .from("league_competitions")
    .insert({
      league_id: leagueId,
      competition_id: competitionId,
    });

  if (linkError) {
    console.error("createCompetition link error", linkError);
    return null;
  }

  // If league has no default competition yet, set the newly created one as default
  try {
    const currentDefault = (league as any)?.default_competition_id ?? null;
    if (!currentDefault) {
      await setLeagueDefaultCompetition(leagueId, competitionId);
    }
  } catch (e) {
    console.error("createCompetition set default error", e);
  }

  return competitionId;
}

export async function getLeagueMembers(leagueId: string) {
  const { data, error } = await supabase.from("league_members").select("user_id").eq("league_id", leagueId);
  if (error) {
    console.error("getLeagueMembers error", error);
    return [] as { user_id: string }[];
  }
  return data as { user_id: string }[];
}
