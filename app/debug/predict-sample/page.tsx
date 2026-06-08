"use client";

import AppShell from "@/components/AppShell";

export default function DebugPredictSample() {
  const sampleMatches = [
    { id: 'm1', kickoff: '2026-06-11T21:00:00Z', home: 'Mexiko', away: 'JAR' },
    { id: 'm2', kickoff: '2026-06-12T04:00:00Z', home: 'Jižní Korea', away: 'Česko' },
    { id: 'm3', kickoff: '2026-06-12T21:00:00Z', home: 'Kanada', away: 'Bosna a Her.' },
  ];

  function formatMatchTime(dt: string) {
    return new Date(dt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <AppShell leagueId="debug" competitionId="debug" activeTab="predict">
      <div className="space-y-6 p-6">
        <h2 className="text-2xl font-semibold">Debug predict sample</h2>

        <div className="space-y-4">
          {sampleMatches.map((match) => (
            <div key={match.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 outline outline-0" data-debug>
              <div className="grid grid-cols-1 sm:grid-cols-[30px_300px_80px] items-start sm:items-center justify-start gap-x-0 gap-y-1 outline outline-0">
                <div className="w-[30px] text-sm text-slate-500 justify-self-center">{formatMatchTime(match.kickoff)}</div>

                <div className="flex items-center justify-start gap-1 sm:contents">
                  <div className="grid w-[300px] grid-cols-[140px_20px_140px] items-center gap-1">
                    <div className="text-right text-slate-900 font-semibold">{match.home}</div>
                    <div className="text-center text-slate-500">:</div>
                    <div className="text-left text-slate-900 font-semibold">{match.away}</div>
                  </div>

                  <div className="flex w-[80px] items-center justify-start gap-1">
                    <div className="w-8 h-8 rounded-xl border border-slate-300 bg-white flex items-center justify-center">D</div>
                    <div className="w-8 h-8 rounded-xl border border-slate-300 bg-white flex items-center justify-center">H</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
