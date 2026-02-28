"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMyRole, type AppRole } from "@/lib/rbac";

export default function AppHome() {
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        setEmail("");
        setRole(null);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? "");
      const r = await getMyRole("GRUPO EXECUTIVO SERVICE");
      setRole(r);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user;
        setEmail(user?.email ?? "");
        if (user) {
          const r = await getMyRole("GRUPO EXECUTIVO SERVICE");
          setRole(r);
        } else {
          setRole(null);
        }
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {}

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}

    window.location.replace("/login");
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>ERP-GES</h1>

      {loading ? (
        <p style={{ marginTop: 10 }}>Carregando…</p>
      ) : (
        <>
          <p style={{ marginTop: 10 }}>
            Usuário: <b>{email || "não logado"}</b>
          </p>
          <p style={{ marginTop: 6 }}>
            Papel: <b>{role || "sem papel"}</b>
          </p>

          {!email ? (
            <p style={{ marginTop: 10 }}>
              Abra <b>/login</b> para entrar.
            </p>
          ) : (
            <>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <Link
                  href="/ops"
                  style={{
                    padding: 10,
                    border: "1px solid #000",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                >
                  Operação
                </Link>

                <Link
                  href="/finance"
                  style={{
                    padding: 10,
                    border: "1px solid #000",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                >
                  Financeiro
                </Link>

                <button
                  onClick={signOut}
                  style={{
                    padding: 10,
                    border: "1px solid #000",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  Sair
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}