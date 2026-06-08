"use client";

import { ChangeEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createCompetition } from "@/lib/supabaseHelpers";
import { supabase } from "@/lib/supabaseClient";

type MatchImportRow = {
  kickoff_at: string;
  stage: string;
  home_team_name: string;
  away_team_name: string;
};

export default function NewCompetitionPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = Array.isArray(params?.leagueId) ? params?.leagueId[0] ?? "" : params?.leagueId ?? "";
  const [name, setName] = useState("");
  const [sport, setSport] = useState("football");
  const [top3, setTop3] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setFileName(selected?.name ?? "");
  }

  function parseCsv(text: string) {
    const lines = text.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return lines.map((line) => {
      const columns = line.split(",").map((value) => value.trim());
      const [day, month, year, hour, minute, stage, homeTeam, awayTeam] = columns;
      const kickoff_at = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00+02:00`;
      return {
        kickoff_at,
        stage: stage || "",
        home_team_name: homeTeam || "",
        away_team_name: awayTeam || "",
      };
    });
  }

  async function handleSubmit() {
    if (!leagueId || !name) {
      setStatus("Vyplňte prosím název soutěže a ligu.");
      return;
    }

    setLoading(true);
    setStatus(null);

    const competitionId = await createCompetition(leagueId, { name, sport, tip_top3: top3 });
    if (!competitionId) {
      setStatus("Nepodařilo se vytvořit soutěž.");
      setLoading(false);
      return;
    }

    if (file && file.name.toLowerCase().endsWith(".csv")) {
      const text = await file.text();
      const rows = parseCsv(text);
      const teamNames = Array.from(new Set(rows.flatMap((row) => [row.home_team_name, row.away_team_name].filter(Boolean))));
      const { data: existingTeams } = await supabase.from("teams").select("id, name").in("name", teamNames);
      const existingMap = Object.fromEntries((existingTeams ?? []).map((team: any) => [team.name, team.id]));
      const missingNames = teamNames.filter((name) => !existingMap[name]);

      if (missingNames.length > 0) {
        const { error: insertTeamsError } = await supabase
  .from("teams")
  .upsert(
    missingNames.map((name) => ({ name })),
    { onConflict: "name", ignoreDuplicates: true }
  );

if (insertTeamsError) {
  console.error("insertTeamsError", insertTeamsError);
}
      }

      const { data: allTeams } = await supabase.from("teams").select("id, name").in("name", teamNames);
      const allMap = Object.fromEntries((allTeams ?? []).map((team: any) => [team.name, team.id]));
      const teamIds = Array.from(new Set(Object.values(allMap)));
      console.log("IMPORT rows:", rows);
      console.log("IMPORT teamNames:", teamNames);
      console.log("IMPORT allTeams:", allTeams);
      console.log("IMPORT allMap:", allMap);
      console.log("IMPORT teamIds:", teamIds);
      if (teamIds.length > 0) {
        const { error: competitionTeamsError } = await supabase
  .from("competition_teams")
  .insert(
    teamIds.map((team_id) => ({
      competition_id: competitionId,
      team_id,
    }))
  );

if (competitionTeamsError) {
  console.error("competitionTeamsError", competitionTeamsError);
}
      }

      const matchesToInsert = rows.map((row) => ({
        competition_id: competitionId,
        stage: row.stage,
        kickoff_at: row.kickoff_at,
        home_team_id: allMap[row.home_team_name] ?? null,
        away_team_id: allMap[row.away_team_name] ?? null,
      }));
      console.log("IMPORT matchesToInsert:", matchesToInsert);
      const { error: matchesError } = await supabase
  .from("matches")
  .insert(matchesToInsert);

if (matchesError) {
  console.error("matchesError message", matchesError.message);
  console.error("matchesError details", matchesError.details);
  console.error("matchesError hint", matchesError.hint);
  console.error("matchesError code", matchesError.code);
  return;
}
    }

    router.push(`/league/${leagueId}/competition/${competitionId}`);
  }

  return (
    <AppShell leagueId={leagueId} activeTab="dashboard">
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Vytvořit soutěž / turnaj</h2>
          <p className="mt-2 text-sm text-slate-600">Admin může vytvořit novou soutěž pro danou ligu.</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Název soutěže</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Sport</span>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="football">Fotbal</option>
                <option value="hockey">Hokej</option>
              </select>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={top3}
                onChange={(e) => setTop3(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-slate-900"
              />
              <span className="text-sm text-slate-700">Tipovat TOP 3</span>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Nahrát Excel / CSV s rozpisem zápasů</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none"
              />
              {fileName && <p className="mt-2 text-sm text-slate-500">Vybraný soubor: {fileName}</p>}
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {loading ? "Vytvářím…" : "Vytvořit"}
          </button>

          {status && <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{status}</div>}
        </section>
      </div>
    </AppShell>
  );
}
