"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleResetPassword() {
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Hesla se neshodují.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Heslo bylo změněno.");

    setTimeout(() => {
      router.push("/");
    }, 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">
          Nové heslo
        </h1>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nové heslo
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Potvrzení hesla
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-2xl bg-green-100 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}

        <button
          onClick={handleResetPassword}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Ukládám..." : "Změnit heslo"}
        </button>
      </div>
    </main>
  );
}