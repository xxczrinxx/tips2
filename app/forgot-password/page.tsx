"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendReset() {
    setLoading(true);
    setStatus(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setStatus(`Chyba: ${error.message}`);
    } else {
      setStatus("Resetovací odkaz byl odeslán. Zkontrolujte svůj e-mail.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Zapomenuté heslo</h1>
        <p className="mt-2 text-sm text-slate-600">Zadejte e-mail, na který vám přijde odkaz pro reset hesla.</p>

        <label className="mt-6 block">
          <span className="text-sm font-medium text-slate-700">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
          />
        </label>

        {status && <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">{status}</div>}

        <button
          onClick={sendReset}
          disabled={loading || !email}
          className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {loading ? "Odesílám…" : "Odeslat obnovovací odkaz"}
        </button>
      </div>
    </div>
  );
}
