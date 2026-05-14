"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ProtectedPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data?.session) {
        router.replace("/");
        return;
      }
      setLoading(false);
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-slate-900 shadow-lg">
          Načítám přihlášení...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
