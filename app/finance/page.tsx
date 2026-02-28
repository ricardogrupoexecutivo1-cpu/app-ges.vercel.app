"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMyRole, AppRole } from "@/lib/rbac";

export default function FinanceHomePage() {
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
      const r = await getMyRole("GRUPO EXECUTIVO SERVICE");
      setRole(r);
      setLoading(false);
    })();
  }, []);

  if (!supabase) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Financeiro</h1>
        <p style={{ color: "crimson", fontWeight: 600, marginTop: 10 }}>Supabase não configurado.</p>
        <p style={{ marginTop: 6 }}>
          Configure <b>NEXT_PUBLIC_SUPABASE_URL</b> e <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> na Vercel e faça Redeploy.
        </p>
      </div>
    );
  }

  const allowed = role === "admin" || role === "finance";

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Financeiro</h1>

      <p style={{ marginTop: 8 }}>
        Usuário: <b>{email || "carregando..."}</b> • Papel: <b>{role || "carregando..."}</b>
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/app" style={{ textDecoration: "none", padding: 10, border: "1px solid #000", borderRadius: 10 }}>
          Voltar
        </Link>

        <Link
          href="/finance/ar-by-client"
          style={{ textDecoration: "none", padding: 10, border: "1px solid #000", borderRadius: 10 }}
        >
          A Receber por Cliente
        </Link>

        <Link
          href="/finance/debit-notes"
          style={{ textDecoration: "none", padding: 10, border: "1px solid #000", borderRadius: 10 }}
        >
          Notas de Débito
        </Link>
      </div>

      {!allowed ? (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #f00", borderRadius: 10 }}>
          <b>ACESSO NEGADO.</b>
          <p style={{ marginTop: 8 }}>Somente admin/finance pode acessar o financeiro.</p>
        </div>
      ) : loading ? (
        <p style={{ marginTop: 16 }}>Carregando…</p>
      ) : (
        <p style={{ marginTop: 16 }}>Selecione um módulo acima.</p>
      )}
    </div>
  );
}

