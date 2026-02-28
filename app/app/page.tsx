"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, supabaseOrThrow } from "@/lib/supabase";
import { getMyRole, AppRole } from "@/lib/rbac";

export default function AppHome() {
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    // Se Supabase não estiver configurado, não quebra build/SSR
    if (!supabase) return;

    // sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? "");
    });

    // mudanças de auth
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setEmail(session?.user?.email ?? "");
      if (session?.user) {
        const r = await getMyRole();
        setRole(r);
      } else {
        setRole(null);
      }
    });

    // carrega papel ao abrir (se já houver sessão)
    (async () => {
      try {
        const r = await getMyRole();
        setRole(r);
      } catch {
        // se não tiver sessão/role, ignore
        setRole(null);
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    // Aqui a gente exige supabase, com erro claro se estiver faltando env
    const sb = supabaseOrThrow();
    await sb.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>ERP-GES</h1>

      {!supabase ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "crimson", fontWeight: 600 }}>
            Supabase não configurado.
          </p>
          <p style={{ marginTop: 6, opacity: 0.9 }}>
            Configure <b>NEXT_PUBLIC_SUPABASE_URL</b> e <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> na Vercel e faça Redeploy.
          </p>
        </div>
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
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
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

              <p style={{ marginTop: 14, opacity: 0.8 }}>
                * Se você for <b>ops</b>, a rota Financeiro vai bloquear.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}