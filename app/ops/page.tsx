"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMyRole, AppRole } from "@/lib/rbac";

export default function OpsHomePage() {
  const companyName = "GRUPO EXECUTIVO SERVICE";
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
      if (!data.session?.user) {
        window.location.href = "/login";
        return;
      }

      setEmail(data.session.user.email ?? "");
      const r = await getMyRole(companyName);
      setRole(r);
      setLoading(false);
    })();
  }, []);

  if (!supabase) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Operação</h1>
        <p style={{ color: "crimson", fontWeight: 600, marginTop: 10 }}>
          Supabase não configurado.
        </p>
        <p style={{ marginTop: 6 }}>
          Configure <b>NEXT_PUBLIC_SUPABASE_URL</b> e{" "}
          <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> na Vercel e faça Redeploy.
        </p>
      </div>
    );
  }

  const allowed = role === "admin" || role === "ops";

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Operação</h1>

      <p style={{ marginTop: 8 }}>
        Usuário: <b>{email || "carregando..."}</b> • Papel:{" "}
        <b>{role || "carregando..."}</b>
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/app" style={{ textDecoration: "none", padding: 10, border: "1px solid #000", borderRadius: 10 }}>
          Voltar
        </Link>
      </div>

      {!allowed ? (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #f00", borderRadius: 10 }}>
          <b>ACESSO NEGADO.</b>
          <p style={{ marginTop: 8 }}>Somente admin/ops pode acessar a operação.</p>
        </div>
      ) : loading ? (
        <p style={{ marginTop: 16 }}>Carregando…</p>
      ) : (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #ccc", borderRadius: 10 }}>
          <p><b>Operação</b> (ops) pode lançar dados operacionais.</p>
          <p style={{ marginTop: 8, opacity: 0.85 }}>
            * Financeiro fica bloqueado para perfil operacional.
          </p>
        </div>
      )}
    </div>
  );
}

