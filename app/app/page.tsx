"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AppRole = "admin" | "finance" | "ops";

const VERSION = "GES-APP-STABLE-2026-03-01-02";

export default function AppHome() {
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrMsg("");

    try {
      const supaMod = await import("@/lib/supabase");
      const rbacMod = await import("@/lib/rbac");

      const supabase = supaMod.supabase;

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const user = data.session?.user;

      if (!user) {
        setEmail("");
        setRole(null);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? "");

      try {
        const r = await rbacMod.getMyRole();
        setRole(r as AppRole);
      } catch (e) {
        console.error("Erro ao buscar role:", e);
        setRole(null);
        setErrMsg("Não consegui carregar seu papel.");
      }

      setLoading(false);
    } catch (e) {
      console.error("Erro ao carregar app:", e);
      setEmail("");
      setRole(null);
      setErrMsg("Erro ao carregar sessão.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    load();

    (async () => {
      try {
        const supaMod = await import("@/lib/supabase");
        const rbacMod = await import("@/lib/rbac");
        const supabase = supaMod.supabase;

        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
          const user = session?.user;
          setEmail(user?.email ?? "");

          if (user) {
            try {
              const r = await rbacMod.getMyRole();
              setRole(r as AppRole);
            } catch {
              setRole(null);
            }
          } else {
            setRole(null);
          }
        });

        unsub = () => sub.subscription.unsubscribe();
      } catch {}
    })();

    return () => {
      try {
        unsub?.();
      } catch {}
    };
  }, [load]);

  async function signOut() {
    try {
      const supaMod = await import("@/lib/supabase");
      await supaMod.supabase.auth.signOut();
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
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Versão: <b>{VERSION}</b>
      </p>

      {loading ? (
        <p style={{ marginTop: 10 }}>Carregando…</p>
      ) : (
        <>
          {errMsg && (
            <div style={{ marginTop: 12, padding: 10, border: "1px solid #000", borderRadius: 10 }}>
              <p style={{ margin: 0 }}>{errMsg}</p>
              <button
                onClick={load}
                style={{
                  marginTop: 10,
                  padding: 10,
                  border: "1px solid #000",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Recarregar
              </button>
            </div>
          )}

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
          )}
        </>
      )}
    </div>
  );
}