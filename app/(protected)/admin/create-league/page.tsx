"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/supabaseHelpers";

export default function CreateLeaguePage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function createLeague() {
    if (!name.trim()) {
      setError("Zadejte prosím název ligy.");
      return;
    }

    setLoading(true);
    setError(null);

    const userId = await getCurrentUserId();
    if (!userId) {
      setError("Musíte být přihlášeni.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("leagues")
      .insert({ name: name.trim(), created_by: userId })
      .select("id")
      .single();

    if (error) {
      setError("Nepodařilo se vytvořit ligu: " + error.message);
      setLoading(false);
      return;
    }

    // Automaticky přidat tvůrce do ligy
    const { error: memberError } = await supabase
      .from("league_members")
      .insert({ league_id: data.id, user_id: userId });

    if (memberError) {
      console.error("Error adding creator to league:", memberError);
      // Pokračujeme i když se nepodaří přidat člena
    }

    router.push(`/league/${data.id}`);
  }

  return (
    <AppShell leagueId={undefined} activeTab="dashboard">
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Vytvořit novou ligu</h2>
          <p className="mt-2 text-sm text-slate-600">Zadejte název pro novou ligu.</p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Název ligy</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="např. TIPS Liga 2024"
              />
            </label>

            {error && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={createLeague}
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {loading ? "Vytvářím…" : "Vytvořit ligu"}
              </button>

              <button
                onClick={() => router.back()}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-slate-700 transition hover:bg-slate-100"
              >
                Zpět
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}